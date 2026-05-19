import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ImageOff, MessageCircle, Search } from 'lucide-react';
import type { ChatRoom } from '../types';
import { ChatListSkeleton } from '../components/skeletons/ChatListSkeleton';

interface ChatRoomUpdatePayload {
  id: string;
  last_message_text?: string;
  last_message_at?: string;
  unread_count_seller?: number;
  unread_count_buyer?: number;
}

const COPY = {
  title: 'トーク',
  countSuffix: '件',
  searchPlaceholder: 'トークを検索',
  emptySearch: '検索条件に一致するトークがありません。',
  emptyDefault: 'まだトークはありません。',
  browseItems: 'アイテムを見る',
  noMessages: 'まだメッセージはありません',
  justNow: 'たった今',
  sellerBadge: '出品者',
  userFallback: 'ユーザー',
} as const;

const formatRelativeTime = (dateStr: string | undefined) => {
  if (!dateStr) return '';

  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return COPY.justNow;
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHr < 24) {
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDay < 7) {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${days[date.getDay()]}曜日`;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const buildPostImageUrl = (storagePath?: string) => {
  if (!storagePath) return '';
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) return storagePath;
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${storagePath}`;
};

export const ChatListPage = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const fetchRooms = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data } = await supabase
      .from('chat_rooms')
      .select(
        `
        *,
        posts (
          title,
          post_images (storage_path)
        ),
        seller:profiles!chat_rooms_seller_id_fkey (id, display_name),
        buyer:profiles!chat_rooms_buyer_id_fkey (id, display_name)
      `
      )
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (data) {
      setRooms(data as ChatRoom[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    void fetchRooms();

    const channel = supabase
      .channel('chat-list-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_rooms',
        },
        (payload) => {
          const nextRoom = payload.new as ChatRoomUpdatePayload;

          setRooms((prev) => {
            const updated = prev.map((room) =>
              room.id === nextRoom.id
                ? {
                    ...room,
                    last_message_text: nextRoom.last_message_text,
                    last_message_at: nextRoom.last_message_at,
                    unread_count_seller: nextRoom.unread_count_seller,
                    unread_count_buyer: nextRoom.unread_count_buyer,
                  }
                : room
            );

            return updated.sort((a, b) => {
              const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return tb - ta;
            });
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_rooms',
        },
        () => {
          void fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRooms]);

  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const isSeller = user?.id === room.seller_id;
    const otherName = (isSeller ? room.buyer : room.seller)?.display_name?.toLowerCase() || '';
    const title = room.posts?.title?.toLowerCase() || '';
    const lastMsg = room.last_message_text?.toLowerCase() || '';

    return otherName.includes(q) || title.includes(q) || lastMsg.includes(q);
  });

  if (loading) {
    return (
      <div className="mx-auto min-h-screen max-w-2xl bg-white pb-32">
        <header className="sticky top-0 z-10 border-b border-slate-100 bg-white">
          <div className="px-5 pb-3 pt-10">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-black tracking-tight text-slate-800">{COPY.title}</h1>
            </div>
          </div>
        </header>
        <div className="mt-4 space-y-4 divide-y divide-slate-50 px-4 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <ChatListSkeleton key={n} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-white pb-32">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white">
        <div className="px-5 pb-3 pt-10">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight text-slate-800">{COPY.title}</h1>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-400">
                {rooms.length}
                {COPY.countSuffix}
              </span>
            </div>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={COPY.searchPlaceholder}
              className="w-full rounded-xl border-none bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#06C755]/20"
            />
          </div>
        </div>
      </header>

      {filteredRooms.length === 0 ? (
        <div className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
            <MessageCircle className="text-slate-200" size={36} />
          </div>
          <p className="mb-2 font-bold text-slate-400">
            {searchQuery ? COPY.emptySearch : COPY.emptyDefault}
          </p>
          {!searchQuery && (
            <Link to="/" className="inline-block text-sm font-bold text-[#06C755] hover:underline">
              {COPY.browseItems} &rarr;
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {filteredRooms.map((room) => {
            const isSeller = user?.id === room.seller_id;
            const otherParty = isSeller ? room.buyer : room.seller;
            const thumbnail = room.posts?.post_images?.[0]?.storage_path;
            const unreadCount = isSeller ? (room.unread_count_seller || 0) : (room.unread_count_buyer || 0);
            const initial = otherParty?.display_name?.[0] || '?';
            const imageKey = `${room.id}:${thumbnail || 'fallback'}`;
            const hasBrokenImage = Boolean(thumbnail && brokenImages[imageKey]);

            return (
              <Link
                key={room.id}
                to={`/chat/${room.id}`}
                className="block p-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-start gap-3">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                    {thumbnail && !hasBrokenImage ? (
                      <img
                        src={buildPostImageUrl(thumbnail)}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() =>
                          setBrokenImages((prev) => ({
                            ...prev,
                            [imageKey]: true,
                          }))
                        }
                      />
                    ) : (
                      <div
                        data-testid={`chat-thumbnail-fallback-${room.id}`}
                        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#06C755]/15 to-[#06C755]/5 text-lg font-bold text-[#06C755]"
                      >
                        {thumbnail ? <ImageOff size={18} /> : initial}
                      </div>
                    )}
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#06C755] px-1.5 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate font-bold text-slate-800">
                          {otherParty?.display_name || COPY.userFallback}
                        </p>
                        {isSeller && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            {COPY.sellerBadge}
                          </span>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-xs font-medium text-slate-400">
                        {formatRelativeTime(room.last_message_at)}
                      </span>
                    </div>

                    <p className="mb-1 truncate text-sm font-medium text-slate-600">{room.posts?.title}</p>
                    <p className="truncate text-sm text-slate-400">{room.last_message_text || COPY.noMessages}</p>
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
