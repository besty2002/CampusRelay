import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3, 
  Search, 
  Trash2, 
  ExternalLink, 
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'posts') {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setPosts(data || []);
      }
      // Note: Auth user list requires service_role key which shouldn't be in client. 
      // For a demo, we use dummy data for users or just posts management.
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('この投稿を削除してもよろしいですか？')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      setPosts(posts.filter(p => p.id !== id));
    } catch (err) {
      alert('削除に失敗しました');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 space-y-8 shrink-0">
        <div className="flex items-center gap-2 mb-4">
           <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
             <ArrowLeft size={20} />
           </button>
           <h2 className="text-xl font-black text-primary tracking-tighter">新田学園<br/><span className="text-white">管理画面</span></h2>
        </div>
        
        <nav className="flex flex-col gap-2">
          <SidebarLink icon={<BarChart3 size={20}/>} label="ダッシュボード" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
          <SidebarLink icon={<Package size={20}/>} label="投稿管理" active={activeTab === 'posts'} onClick={() => setActiveTab('posts')} />
          <SidebarLink icon={<Users size={20}/>} label="ユーザー管理" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <SidebarLink icon={<AlertTriangle size={20}/>} label="通報処理" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold shadow-lg shadow-primary/20">管</div>
              <div>
                <p className="text-sm font-bold">管理者</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Admin Mode</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        <header className="flex justify-between items-center mb-10">
           <div>
             <h1 className="text-3xl font-black text-slate-800 tracking-tight">
               {activeTab === 'summary' && '概況'}
               {activeTab === 'users' && 'ユーザー管理'}
               {activeTab === 'posts' && '投稿管理'}
               {activeTab === 'reports' && '通報処理'}
             </h1>
             <p className="text-slate-400 text-sm font-medium mt-1">システム全体のステータスを確認・管理します。</p>
           </div>
           
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="検索..." 
                className="pl-12 pr-6 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all w-64 shadow-sm" 
                value={searchTerm}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
        </header>

        {activeTab === 'summary' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <StatsCard label="累計ユーザー数" value="1,240" delta="+12" icon={<Users className="text-blue-500" />} />
               <StatsCard label="現在の出品数" value="85" delta="+5" icon={<Package className="text-primary" />} />
               <StatsCard label="未処理の通報" value="3" delta="-2" icon={<AlertTriangle className="text-orange-500" />} />
               <StatsCard label="譲渡完了数" value="412" delta="+15" icon={<CheckCircle className="text-green-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Recent Reports */}
               <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                     <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">最近の通報</h3>
                     <button onClick={() => setActiveTab('reports')} className="text-xs text-primary font-black hover:underline">すべて見る</button>
                  </div>
                  <div className="divide-y divide-slate-50">
                     <ReportMiniRow type="POST" target="物理学の教科書" reason="禁止出品物" time="15分前" />
                     <ReportMiniRow type="USER" target="田中 拓海" reason="不適切な言動" time="1時間前" />
                     <ReportMiniRow type="POST" target="学園指定ジャケット" reason="重複投稿" time="3時間前" />
                  </div>
               </div>

               {/* System Info */}
               <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-6">システム情報</h3>
                  <div className="space-y-4">
                     <SystemInfoRow label="DB 接続" status="正常" />
                     <SystemInfoRow label="Storage 容量" status="12.4 GB / 50GB" />
                     <SystemInfoRow label="最終バックアップ" status="今日 04:00" />
                     <SystemInfoRow label="API バージョン" status="v2.1.0" />
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
             <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                  <tr>
                    <th className="px-8 py-5">投稿内容</th>
                    <th className="px-8 py-5">出品者</th>
                    <th className="px-8 py-5">カテゴリ</th>
                    <th className="px-8 py-5">ステータス</th>
                    <th className="px-8 py-5 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {loading ? (
                    <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold">読み込み中...</td></tr>
                  ) : posts.length === 0 ? (
                    <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold">投稿が見つかりません。</td></tr>
                  ) : posts.map(post => (
                    <tr key={post.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shadow-sm">
                              <img src={post.photos?.[0]} className="w-full h-full object-cover" />
                           </div>
                           <div>
                              <p className="font-black text-slate-800 truncate max-w-[200px]">{post.title}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(post.created_at || post.createdAt).toLocaleDateString()}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-bold text-slate-600">{post.giver_name || post.giverName}</td>
                      <td className="px-8 py-5">
                        <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500">{post.category}</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                          post.status === '受付中' ? 'bg-primary-light text-primary-dark' : 'bg-slate-100 text-slate-400'
                        }`}>{post.status}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => navigate(`/post/${post.id}`)} className="p-2 text-slate-400 hover:text-primary transition-colors"><ExternalLink size={18}/></button>
                           <button onClick={() => handleDeletePost(post.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        )}

        {(activeTab === 'users' || activeTab === 'reports') && (
          <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 animate-in fade-in duration-700">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                <ShieldAlert size={40} />
             </div>
             <h3 className="text-xl font-black text-slate-800 mb-2">実装準備中</h3>
             <p className="text-slate-400 font-medium text-center">このセクションの管理機能は次回のアップデートで追加されます。<br/>投稿管理機能は現在ご利用可能です。</p>
          </div>
        )}
      </main>
    </div>
  );
};

const SidebarLink = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all active:scale-95 ${
      active ? 'bg-primary text-white shadow-xl shadow-primary/20 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-bold'
    }`}
  >
    <span className={active ? 'animate-pulse' : ''}>{icon}</span>
    <span className="text-sm">{label}</span>
  </button>
);

const StatsCard = ({ label, value, delta, icon }: { label: string, value: string, delta: string, icon: React.ReactNode }) => (
  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:card-shadow transition-all relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
    <div className="relative">
      <div className="flex justify-between items-start mb-6">
         <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-white transition-colors">{icon}</div>
         <span className={`text-[10px] font-black px-3 py-1 rounded-full ${delta.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
           {delta}
         </span>
      </div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black text-slate-800 mt-1 tracking-tighter">{value}</p>
    </div>
  </div>
);

const ReportMiniRow = ({ type, target, reason, time }: { type: string, target: string, reason: string, time: string }) => (
  <div className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer">
     <div className="flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full ${type === 'POST' ? 'bg-blue-400' : 'bg-purple-400'}`} />
        <div>
           <p className="text-sm font-black text-slate-700">{target}</p>
           <p className="text-[10px] text-slate-400 font-bold">{reason}</p>
        </div>
     </div>
     <span className="text-[10px] text-slate-300 font-black uppercase">{time}</span>
  </div>
);

const SystemInfoRow = ({ label, status }: { label: string, status: string }) => (
  <div className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
     <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
     <span className="text-sm font-bold text-slate-700">{status}</span>
  </div>
);
