import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  Bell, 
  CheckCircle2, 
  MessageCircle, 
  Loader2, 
  ChevronRight,
  Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: 'request' | 'approval' | 'system';
  title: string;
  message: string;
  target_url: string;
  is_read: boolean;
  created_at: string;
}

export const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    
    try {
      // 1. Get requests sent TO me
      const { data: incomingRequests } = await supabase
        .from('post_requests')
        .select(`
          id,
          message,
          created_at,
          status,
          posts (id, title, user_id),
          profiles (display_name)
        `)
        .eq('posts.user_id', user?.id)
        .order('created_at', { ascending: false });

      // 2. Get requests sent BY me that were approved
      const { data: myApprovedRequests } = await supabase
        .from('post_requests')
        .select(`
          id,
          created_at,
          status,
          posts (id, title),
          profiles!post_requests_requester_id_fkey (display_name)
        `)
        .eq('requester_id', user?.id)
        .eq('status', 'Approved')
        .order('created_at', { ascending: false });

      const formatted: Notification[] = [];

      incomingRequests?.forEach((req: any) => {
        if (!req.posts) return;
        formatted.push({
          id: req.id,
          type: 'request',
          title: '新しいお譲り申請！',
          message: `${req.profiles.display_name}さんが「${req.posts.title}」のアイテムを申請しました。`,
          target_url: `/post/${req.posts.id}`,
          is_read: false,
          created_at: req.created_at
        });
      });

      myApprovedRequests?.forEach((req: any) => {
        if (!req.posts) return;
        formatted.push({
          id: `approve-${req.id}`,
          type: 'approval',
          title: 'お譲り申請が承認されました！',
          message: `「${req.posts.title}」のアイテムのお譲りが承認されました！今すぐ確認しましょう。`,
          target_url: `/post/${req.posts.id}`,
          is_read: false,
          created_at: req.created_at
        });
      });

      setNotifications(formatted.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));

    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
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
            <Bell size={24} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Notifications</h1>
        </div>
        <p className="text-slate-500 font-medium ml-1">取引に関する重要なお知らせを確認しましょう。</p>
      </header>

      {notifications.length === 0 ? (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
          <Bell className="mx-auto text-slate-200 mb-4" size={48} />
          <p className="text-slate-400 font-bold">まだ通知がありません。</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {notifications.map((noti) => (
            <button
              key={noti.id}
              onClick={() => navigate(noti.target_url)}
              className="w-full text-left bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all flex gap-4 items-start group active:scale-[0.98]"
            >
              <div className={`mt-1 p-2 rounded-xl shrink-0 ${
                noti.type === 'request' ? 'bg-sky-50 text-sky-500' : 'bg-lime-50 text-lime-500'
              }`}>
                {noti.type === 'request' ? <MessageCircle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-black text-slate-800 group-hover:text-lime-600 transition-colors">
                    {noti.title}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                    {new Date(noti.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-3">
                  {noti.message}
                </p>
                <div className="flex items-center gap-1 text-[10px] font-black text-lime-600 uppercase tracking-widest">
                  詳細を見る <ChevronRight size={12} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* System Tip Banner */}
      <div className="mt-12 bg-slate-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
            <Package size={32} className="text-lime-400" />
          </div>
          <div>
            <h4 className="font-black text-lg mb-1">マナーチップ！</h4>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              お譲りが完了したら「完了」にすることをお忘れなく。信頼度が上がり、相手にレビューを残すことができます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
