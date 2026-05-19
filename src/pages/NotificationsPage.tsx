import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Bell, CheckCircle2, MessageCircle, Loader2, ChevronRight, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../lib/logger';

interface Notification {
  id: string;
  type: 'request' | 'approval' | 'system';
  title: string;
  message: string;
  target_url: string;
  is_read: boolean;
  created_at: string;
}

interface IncomingRequestRow {
  id: string;
  created_at: string;
  posts: {
    id: string;
    title: string;
    user_id: string;
  } | null;
  profiles: {
    display_name: string;
  } | null;
}

interface ApprovedRequestRow {
  id: string;
  created_at: string;
  posts: {
    id: string;
    title: string;
  } | null;
}

const COPY = {
  title: 'お知らせ',
  description: '申請や承認など、確認したい更新をまとめてチェックできます。',
  empty: 'まだお知らせはありません。',
  viewDetails: '詳細を見る',
  helperTitle: 'マナーのひとこと',
  helperDescription:
    '申請が承認されたら、できるだけ早めに受け渡し日時と場所を相談しておくと、その後のやり取りがとてもスムーズになります。',
  requestTitle: '新しい譲渡申請があります',
  approvalTitle: '申請が承認されました',
} as const;

export const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      void fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);

    try {
      const { data: incomingRequests } = await supabase
        .from('post_requests')
        .select(
          `
          id,
          message,
          created_at,
          status,
          posts (id, title, user_id),
          profiles (display_name)
        `
        )
        .eq('posts.user_id', user?.id)
        .order('created_at', { ascending: false });

      const { data: myApprovedRequests } = await supabase
        .from('post_requests')
        .select(
          `
          id,
          created_at,
          status,
          posts (id, title),
          profiles!post_requests_requester_id_fkey (display_name)
        `
        )
        .eq('requester_id', user?.id)
        .eq('status', 'Approved')
        .order('created_at', { ascending: false });

      const formatted: Notification[] = [];

      (incomingRequests as IncomingRequestRow[] | null)?.forEach((req) => {
        if (!req.posts || !req.profiles) return;
        formatted.push({
          id: req.id,
          type: 'request',
          title: COPY.requestTitle,
          message: `${req.profiles.display_name}さんが「${req.posts.title}」に申請しました。`,
          target_url: `/post/${req.posts.id}`,
          is_read: false,
          created_at: req.created_at,
        });
      });

      (myApprovedRequests as ApprovedRequestRow[] | null)?.forEach((req) => {
        if (!req.posts) return;
        formatted.push({
          id: `approve-${req.id}`,
          type: 'approval',
          title: COPY.approvalTitle,
          message: `「${req.posts.title}」の申請が承認されました。次の相談に進みましょう。`,
          target_url: `/post/${req.posts.id}`,
          is_read: false,
          created_at: req.created_at,
        });
      });

      setNotifications(
        formatted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    } catch (err) {
      logger.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-lime-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6 pb-32 pt-12">
      <header className="mb-10">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-xl bg-lime-500 p-2 text-white shadow-lg shadow-lime-500/30">
            <Bell size={24} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">{COPY.title}</h1>
        </div>
        <p className="ml-1 font-medium text-slate-500">{COPY.description}</p>
      </header>

      {notifications.length === 0 ? (
        <div className="rounded-[2.5rem] border-2 border-dashed border-slate-100 bg-white p-12 text-center">
          <Bell className="mx-auto mb-4 text-slate-200" size={48} />
          <p className="font-bold text-slate-400">{COPY.empty}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {notifications.map((noti) => (
            <button
              key={noti.id}
              onClick={() => navigate(noti.target_url)}
              className="group flex w-full items-start gap-4 rounded-[2rem] border border-slate-100 bg-white p-6 text-left shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/50 active:scale-[0.98]"
            >
              <div
                className={`mt-1 shrink-0 rounded-xl p-2 ${
                  noti.type === 'request' ? 'bg-sky-50 text-sky-500' : 'bg-lime-50 text-lime-500'
                }`}
              >
                {noti.type === 'request' ? <MessageCircle size={20} /> : <CheckCircle2 size={20} />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-black text-slate-800 transition-colors group-hover:text-lime-600">
                    {noti.title}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-300">
                    {new Date(noti.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mb-3 text-sm font-medium leading-relaxed text-slate-500">{noti.message}</p>
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-lime-600">
                  {COPY.viewDetails} <ChevronRight size={12} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="group relative mt-12 overflow-hidden rounded-[2.5rem] bg-slate-800 p-8 text-white">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-white/5 blur-3xl" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <Package size={32} className="text-lime-400" />
          </div>
          <div>
            <h4 className="mb-1 text-lg font-black">{COPY.helperTitle}</h4>
            <p className="text-sm font-medium leading-relaxed text-slate-400">{COPY.helperDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
