import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Post } from '../types';
import { 
  Loader2, 
  Package, 
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight
} from 'lucide-react';

export const ActivityDashboardPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'giving' | 'receiving'>('giving');
  const [givingItems, setGivingItems] = useState<Post[]>([]);
  const [receivingRequests, setReceivingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchActivity();
    }
  }, [user, activeTab]);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      if (activeTab === 'giving') {
        // Items I am giving away
        const { data } = await supabase
          .from('posts')
          .select(`
            *,
            post_images (storage_path),
            schools (name_ja),
            post_requests (id, status)
          `)
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });
        if (data) setGivingItems(data as any[]);
      } else {
        // Items I have requested
        const { data } = await supabase
          .from('post_requests')
          .select(`
            *,
            posts (
              *,
              post_images (storage_path),
              schools (name_ja),
              profiles (display_name)
            )
          `)
          .eq('requester_id', user?.id)
          .order('created_at', { ascending: false });
        if (data) setReceivingRequests(data);
      }
    } catch (err) {
      console.error('Error fetching activity:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 pt-12 pb-32">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">My Activity</h1>
        <p className="text-slate-500 font-medium ml-1">나눔 신청 및 진행 현황을 관리하세요.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-8">
        <button
          onClick={() => setActiveTab('giving')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
            activeTab === 'giving' ? 'bg-white text-lime-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ArrowUpRight size={18} /> 나눔 중 (줄 물건)
        </button>
        <button
          onClick={() => setActiveTab('receiving')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
            activeTab === 'receiving' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ArrowDownLeft size={18} /> 신청 내역 (받을 물건)
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
              <EmptyState message="아직 등록한 나눔 아이템이 없습니다." />
            ) : (
              givingItems.map(item => (
                <Link 
                  key={item.id} 
                  to={`/post/${item.id}`}
                  className="block bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
                      {item.post_images && item.post_images.length > 0 ? (
                        <img src={item.post_images[0].storage_path} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={24} /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                            item.status === 'Available' ? 'bg-lime-50 text-lime-600' :
                            item.status === 'Reserved' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
                          }`}>
                            {item.status}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 uppercase">
                            <Clock size={10} /> {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <h3 className="font-black text-slate-800 truncate">{item.title}</h3>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {item.post_requests?.length || 0} 신청자 대기 중
                        </p>
                        <ChevronRight size={16} className="text-slate-300" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )
          ) : (
            receivingRequests.length === 0 ? (
              <EmptyState message="아직 신청한 나눔 아이템이 없습니다." />
            ) : (
              receivingRequests.map(req => (
                <Link 
                  key={req.id} 
                  to={`/post/${req.posts?.id}`}
                  className="block bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
                      {req.posts?.post_images && req.posts.post_images.length > 0 ? (
                        <img src={req.posts.post_images[0].storage_path} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={24} /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                            req.status === 'Pending' ? 'bg-sky-50 text-sky-600' :
                            req.status === 'Approved' ? 'bg-lime-50 text-lime-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {req.status}
                          </span>
                          <span className="text-[10px] font-bold text-slate-300 uppercase">
                            {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-black text-slate-800 truncate">{req.posts?.title}</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Giver: {req.posts?.profiles?.display_name}</p>
                      </div>
                      <div className="mt-2 text-right">
                        <ChevronRight size={16} className="text-slate-300 inline" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-100 text-center">
    <Package className="mx-auto text-slate-200 mb-4" size={48} />
    <p className="text-slate-400 font-bold">{message}</p>
    <Link to="/" className="text-lime-600 font-black text-sm mt-2 inline-block">나눔 둘러보기 &rarr;</Link>
  </div>
);
