import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Send, Loader2, Package } from 'lucide-react';
import type { ChatMessage, ChatRoom } from '../types';

export const ChatRoomPage = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && roomId) {
      fetchRoomAndMessages();
      subscribeToMessages();
    }
  }, [user, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRoomAndMessages = async () => {
    setLoading(true);
    // 1. Fetch Room Info
    const { data: roomData } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        posts (
          title,
          post_images (storage_path)
        ),
        seller:profiles!chat_rooms_seller_id_fkey (display_name),
        buyer:profiles!chat_rooms_buyer_id_fkey (display_name)
      `)
      .eq('id', roomId)
      .single();

    if (roomData) setRoom(roomData as any);

    // 2. Fetch Messages
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
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      }, async (payload) => {
        // Fetch full message with profile data
        const { data } = await supabase
          .from('chat_messages')
          .select(`
            *,
            profiles:profiles!chat_messages_sender_id_fkey (display_name)
          `)
          .eq('id', payload.new.id)
          .single();
        
        if (data) {
          setMessages(prev => [...prev, data as any]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !roomId) return;

    const messageText = newMessage;
    setNewMessage('');

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        text: messageText
      });

    if (error) {
      alert(error.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-lime-500" />
    </div>
  );

  const isSeller = user?.id === room?.seller_id;
  const otherParty = isSeller ? room?.buyer : room?.seller;
  const thumbnail = room?.posts?.post_images?.[0]?.storage_path;

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-2xl mx-auto border-x border-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-100 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-slate-800 truncate">{otherParty?.display_name}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {isSeller ? '譲受人' : '出品者'}
            </p>
          </div>
        </div>
        
        <Link 
          to={`/post/${room?.post_id}`}
          className="mt-3 flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-100 hover:border-lime-200 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-white overflow-hidden shrink-0 border border-slate-100">
            {thumbnail ? (
              <img src={thumbnail} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={16} /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate group-hover:text-lime-600 transition-colors">
              {room?.posts?.title}
            </p>
            <p className="text-[9px] font-black text-lime-500 uppercase">アイテムを見る &rarr;</p>
          </div>
        </Link>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-[2rem] shadow-sm ${
                isMe 
                  ? 'bg-lime-500 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
              }`}>
                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                <p className={`text-[8px] mt-1 font-bold uppercase opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <footer className="p-4 bg-white border-t border-slate-100 pb-24 sm:pb-4">
        <form onSubmit={handleSendMessage} className="relative">
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力してください..."
            className="w-full pl-6 pr-14 py-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-lime-500/10 focus:bg-white outline-none font-medium transition-all"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-lime-500 text-white rounded-xl shadow-lg shadow-lime-500/30 hover:bg-lime-600 active:scale-90 transition-all disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
};
