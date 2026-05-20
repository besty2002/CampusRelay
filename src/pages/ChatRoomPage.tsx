import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft } from 'lucide-react';
import type { ChatMessage, ChatRoom, PostStatus } from '../types';
import { MessageSkeleton } from '../components/skeletons/MessageSkeleton';
import imageCompression from 'browser-image-compression';
import { AppointmentModal } from '../components/AppointmentModal';
import { ReviewModal } from '../components/ReviewModal';
import { useToast } from '../components/feedback/ToastProvider';
import { ChatRoomHeader } from '../components/chat/ChatRoomHeader';
import { ChatMessageList } from '../components/chat/ChatMessageList';
import { ChatComposer } from '../components/chat/ChatComposer';
import { logger } from '../lib/logger';

type PresencePayload = {
  user_id: string;
  is_typing?: boolean;
};

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

const formatLastSeen = (dateStr: string) =>
  `最終確認 ${new Date(dateStr).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;

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
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
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
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
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
    logger.debug('[Chat] Starting fallback polling (3s interval)');
    setConnectionState((prev) => (prev === 'offline' ? prev : 'reconnecting'));
    pollingRef.current = setInterval(() => {
      fetchNewMessages();
    }, 3000);
  }, [fetchNewMessages]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      logger.debug('[Chat] Stopping polling');
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
      logger.warn('[Chat] markMessagesAsRead failed (is_read column may not exist):', err);
    }
  }, [user, roomId, room]);

  // Realtime subscription with polling fallback
  useEffect(() => {
    if (!user || !roomId) return;

    setConnectionState('connecting');
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
        logger.debug('[Realtime] INSERT received:', payload.new.id);

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
                if (error) logger.warn('[Chat] is_read update skipped:', error.message);
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
        logger.debug(`[Realtime] Message channel status: ${status}`, err || '');
        if (status === 'SUBSCRIBED') {
          logger.debug('[Realtime] Successfully subscribed to messages');
          setConnectionState('connected');
          // Realtime is healthy, so polling can stop for now.
          stopPolling();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn('[Realtime] Subscription failed, keeping polling active');
          setConnectionState('reconnecting');
          startPolling();
        } else if (status === 'CLOSED') {
          setConnectionState('reconnecting');
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

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Broadcast local typing state
  const handleInputChange = (value: string) => {
    setNewMessage(value);

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

  const updateOptimisticMessage = (optimisticId: string, message: ChatMessage) => {
    lastMessageTimeRef.current = message.created_at;
    setMessages((prev) =>
      prev
        .map((item) => (item.id === optimisticId ? message : item))
        .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    );
  };

  const markMessageAsFailed = (optimisticId: string, retryPayload: ChatMessage['retry_payload'], fallbackText?: string) => {
    setMessages((prev) =>
      prev.map((item) =>
        item.id === optimisticId
          ? {
              ...item,
              text: item.text || fallbackText || '',
              client_state: 'failed',
              retry_payload: retryPayload,
            }
          : item
      )
    );
  };

  const sendImageMessage = async (file: File) => {
    if (!user || !roomId) return;

    setUploadingImage(true);
    let optimisticId = '';
    let publicUrl = '';

    let preparedFile = file;
    try {
      if (file.type.startsWith('image/')) {
        try {
          preparedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
          });
        } catch (compError) {
          logger.error('Image compression failed:', compError);
        }
      }

      const fileExt = preparedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${roomId}/${fileName}`;
      const { data: publicUrlData } = supabase.storage.from('chat-images').getPublicUrl(filePath);
      publicUrl = publicUrlData.publicUrl;
      optimisticId = `optimistic-img-${Date.now()}`;
      const optimisticMsg: ChatMessage = {
        id: optimisticId,
        room_id: roomId,
        sender_id: user.id,
        text: '',
        image_url: publicUrl,
        is_read: false,
        created_at: new Date().toISOString(),
        profiles: { display_name: '' },
        client_state: 'sending',
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const { error: uploadError } = await supabase.storage.from('chat-images').upload(filePath, preparedFile);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          text: '',
          image_url: publicUrl,
        })
        .select('*, profiles:profiles!chat_messages_sender_id_fkey (display_name)')
        .single();

      if (error) throw error;
      if (data) updateOptimisticMessage(optimisticId, data as ChatMessage);
    } catch (err: unknown) {
      if (optimisticId) {
        markMessageAsFailed(optimisticId, {
          kind: 'image',
          file: preparedFile,
          image_url: publicUrl,
        });
      }
      showToast({
        title: '画像のアップロードに失敗しました',
        description: getErrorMessage(err, '再送ボタンからもう一度お試しください。'),
        tone: 'error',
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sendTextMessage = async (messageText: string, optimisticId = `optimistic-${Date.now()}`) => {
    if (!user || !roomId || !messageText.trim()) return;

    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      room_id: roomId,
      sender_id: user.id,
      text: messageText,
      is_read: false,
      created_at: new Date().toISOString(),
      profiles: { display_name: '' },
      client_state: 'sending',
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        text: messageText,
      })
      .select(`
        *,
        profiles:profiles!chat_messages_sender_id_fkey (display_name)
      `)
      .single();

    if (error) {
      markMessageAsFailed(optimisticId, { kind: 'text', text: messageText }, messageText);
      showToast({
        title: 'メッセージを送信できませんでした',
        description: error.message,
        tone: 'error',
      });
      return;
    }

    if (data) updateOptimisticMessage(optimisticId, data as ChatMessage);
  };

  const retryMessage = async (message: ChatMessage) => {
    if (message.client_state !== 'failed' || !message.retry_payload) return;

    setMessages((prev) =>
      prev.map((item) =>
        item.id === message.id
          ? {
              ...item,
              client_state: 'sending',
            }
          : item
      )
    );

    if (message.retry_payload.kind === 'text' && message.retry_payload.text) {
      const failedText = message.retry_payload.text;
      setMessages((prev) => prev.filter((item) => item.id !== message.id));
      await sendTextMessage(failedText, message.id);
      return;
    }

    if (message.retry_payload.kind === 'image' && message.retry_payload.file) {
      setMessages((prev) => prev.filter((item) => item.id !== message.id));
      await sendImageMessage(message.retry_payload.file);
    }
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await sendImageMessage(file);
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
    await sendTextMessage(messageText);
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
        logger.error('Error editing appointment:', error);
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
      logger.error('Error creating appointment:', error);
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
      logger.error('Error updating appointment:', error);
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

  const handleCloseChat = () => {
    setShowHeaderMenu(false);
    showToast({ title: 'チャットを閉じました', tone: 'success' });
    navigate('/messages');
  };

  const handleSubmitReport = async () => {
    if (!user || !room || !otherParty) return;

    if (!reportReason.trim()) {
      showToast({ title: '通報理由を入力してください', tone: 'info' });
      return;
    }

    setSubmittingReport(true);
    const reason = `[チャット:${room.id}] ${reportReason.trim()}`;
    const extendedReport = {
      reporter_id: user.id,
      target_type: 'user',
      target_user_id: otherParty.id,
      post_id: room.post_id,
      category: 'harassment',
      reason,
      status: 'Pending',
    };

    const { error } = await supabase.from('reports').insert(extendedReport);

    setSubmittingReport(false);
    if (error) {
      showToast({ title: '通報を送信できませんでした', description: error.message, tone: 'error' });
      return;
    }

    showToast({ title: '通報を受け付けました', description: '管理者が内容を確認します。', tone: 'success' });
    setReportReason('');
    setShowReportModal(false);
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
  const connected = connectionState === 'connected';
  const lastPartnerMessage = [...messages].reverse().find((msg) => msg.sender_id !== user?.id);
  const lastActivityLabel = connected
    ? lastPartnerMessage
      ? formatLastSeen(lastPartnerMessage.created_at)
      : '待機中'
    : undefined;

  return (
    <div className="fixed inset-0 w-full flex justify-center bg-[#8ECBAF] z-[100]">
      <div className="flex flex-col h-[100dvh] w-full max-w-2xl relative overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(180deg, #8ECBAF 0%, #7BBBA0 100%)' }}>

      {/* Header */}
      <div className="relative" ref={headerMenuRef}>
        <ChatRoomHeader
          partnerName={otherParty?.display_name}
          connectionState={!isOnline ? 'offline' : connectionState}
          lastActiveLabel={lastActivityLabel}
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
          onReportChat={() => {
            setShowHeaderMenu(false);
            setShowReportModal(true);
          }}
          onCloseChat={handleCloseChat}
        />
      </div>

      <ChatMessageList
        room={room}
        currentUserId={user?.id}
        otherParty={otherParty}
        messages={messages}
        isSeller={isSeller}
        roomStatus={room?.posts?.status || 'Available'}
        showStatusMenu={showStatusMenu}
        thumbnail={thumbnail}
        showScrollDown={showScrollDown}
        isPartnerTyping={isPartnerTyping}
        messagesContainerRef={messagesContainerRef}
        messagesEndRef={messagesEndRef}
        onScroll={handleScroll}
        onToggleStatusMenu={() => setShowStatusMenu((prev) => !prev)}
        onStatusChange={handleStatusChange}
        onScrollToBottom={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
        onRetryMessage={retryMessage}
        onOpenAppointmentEdit={openEditAppointmentModal}
        onUpdateAppointment={handleUpdateAppointment}
      />

      <ChatComposer
        newMessage={newMessage}
        uploadingImage={uploadingImage}
        connected={connected}
        isOnline={isOnline}
        fileInputRef={fileInputRef}
        onSubmit={handleSendMessage}
        onMessageChange={handleInputChange}
        onOpenAppointment={openNewAppointmentModal}
        onOpenImagePicker={() => fileInputRef.current?.click()}
        onImageChange={handleImageUpload}
      />
      
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

      {showReportModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900">チャットを通報する</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
              不適切な発言や取引上の不安がある場合、内容を管理者へ送信できます。
            </p>
            <textarea
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              placeholder="通報理由を入力してください。"
              className="mt-5 h-32 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-amber-300 focus:bg-white"
            />
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                }}
                className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-black text-slate-500 transition-colors hover:bg-slate-200"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitReport()}
                disabled={submittingReport}
                className="flex-1 rounded-2xl bg-amber-500 py-3 text-sm font-black text-white shadow-lg shadow-amber-200 transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingReport ? '送信中...' : '通報する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
