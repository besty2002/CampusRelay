import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { MessageCircle, Loader2, ChevronRight, Package } from 'lucide-react';
import type { ChatRoom } from '../types';

export const ChatListPage = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRooms();
    }
  }, [user]);

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
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
      .or(`seller_id.eq.${user?.id},buyer_id.eq.${user?.id}`)
      .order('created_at', { ascending: false });

    if (data) {
      // Get last messages for each room (simplified for now)
      setRooms(data as any[]);
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-lime-500" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 pt-12 pb-32">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-lime-500 text-white rounded-xl shadow-lg shadow-lime-500/30">
            <MessageCircle size={24} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Messages</h1>
        </div>
        <p className="text-slate-500 font-medium ml-1">お譲りに関する相談や調整を行いましょう。</p>
      </header>

      {rooms.length === 0 ? (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
          <MessageCircle className="mx-auto text-slate-200 mb-4" size={48} />
          <p className="text-slate-400 font-bold">まだチャットがありません。</p>
          <Link to="/" className="text-lime-600 font-black text-sm mt-2 inline-block">アイテムを探す &rarr;</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {rooms.map((room) => {
            const isSeller = user?.id === room.seller_id;
            const otherParty = isSeller ? room.buyer : room.seller;
            const thumbnail = room.posts?.post_images?.[0]?.storage_path;

            return (
              <Link 
                key={room.id} 
                to={`/chat/${room.id}`}
                className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all flex gap-4 items-center group active:scale-[0.98]"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
                  {thumbnail ? (
                    <img src={thumbnail} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={24} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-black text-slate-800 group-hover:text-lime-600 transition-colors truncate">
                      {room.posts?.title}
                    </h3>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    相手: {otherParty.display_name}
                  </p>
                </div>
                <ChevronRight size={20} className="text-slate-200" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
