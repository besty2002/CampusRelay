import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Send, Loader2, Package, Plus, Menu, Phone, ChevronDown } from 'lucide-react';
import type { ChatMessage, ChatRoom } from '../types';

// ─── Helpers ───────────────────────────────────────────────
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

// ─── Typing Indicator Dots ─────────────────────────────────
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

// ─── Main Component ────────────────────────────────────────
export const ChatRoomPage = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ─── Fetch Room & Messages ────────────────────────────────
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

    if (roomData) setRoom(roomData as any);

    const { data: messagesData } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles:profiles!chat_messages_sender_id_fkey (display_name)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (messagesData) setMessages(messagesData as any[]);
    setLoading(false);
  }, [roomId]);

  // ─── Mark messages as read ────────────────────────────────
  const markMessagesAsRead = useCallback(async () => {
    if (!user || !roomId || !room) return;

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
  }, [user, roomId, room]);

  // ─── Realtime Subscription (FIXED) ────────────────────────
  useEffect(() => {
    if (!user || !roomId) return;

    fetchRoomAndMessages();

    // 1) Messages subscription
    const messageChannel = supabase
      .channel(`room-messages:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      }, async (payload) => {
        const { data } = await supabase
          .from('chat_messages')
          .select(`
            *,
            profiles:profiles!chat_messages_sender_id_fkey (display_name)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          // ★ 중복 메시지 방지
          setMessages(prev => {
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, data as any];
          });

          // 상대방 메시지면 자동으로 읽음 처리
          if (data.sender_id !== user.id) {
            await supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', data.id);
          }
        }
      })
      // ★ UPDATE 이벤트도 구독 (읽음 상태 변경 감지)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setMessages(prev =>
          prev.map(m => m.id === payload.new.id ? { ...m, is_read: (payload.new as any).is_read } : m)
        );
      })
      .subscribe();

    // 2) Presence channel (타이핑 인디케이터)
    const presenceChannel = supabase.channel(`presence:${roomId}`);
    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const others = Object.values(state)
          .flat()
          .filter((p: any) => p.user_id !== user.id && p.is_typing);
        setIsPartnerTyping(others.length > 0);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: user.id, is_typing: false });
        }
      });

    // ★ Cleanup — 컴포넌트 언마운트 시 채널 정리
    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
    };
  }, [user, roomId, fetchRoomAndMessages]);

  // ─── Mark as read when room loads ─────────────────────────
  useEffect(() => {
    if (!loading && room && messages.length > 0) {
      markMessagesAsRead();
    }
  }, [loading, room, messages.length, markMessagesAsRead]);

  // ─── Auto scroll ──────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // ─── Scroll detection ─────────────────────────────────────
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    setShowScrollDown(!isNearBottom);
  };

  // ─── Typing broadcast ─────────────────────────────────────
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

  // ─── Send message ─────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !roomId) return;

    const messageText = newMessage;
    setNewMessage('');

    // Stop typing indicator
    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({ user_id: user.id, is_typing: false });
    }

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        text: messageText
      });

    if (error) {
      alert(error.message);
      setNewMessage(messageText); // Restore on error
    }
  };

  // ─── Loading State ────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #8ECBAF 0%, #7BBBA0 100%)' }}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-white" size={32} />
        <p className="text-white/80 text-sm font-medium">読み込み中...</p>
      </div>
    </div>
  );

  const isSeller = user?.id === room?.seller_id;
  const otherParty = isSeller ? room?.buyer : room?.seller;
  const thumbnail = room?.posts?.post_images?.[0]?.storage_path;
  const otherInitial = otherParty?.display_name?.[0] || '?';

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto" style={{ background: 'linear-gradient(180deg, #8ECBAF 0%, #7BBBA0 100%)' }}>

      {/* ═══ LINE-style Header ═══ */}
      <header className="bg-[#06C755] text-white px-4 py-3 flex items-center gap-3 shrink-0 shadow-md z-20">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <h2 className="font-bold text-base truncate">{otherParty?.display_name}</h2>
        </div>
        <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
          <Phone size={20} />
        </button>
        <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
          <Menu size={20} />
        </button>
      </header>

      {/* ═══ Item Card (collapsible) ═══ */}
      <Link
        to={`/post/${room?.post_id}`}
        className="mx-3 mt-2 mb-1 flex items-center gap-3 p-2.5 bg-white/90 backdrop-blur-md rounded-xl shadow-sm hover:bg-white transition-all group z-10"
      >
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

      {/* ═══ Messages Area ═══ */}
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
              {/* ─── Date Separator ─── */}
              {showDate && (
                <div className="flex justify-center my-4">
                  <span className="bg-black/20 text-white text-[11px] font-medium px-4 py-1 rounded-full backdrop-blur-sm">
                    {formatDateLabel(msg.created_at)}
                  </span>
                </div>
              )}

              {/* ─── Message Bubble ─── */}
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
                      className={`px-4 py-2.5 shadow-sm relative ${
                        isMe
                          ? `bg-[#06C755] text-white ${isFirstInGroup ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl'}`
                          : `bg-white text-slate-800 ${isFirstInGroup ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl'}`
                      }`}
                    >
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
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

      {/* ═══ Scroll to bottom button ═══ */}
      {showScrollDown && (
        <button
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-24 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-[#06C755] transition-colors z-20"
        >
          <ChevronDown size={20} />
        </button>
      )}

      {/* ═══ LINE-style Input Bar ═══ */}
      <footer className="bg-[#F7F8FA] border-t border-slate-200 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button 
            type="button"
            className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-300 active:scale-90 transition-all shrink-0"
          >
            <Plus size={20} />
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
            disabled={!newMessage.trim()}
            className="w-9 h-9 rounded-full bg-[#06C755] flex items-center justify-center text-white shadow-md shadow-[#06C755]/30 hover:bg-[#05B54D] active:scale-90 transition-all disabled:opacity-30 disabled:shadow-none shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </footer>
    </div>
  );
};
