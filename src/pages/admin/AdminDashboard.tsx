import { useState } from 'react';
import { Users, Package, AlertTriangle, CheckCircle, BarChart3, Search } from 'lucide-react';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('summary');

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 space-y-8">
        <h2 className="text-xl font-black text-primary tracking-tighter">新田学園<br/><span className="text-white">管理画面</span></h2>
        
        <nav className="flex flex-col gap-2">
          <SidebarLink icon={<BarChart3 size={20}/>} label="ダッシュボード" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
          <SidebarLink icon={<Users size={20}/>} label="ユーザー管理" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <SidebarLink icon={<Package size={20}/>} label="投稿管理" active={activeTab === 'posts'} onClick={() => setActiveTab('posts')} />
          <SidebarLink icon={<AlertTriangle size={20}/>} label="通報処理" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold">管</div>
              <div>
                <p className="text-sm font-bold">新田 太郎</p>
                <p className="text-[10px] text-slate-400">システム管理者</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-10">
           <h1 className="text-2xl font-black text-slate-800">
             {activeTab === 'summary' && 'ダッシュボード概況'}
             {activeTab === 'users' && 'ユーザー管理'}
             {activeTab === 'posts' && '投稿管理'}
             {activeTab === 'reports' && '通報処理'}
           </h1>
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="IDやキーワードで検索..." className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary outline-none" />
           </div>
        </header>

        {activeTab === 'summary' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <StatsCard label="累計ユーザー数" value="1,240" delta="+12" icon={<Users className="text-blue-500" />} />
               <StatsCard label="現在の出品数" value="85" delta="+5" icon={<Package className="text-primary" />} />
               <StatsCard label="未処理の通報" value="3" delta="-2" icon={<AlertTriangle className="text-orange-500" />} />
               <StatsCard label="譲渡完了数" value="412" delta="+15" icon={<CheckCircle className="text-green-500" />} />
            </div>

            {/* Table Sample */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">最近の通報</h3>
                  <button className="text-xs text-primary font-bold hover:underline">すべて見る</button>
               </div>
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">種類</th>
                      <th className="px-6 py-4">対象</th>
                      <th className="px-6 py-4">通報理由</th>
                      <th className="px-6 py-4">日時</th>
                      <th className="px-6 py-4">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    <ReportRow type="POST" target="物理学の教科書" reason="禁止出品物（販売目的）" time="15分前" />
                    <ReportRow type="USER" target="田中 拓海" reason="暴言・嫌がらせ" time="1時間前" />
                    <ReportRow type="POST" target="学園指定ジャケット" reason="偽ブランド品疑い" time="3時間前" />
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab !== 'summary' && (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
             <p className="text-slate-400 font-medium">「{activeTab}」の詳細は実装中です。</p>
          </div>
        )}
      </main>
    </div>
  );
};

const SidebarLink = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon}
    <span className="text-sm font-bold">{label}</span>
  </button>
);

const StatsCard = ({ label, value, delta, icon }: { label: string, value: string, delta: string, icon: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start mb-4">
       <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
       <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${delta.startsWith('+') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
         {delta}
       </span>
    </div>
    <p className="text-slate-400 text-xs font-medium">{label}</p>
    <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
  </div>
);

const ReportRow = ({ type, target, reason, time }: { type: string, target: string, reason: string, time: string }) => (
  <tr className="hover:bg-slate-50/50 transition-colors">
    <td className="px-6 py-4">
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${type === 'POST' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
        {type === 'POST' ? '投稿' : 'ユーザー'}
      </span>
    </td>
    <td className="px-6 py-4 font-bold text-slate-700">{target}</td>
    <td className="px-6 py-4 text-slate-500">{reason}</td>
    <td className="px-6 py-4 text-slate-400 text-xs">{time}</td>
    <td className="px-6 py-4">
      <button className="text-xs font-bold text-slate-800 border border-slate-200 px-3 py-1 rounded-lg hover:bg-white hover:shadow-sm transition-all">詳細</button>
    </td>
  </tr>
);
