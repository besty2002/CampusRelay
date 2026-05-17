import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { PostStatus } from '../types';
import {
  Loader2,
  Package,
  Clock,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
} from 'lucide-react';

interface ActivityPost {
  id: string;
  title: string;
  status: PostStatus;
  created_at: string;
  post_images?: Array<{ storage_path: string }>;
  post_requests?: Array<{ id: string; status: 'Pending' | 'Approved' | 'Rejected' }>;
}

interface ReceivedRequest {
  id: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  posts?: {
    id: string;
    title: string;
    post_images?: Array<{ storage_path: string }>;
    profiles?: { display_name: string };
  };
}

const STATUS_LABELS: Record<string, string> = {
  Available: '受付中',
  Reserved: '予約済み',
  Given: '譲渡済み',
  Hidden: '非公開',
  Pending: '申請中',
  Approved: '承認済み',
  Rejected: '見送り',
};

const COPY = {
  backToProfile: 'プロフィールに戻る',
  title: '取引履歴',
  description: '出品したアイテムと申請したアイテムの進行状況を確認できます。',
  givingTab: '出品中（譲る）',
  receivingTab: '申請履歴（受け取る）',
  noGivingItems: 'まだ出品したアイテムはありません。',
  noReceivingItems: 'まだ申請したアイテムはありません。',
  requestCountSuffix: '件',
  giverLabel: 'Giver:',
  browseItems: 'アイテムを見る',
} as const;

export const ActivityDashboardPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'giving' | 'receiving'>('giving');
  const [givingItems, setGivingItems] = useState<ActivityPost[]>([]);
  const [receivingRequests, setReceivingRequests] = useState<ReceivedRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      void fetchActivity();
    }
  }, [user, activeTab]);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      if (activeTab === 'giving') {
        const { data } = await supabase
          .from('posts')
          .select(
            `
            *,
            post_images (storage_path),
            schools (name_ja),
            post_requests (id, status)
          `
          )
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });

        if (data) {
          setGivingItems(data as ActivityPost[]);
        }
      } else {
        const { data } = await supabase
          .from('post_requests')
          .select(
            `
            *,
            posts (
              *,
              post_images (storage_path),
              schools (name_ja),
              profiles (display_name)
            )
          `
          )
          .eq('requester_id', user?.id)
          .order('created_at', { ascending: false });

        if (data) {
          setReceivingRequests(data as ReceivedRequest[]);
        }
      }
    } catch (err) {
      console.error('Error fetching activity:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6 pb-32 pt-12">
      <header className="mb-10">
        <Link
          to="/me"
          className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-lime-600"
        >
          <ArrowLeft size={16} /> {COPY.backToProfile}
        </Link>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-800">{COPY.title}</h1>
        <p className="ml-1 font-medium text-slate-500">{COPY.description}</p>
      </header>

      <div className="mb-8 flex gap-2 rounded-2xl bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab('giving')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition-all ${
            activeTab === 'giving' ? 'bg-white text-lime-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ArrowUpRight size={18} /> {COPY.givingTab}
        </button>
        <button
          onClick={() => setActiveTab('receiving')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition-all ${
            activeTab === 'receiving' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ArrowDownLeft size={18} /> {COPY.receivingTab}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-lime-500" size={32} />
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'giving' ? (
            givingItems.length === 0 ? (
              <EmptyState message={COPY.noGivingItems} />
            ) : (
              givingItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/post/${item.id}`}
                  className="block rounded-[2.5rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-xl"
                >
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                      {item.post_images && item.post_images.length > 0 ? (
                        <img src={item.post_images[0].storage_path} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-200">
                          <Package size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <div className="mb-1 flex items-start justify-between">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                              item.status === 'Available'
                                ? 'bg-lime-50 text-lime-600'
                                : item.status === 'Reserved'
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            {STATUS_LABELS[item.status] ?? item.status}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-300">
                            <Clock size={10} /> {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <h3 className="truncate font-black text-slate-800">{item.title}</h3>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                          申請 {item.post_requests?.length || 0} {COPY.requestCountSuffix}
                        </p>
                        <ChevronRight size={16} className="text-slate-300" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )
          ) : receivingRequests.length === 0 ? (
            <EmptyState message={COPY.noReceivingItems} />
          ) : (
            receivingRequests.map((req) => (
              <Link
                key={req.id}
                to={`/post/${req.posts?.id}`}
                className="block rounded-[2.5rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-xl"
              >
                <div className="flex gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                    {req.posts?.post_images && req.posts.post_images.length > 0 ? (
                      <img src={req.posts.post_images[0].storage_path} className="h-full w-full object-cover" alt="" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-200">
                        <Package size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <div className="mb-1 flex items-start justify-between">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                            req.status === 'Pending'
                              ? 'bg-sky-50 text-sky-600'
                              : req.status === 'Approved'
                                ? 'bg-lime-50 text-lime-600'
                                : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {STATUS_LABELS[req.status] ?? req.status}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-slate-300">
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="truncate font-black text-slate-800">{req.posts?.title}</h3>
                      <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                        {COPY.giverLabel} {req.posts?.profiles?.display_name}
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <ChevronRight size={16} className="inline text-slate-300" />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-[3rem] border-2 border-dashed border-slate-100 bg-white p-12 text-center">
    <Package className="mx-auto mb-4 text-slate-200" size={48} />
    <p className="font-bold text-slate-400">{message}</p>
    <Link to="/" className="mt-2 inline-block text-sm font-black text-lime-600">
      アイテムを見る &rarr;
    </Link>
  </div>
);
