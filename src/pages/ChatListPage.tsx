import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { MessageCircle, Loader2, Search } from 'lucide-react';
import type { ChatRoom } from '../types';

// ─── Helpers ─────────────────────────────────────────────
const formatRelativeTime = (dateStr: string | undefined) => {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHr < 24) return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  if (diffDay < 7) {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${days[d.getDay()]}曜日`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export const ChatListPage = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRooms = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
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
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (data) {
      setRooms(data as any[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchRooms();

    // ★ Realtime subscription for chat_rooms updates
    const channel = supabase
      .channel('chat-list-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_rooms',
      }, (payload) => {
        // Update the specific room in-place
        setRooms(prev => {
          const updated = prev.map(r =>
            r.id === payload.new.id
              ? {
                  ...r,
                  last_message_text: (payload.new as any).last_message_text,
                  last_message_at: (payload.new as any).last_message_at,
                  unread_count_seller: (payload.new as any).unread_count_seller,
                  unread_count_buyer: (payload.new as any).unread_count_buyer,
                }
              : r
          );
          // Re-sort by last_message_at
          return updated.sort((a, b) => {
            const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return tb - ta;
          });
        });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_rooms',
      }, () => {
        // New room created — refetch all
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRooms]);

  // ─── Filter rooms by search ────────────────────────────────
  const filteredRooms = rooms.filter(room => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const isSeller = user?.id === room.seller_id;
    const otherName = (isSeller ? room.buyer : room.seller)?.display_name?.toLowerCase() || '';
    const title = room.posts?.title?.toLowerCase() || '';
    const lastMsg = room.last_message_text?.toLowerCase() || '';
    return otherName.includes(q) || title.includes(q) || lastMsg.includes(q);
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-[#06C755]" size={32} />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen pb-32">
      {/* ═══ LINE-style Header ═══ */}
      <header className="bg-white sticky top-0 z-10 border-b border-slate-100">
        <div className="px-5 pt-10 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">トーク</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                {rooms.length}件
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="トークを検索..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl border-none text-sm focus:ring-2 focus:ring-[#06C755]/20 focus:bg-white outline-none transition-all"
            />
          </div>
        </div>
      </header>

      {/* ═══ Chat List ═══ */}
      {filteredRooms.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="text-slate-200" size={36} />
          </div>
          <p className="text-slate-400 font-bold mb-2">
            {searchQuery ? '検索結果がありません' : 'まだトークがありません'}
          </p>
          {!searchQuery && (
            <Link to="/" className="text-[#06C755] font-bold text-sm inline-block hover:underline">
              アイテムを探す →
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {filteredRooms.map((room) => {
            const isSeller = user?.id === room.seller_id;
            const otherParty = isSeller ? room.buyer : room.seller;
            const thumbnail = room.posts?.post_images?.[0]?.storage_path;
            const unreadCount = isSeller
              ? (room.unread_count_seller || 0)
              : (room.unread_count_buyer || 0);
            const initial = otherParty?.display_name?.[0] || '?';

            return (
              <Link
                key={room.id}
                to={`/chat/${room.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-all"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#06C755] to-[#05B54D] flex items-center justify-center text-white text-lg font-black shadow-md shadow-[#06C755]/20">
                    {thumbnail ? (
                      <img src={thumbnail} className="w-full h-full object-cover rounded-full" alt="" />
                    ) : (
                      initial
                    )}
                  </div>
                  {/* Unread badge */}
                  {unreadCount > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 bg-[#FF3B30] rounded-full flex items-center justify-center px-1.5 shadow-md shadow-red-500/30">
                      <span className="text-white text-[10px] font-black leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className={`font-bold text-[15px] truncate ${unreadCount > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                      {otherParty?.display_name}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-medium shrink-0 ml-2">
                      {formatRelativeTime(room.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      {room.last_message_text ? (
                        <p className={`text-sm truncate ${unreadCount > 0 ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                          {room.last_message_text}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-300 italic">メッセージはまだありません</p>
                      )}
                    </div>
                    {/* Item thumbnail mini */}
                    {thumbnail && (
                      <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                        <img src={thumbnail} className="w-full h-full object-cover" alt="" />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
