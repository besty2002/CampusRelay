import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Send, Loader2, Package, ChevronDown, Image as ImageIcon, Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
import type { ChatMessage, ChatRoom, PostStatus } from '../types';
import { MessageSkeleton } from '../components/skeletons/MessageSkeleton';
import imageCompression from 'browser-image-compression';
import { AppointmentModal } from '../components/AppointmentModal';
import { ReviewModal } from '../components/ReviewModal';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/feedback/ToastProvider';
import { ChatRoomHeader } from '../components/chat/ChatRoomHeader';
import { AppointmentMessageCard } from '../components/chat/AppointmentMessageCard';

type PresencePayload = {
  user_id: string;
  is_typing?: boolean;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

// Helpers
const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

const formatDateLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
};

const isSameDay = (a: string, b: string) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
};

// Typing indicator
const TypingIndicator = () => (
  <div className="flex justify-start mb-3">
    <div className="flex items-end gap-2">
      <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
        ...
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-5 py-3 shadow-sm">
        <div className="flex gap-1.5 items-center h-5">
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  </div>
);

// Main component
export const ChatRoomPage = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageTimeRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [appointmentDraft, setAppointmentDraft] = useState<{ date: string; location: string } | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTargetUserId, setReviewTargetUserId] = useState('');
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Fetch room details and initial messages
  const fetchRoomAndMessages = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);

    const { data: roomData } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        posts (
          title,
          post_images (storage_path)
        ),
        seller:profiles!chat_rooms_seller_id_fkey (id, display_name),
        buyer:profiles!chat_rooms_buyer_id_fkey (id, display_name)
      `)
      .eq('id', roomId)
      .single();

    if (roomData) setRoom(roomData as ChatRoom);

    const { data: messagesData } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles:profiles!chat_messages_sender_id_fkey (display_name)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (messagesData && messagesData.length > 0) {
      setMessages(messagesData as ChatMessage[]);
      lastMessageTimeRef.current = messagesData[messagesData.length - 1].created_at;
    }
    setLoading(false);
  }, [roomId]);

  // Fetch only new messages when polling is active
  const fetchNewMessages = useCallback(async () => {
    if (!roomId) return;
    
    const query = supabase
      .from('chat_messages')
      .select(`
        *,
        profiles:profiles!chat_messages_sender_id_fkey (display_name)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    // If we already have messages, only ask for rows newer than the latest one.
    if (lastMessageTimeRef.current) {
      query.gt('created_at', lastMessageTimeRef.current);
    }

    const { data } = await query;
    
    if (data && data.length > 0) {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = (data as ChatMessage[]).filter(m => !existingIds.has(m.id));
        if (newMsgs.length === 0) return prev;
        return [...prev, ...newMsgs];
      });
      lastMessageTimeRef.current = data[data.length - 1].created_at;
    }
  }, [roomId]);

  // Polling fallback controls
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    console.log('[Chat] Starting fallback polling (3s interval)');
    pollingRef.current = setInterval(() => {
      fetchNewMessages();
    }, 3000);
  }, [fetchNewMessages]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      console.log('[Chat] Stopping polling');
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Mark messages as read defensively
  const markMessagesAsRead = useCallback(async () => {
    if (!user || !roomId || !room) return;

    try {
      // Mark all unread messages from other user as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', roomId)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      // Reset unread count for current user
      const isSeller = user.id === room.seller_id;
      await supabase
        .from('chat_rooms')
        .update(isSeller ? { unread_count_seller: 0 } : { unread_count_buyer: 0 })
        .eq('id', roomId);
    } catch (err) {
      // Some environments may not have the is_read column yet.
      console.warn('[Chat] markMessagesAsRead failed (is_read column may not exist):', err);
    }
  }, [user, roomId, room]);

  // Realtime subscription with polling fallback
  useEffect(() => {
    if (!user || !roomId) return;

    fetchRoomAndMessages();

    // Start with polling enabled, then disable it once realtime is healthy.
    startPolling();

    // 1) Messages subscription with status logging
    const messageChannel = supabase
      .channel(`room-messages:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      }, async (payload) => {
        console.log('[Realtime] INSERT received:', payload.new.id);

        // Optimistically append the incoming payload so the UI feels instant.
        const newMsg = payload.new as ChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          // The realtime payload does not include joined profile data yet.
          const msgWithProfile = {
            ...newMsg,
            is_read: newMsg.is_read ?? false,
            profiles: { display_name: '' }, // Filled in by the follow-up fetch below.
          };
          lastMessageTimeRef.current = newMsg.created_at;
          return [...prev, msgWithProfile];
        });

        // Then hydrate the message with the joined profile record.
        const { data } = await supabase
          .from('chat_messages')
          .select(`
            *,
            profiles:profiles!chat_messages_sender_id_fkey (display_name)
          `)
          .eq('id', newMsg.id)
          .single();

        if (data) {
          setMessages(prev =>
            prev.map(m => m.id === data.id ? (data as ChatMessage) : m)
          );

          // If the message came from the other user, try to mark it as read.
          if (data.sender_id !== user.id) {
            supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', data.id)
              .then(({ error }) => {
                if (error) console.warn('[Chat] is_read update skipped:', error.message);
              });
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setMessages(prev =>
          prev.map(m => m.id === payload.new.id 
            ? { ...m, is_read: (payload.new as Partial<ChatMessage>).is_read ?? m.is_read } 
            : m
          )
        );
      })
      .subscribe((status, err) => {
        console.log(`[Realtime] Message channel status: ${status}`, err || '');
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to messages');
          setRealtimeConnected(true);
          // Realtime is healthy, so polling can stop for now.
          stopPolling();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] Subscription failed, keeping polling active');
          setRealtimeConnected(false);
          startPolling();
        } else if (status === 'CLOSED') {
          setRealtimeConnected(false);
          startPolling();
        }
      });

    // Presence channel for typing state
    const presenceChannel = supabase.channel(`presence:${roomId}`);
    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const others = Object.values(state)
          .flat()
          .map((p) => p as unknown as PresencePayload)
          .filter((p) => p.user_id !== user.id && p.is_typing);
        setIsPartnerTyping(others.length > 0);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: user.id, is_typing: false });
        }
      });

    // Cleanup subscriptions when the room changes
    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
      stopPolling();
    };
  }, [user, roomId, fetchRoomAndMessages, startPolling, stopPolling, fetchNewMessages]);

  // Mark visible messages as read after the initial load
  useEffect(() => {
    if (!loading && room && messages.length > 0) {
      markMessagesAsRead();
    }
  }, [loading, room, messages.length, markMessagesAsRead]);

  // Auto scroll when messages or typing state change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Track whether we should show the jump-to-bottom button
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    setShowScrollDown(!isNearBottom);
  };

  useEffect(() => {
    if (!showHeaderMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setShowHeaderMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHeaderMenu]);

  // Broadcast local typing state
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({ user_id: user?.id, is_typing: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        presenceChannelRef.current?.track({ user_id: user?.id, is_typing: false });
      }, 2000);
    }
  };

  const closeAppointmentModal = () => {
    setIsAppointmentModalOpen(false);
    setEditingAppointmentId(null);
    setAppointmentDraft(null);
  };

  const openNewAppointmentModal = () => {
    setEditingAppointmentId(null);
    setAppointmentDraft(null);
    setIsAppointmentModalOpen(true);
  };

  const openEditAppointmentModal = (messageId: string, data: { date: string; location: string }) => {
    setEditingAppointmentId(messageId);
    setAppointmentDraft(data);
    setIsAppointmentModalOpen(true);
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file || !user || !roomId) return;
    
    setUploadingImage(true);
    try {
      // Compress large image files before upload.
      if (file.type.startsWith('image/')) {
        try {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
          };
          file = await imageCompression(file, options);
        } catch (compError) {
          console.error('Image compression failed:', compError);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${roomId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath);

      // Optimistically render the image message in the thread.
      const optimisticId = `optimistic-img-${Date.now()}`;
      const optimisticMsg: ChatMessage = {
        id: optimisticId,
        room_id: roomId,
        sender_id: user.id,
        text: '',
        image_url: publicUrlData.publicUrl,
        is_read: false,
        created_at: new Date().toISOString(),
        profiles: { display_name: '' }
      };
      setMessages(prev => [...prev, optimisticMsg]);

      // Save the uploaded image message to the database.
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          text: '',
          image_url: publicUrlData.publicUrl
        })
        .select('*, profiles:profiles!chat_messages_sender_id_fkey (display_name)')
        .single();

      if (error) throw error;
      
      if (data) {
        lastMessageTimeRef.current = data.created_at;
        setMessages(prev =>
          prev.map(m => m.id === optimisticId ? (data as ChatMessage) : m)
            .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
        );
      }
    } catch (err: unknown) {
      showToast({
        title: '画像のアップロードに失敗しました',
        description: getErrorMessage(err, '画像をもう一度選び直してください。'),
        tone: 'error',
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Seller post status change
  const handleStatusChange = async (newStatus: PostStatus) => {
    if (!room || !roomId) return;
    setShowStatusMenu(false);
    
    // Optimistically update the item status.
    setRoom(prev => prev ? { ...prev, posts: { ...prev.posts, status: newStatus } } : null);
    
    const { error } = await supabase
      .from('posts')
      .update({ status: newStatus })
      .eq('id', room.post_id);
      
    if (error) {
      showToast({
        title: '状態の更新に失敗しました',
        description: error.message,
        tone: 'error',
      });
      setRoom(prev => prev ? { ...prev, posts: { ...prev.posts, status: room.posts.status } } : null);
    } else {
      // Open the review modal once the handoff is completed.
      if (newStatus === 'Given') {
        setReviewTargetUserId(isSeller ? room.buyer_id : room.seller_id);
        setShowReviewModal(true);
      }
    }
  };

  // Send message with optimistic UI
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !roomId) return;

    const messageText = newMessage;
    setNewMessage('');

    // Stop typing indicator
    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({ user_id: user.id, is_typing: false });
    }

    // Optimistically append the outgoing message before the insert finishes.
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      room_id: roomId,
      sender_id: user.id,
      text: messageText,
      is_read: false,
      created_at: new Date().toISOString(),
      profiles: { display_name: '' }
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        text: messageText
      })
      .select(`
        *,
        profiles:profiles!chat_messages_sender_id_fkey (display_name)
      `)
      .single();

    if (error) {
      // Roll back the optimistic bubble and restore the draft.
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setNewMessage(messageText);
      showToast({
        title: 'メッセージを送信できませんでした',
        description: error.message,
        tone: 'error',
      });
    } else if (data) {
      // Replace the optimistic message with the saved record.
      lastMessageTimeRef.current = data.created_at;
      setMessages(prev =>
        prev.map(m => m.id === optimisticId ? (data as ChatMessage) : m)
          // Guard against duplicate inserts when realtime also delivers the message.
          .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
      );
    }
  };

  const handleCreateAppointment = async (data: { date: string; location: string }) => {
    if (!user || !roomId) return;

    const msgText = '取引の約束を提案しました。';

    if (editingAppointmentId) {
      const originalMessage = messages.find(m => m.id === editingAppointmentId);
      if (!originalMessage?.appointment_data) return;

      const originalAppointment = originalMessage.appointment_data;
      setMessages(prev =>
        prev.map(m =>
          m.id === editingAppointmentId
            ? {
                ...m,
                text: msgText,
                appointment_data: {
                  ...m.appointment_data!,
                  date: data.date,
                  location: data.location,
                  status: 'proposed',
                },
              }
            : m
        )
      );

      try {
        const { error } = await supabase
          .from('chat_messages')
          .update({
            text: msgText,
            appointment_data: {
              ...originalAppointment,
              date: data.date,
              location: data.location,
              status: 'proposed',
            },
          })
          .eq('id', editingAppointmentId);

        if (error) throw error;
      } catch (error: unknown) {
        console.error('Error editing appointment:', error);
        showToast({
          title: '予定の更新に失敗しました',
          description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
          tone: 'error',
        });
        setMessages(prev =>
          prev.map(m =>
            m.id === editingAppointmentId
              ? {
                  ...m,
                  text: originalMessage.text,
                  appointment_data: originalAppointment,
                }
              : m
          )
        );
      } finally {
        setEditingAppointmentId(null);
        setAppointmentDraft(null);
      }

      return;
    }
    
    // Optimistically add the appointment message.
    const optimisticId = `optimistic-appt-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      room_id: roomId,
      sender_id: user.id,
      text: msgText,
      appointment_data: {
        date: data.date,
        location: data.location,
        status: 'proposed'
      },
      is_read: false,
      created_at: new Date().toISOString(),
      profiles: { display_name: '' }
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { data: returnData, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          text: msgText,
          appointment_data: {
            date: data.date,
            location: data.location,
            status: 'proposed'
          }
        })
        .select('*, profiles:profiles!chat_messages_sender_id_fkey (display_name)')
        .single();

      if (error) throw error;
      
      if (returnData) {
        lastMessageTimeRef.current = returnData.created_at;
        setMessages(prev =>
          prev.map(m => m.id === optimisticId ? (returnData as ChatMessage) : m)
            .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
        );
      }
    } catch (error: unknown) {
      console.error('Error creating appointment:', error);
      showToast({
        title: '取引予定の提案に失敗しました',
        description: getErrorMessage(error, '通信状況を確認してもう一度お試しください。'),
        tone: 'error',
      });
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
    } finally {
      setEditingAppointmentId(null);
      setAppointmentDraft(null);
    }
  };

  const handleUpdateAppointment = async (msgId: string, newStatus: 'accepted' | 'canceled') => {
    if (!user) return;
    
    const msg = messages.find(m => m.id === msgId);
    if (!msg || !msg.appointment_data) return;

    // Update the UI immediately so the status change feels responsive.
    setMessages(prev => prev.map(m => 
      m.id === msgId 
        ? { ...m, appointment_data: { ...m.appointment_data!, status: newStatus } } 
        : m
    ));

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          appointment_data: {
            ...msg.appointment_data,
            status: newStatus
          }
        })
        .eq('id', msgId);

      if (error) throw error;
    } catch (error: unknown) {
      console.error('Error updating appointment:', error);
      showToast({
        title: '予定の更新に失敗しました',
        description: getErrorMessage(error, '時間をおいて再度お試しください。'),
        tone: 'error',
      });
      // Revert the local appointment status if the update fails.
      setMessages(prev => prev.map(m => 
        m.id === msgId 
          ? { ...m, appointment_data: { ...m.appointment_data!, status: msg.appointment_data!.status } } 
          : m
      ));
    }
  };

  // Loading state
  if (loading) return (
    <div className="fixed inset-0 w-full flex justify-center bg-[#8ECBAF] z-[100]">
      <div className="flex flex-col h-[100dvh] w-full max-w-2xl relative overflow-hidden shadow-2xl bg-[#8ECBAF]">
        <header className="bg-[#06C755] text-white px-4 py-3 flex items-center gap-3 shrink-0 shadow-md z-20">
          <div className="p-1.5"><ArrowLeft size={22} className="opacity-50" /></div>
          <div className="flex-1 text-center"><div className="h-5 w-24 bg-white/20 rounded mx-auto animate-pulse"></div></div>
          <div className="w-10"></div>
        </header>
        <div className="flex-1 overflow-hidden p-4 space-y-4 pt-12 opacity-50">
          <MessageSkeleton isOwn={false} />
          <MessageSkeleton isOwn={true} />
          <MessageSkeleton isOwn={false} />
        </div>
      </div>
    </div>
  );

  const isSeller = user?.id === room?.seller_id;
  const otherParty = isSeller ? room?.buyer : room?.seller;
  const thumbnail = room?.posts?.post_images?.[0]?.storage_path;
  const otherInitial = otherParty?.display_name?.[0] || '?';

  return (
    <div className="fixed inset-0 w-full flex justify-center bg-[#8ECBAF] z-[100]">
      <div className="flex flex-col h-[100dvh] w-full max-w-2xl relative overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(180deg, #8ECBAF 0%, #7BBBA0 100%)' }}>

      {/* Header */}
      <div className="relative" ref={headerMenuRef}>
        <ChatRoomHeader
          partnerName={otherParty?.display_name}
          realtimeConnected={realtimeConnected}
          showHeaderMenu={showHeaderMenu}
          onBack={() => navigate(-1)}
          onToggleMenu={() => setShowHeaderMenu((prev) => !prev)}
          onOpenPost={() => {
            setShowHeaderMenu(false);
            navigate(`/post/${room?.post_id}`);
          }}
          onOpenProfile={() => {
            setShowHeaderMenu(false);
            navigate(`/user/${otherParty?.id}`);
          }}
          onCreateAppointment={() => {
            setShowHeaderMenu(false);
            openNewAppointmentModal();
          }}
        />
      </div>

      {/* Item card and seller status controls */}
      <div className="mx-3 mt-2 mb-1 flex items-center gap-3 p-2.5 bg-white/90 backdrop-blur-md rounded-xl shadow-sm z-10 relative">
        <Link to={`/post/${room?.post_id}`} className="flex-1 flex items-center gap-3 min-w-0 group cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
            {thumbnail ? (
              <img src={thumbnail} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={16} /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate group-hover:text-[#06C755] transition-colors">
              {room?.posts?.title}
            </p>
            <p className="text-[10px] font-bold text-[#06C755]">アイテムを見る →</p>
          </div>
        </Link>
        
        {/* Seller-only status dropdown */}
        {isSeller && (
          <div className="relative shrink-0">
            <StatusBadge 
              status={room?.posts?.status || 'Available'} 
              className="!px-2 !py-1" 
              onClick={() => setShowStatusMenu(!showStatusMenu)}
            />
            {showStatusMenu && (
              <div className="absolute top-full right-0 mt-1 w-28 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden py-1 z-50 animate-in slide-in-from-top-1 fade-in duration-100">
                <button onClick={() => handleStatusChange('Available')} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                  <Package size={14} className="text-lime-500" /> 受付中
                </button>
                <button onClick={() => handleStatusChange('Reserved')} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors">
                  <Clock size={14} className="text-amber-500" /> 予約済み
                </button>
                <button onClick={() => handleStatusChange('Given')} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors border-t border-slate-50">
                  <CheckCircle2 size={14} className="text-slate-400" /> 譲渡済み
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1 relative"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === user?.id;
          const showDate = idx === 0 || !isSameDay(messages[idx - 1].created_at, msg.created_at);
          const time = formatTime(msg.created_at);

          // Group consecutive messages from same sender
          const prevMsg = messages[idx - 1];
          const nextMsg = messages[idx + 1];
          const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id || showDate;
          const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id || (nextMsg && !isSameDay(msg.created_at, nextMsg.created_at));

          return (
            <div key={msg.id}>
              {/* Date separator */}
              {showDate && (
                <div className="flex justify-center my-4">
                  <span className="bg-black/20 text-white text-[11px] font-medium px-4 py-1 rounded-full backdrop-blur-sm">
                    {formatDateLabel(msg.created_at)}
                  </span>
                </div>
              )}

              {/* Message bubble */}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-3' : 'mb-0.5'}`}>
                {/* Other's avatar (only first in group) */}
                {!isMe && (
                  <div className="w-9 mr-2 shrink-0">
                    {isFirstInGroup ? (
                      <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-[#06C755] text-sm font-black">
                        {otherInitial}
                      </div>
                    ) : null}
                  </div>
                )}

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  {/* Name (only first in group, other's messages only) */}
                  {!isMe && isFirstInGroup && (
                    <span className="text-[11px] font-medium text-white/80 mb-1 ml-1">
                      {otherParty?.display_name}
                    </span>
                  )}

                  <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Bubble */}
                    <div
                      className={`shadow-sm relative flex flex-col ${
                        isMe
                          ? `bg-[#06C755] text-white ${isFirstInGroup ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl'}`
                          : `bg-white text-slate-800 ${isFirstInGroup ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl'}`
                      } ${msg.id.startsWith('optimistic-') ? 'opacity-70' : ''}`}
                    >
                      {msg.image_url && (
                        <div className="p-1 cursor-pointer" onClick={() => window.open(msg.image_url, '_blank')}>
                          <img src={msg.image_url} alt="送信画像" className="max-w-[200px] max-h-[250px] sm:max-w-[240px] rounded-xl object-cover" />
                        </div>
                      )}
                      
                      {msg.appointment_data && (
                        <AppointmentMessageCard
                          message={msg}
                          isMe={isMe}
                          onAccept={() => handleUpdateAppointment(msg.id, 'accepted')}
                          onCancel={() => handleUpdateAppointment(msg.id, 'canceled')}
                          onEdit={() =>
                            openEditAppointmentModal(msg.id, {
                              date: msg.appointment_data!.date,
                              location: msg.appointment_data!.location,
                            })
                          }
                        />
                      )}

                      {msg.text && !msg.appointment_data && (
                        <p className={`text-[14px] leading-relaxed whitespace-pre-wrap break-words ${msg.image_url ? 'px-3 pb-2 pt-1' : 'px-4 py-2.5'}`}>
                          {msg.text}
                        </p>
                      )}
                    </div>

                    {/* Time + Read status (only on last in group) */}
                    {isLastInGroup && (
                      <div className={`flex flex-col shrink-0 ${isMe ? 'items-end' : 'items-start'}`}>
                        {isMe && msg.is_read && (
                          <span className="text-[10px] font-medium text-white/80 leading-none">既読</span>
                        )}
                        <span className="text-[10px] text-white/60 leading-tight">{time}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isPartnerTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollDown && (
        <button
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-24 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-[#06C755] transition-colors z-20"
        >
          <ChevronDown size={20} />
        </button>
      )}

      {/* Input bar */}
      <footer className="bg-[#F7F8FA] border-t border-slate-200 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <button 
            type="button"
            onClick={openNewAppointmentModal}
            className="w-9 h-9 rounded-full bg-lime-100 flex items-center justify-center text-lime-600 hover:bg-lime-200 active:scale-90 transition-all shrink-0"
            title="取引の約束"
          >
            <CalendarIcon size={18} />
          </button>
          
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-300 active:scale-90 transition-all shrink-0"
            disabled={uploadingImage}
          >
            {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={20} />}
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder="メッセージを入力..."
              className="w-full px-4 py-2.5 bg-white rounded-full border border-slate-200 focus:border-[#06C755] focus:ring-2 focus:ring-[#06C755]/20 outline-none text-sm transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={!newMessage.trim() && !uploadingImage}
            className="w-9 h-9 rounded-full bg-[#06C755] flex items-center justify-center text-white shadow-md shadow-[#06C755]/30 hover:bg-[#05B54D] active:scale-90 transition-all disabled:opacity-30 disabled:shadow-none shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </footer>
      
      {/* Appointment Modal */}
      <AppointmentModal 
        isOpen={isAppointmentModalOpen}
        onClose={closeAppointmentModal}
        onSubmit={handleCreateAppointment}
        initialData={appointmentDraft}
        title={editingAppointmentId ? '取引予定を編集' : '取引予定を作成'}
        submitLabel={editingAppointmentId ? '変更を送信する' : '予定を送信する'}
      />

      {/* Review Modal */}
      {showReviewModal && user && room && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          postId={room.post_id}
          fromUserId={user.id}
          toUserId={reviewTargetUserId}
          toUserName={isSeller ? room.buyer?.display_name : room.seller?.display_name}
        />
      )}
    </div>
    </div>
  );
};

