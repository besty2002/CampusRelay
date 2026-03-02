import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  User as UserIcon, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  LogOut, 
  Package, 
  Heart, 
  Settings,
  ChevronRight,
  ExternalLink,
  Trash2,
  Edit,
  Loader2
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

export const ProfilePage = ({ session }: { session: Session | null }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [fetchingPosts, setFetchingPosts] = useState(false);

  useEffect(() => {
    if (session) {
      fetchMyPosts();
    }
  }, [session]);

  const fetchMyPosts = async () => {
    if (!session) return;
    setFetchingPosts(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('giver_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMyPosts(data || []);
    } catch (err) {
      console.error('Error fetching my posts:', err);
    } finally {
      setFetchingPosts(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('この投稿を削除してもよろしいですか？')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      setMyPosts(myPosts.filter(p => p.id !== id));
    } catch (err) {
      alert('削除に失敗しました');
    }
  };

  if (!session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
          <UserIcon size={40} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">ログインが必要です</h2>
        <p className="text-slate-500 mb-6">プロフィールを表示するにはログインが必要です。</p>
        <button onClick={() => navigate('/login')} className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all">ログインページへ</button>
      </div>
    );
  }

  const { user } = session;
  const userInitial = (user.email?.[0] || user.id[0] || '?').toUpperCase();
  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'ユーザー';
  const avatarUrl = user.user_metadata?.avatar_url;

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-[2.5rem] blur-2xl -z-10" />
        <div className="bg-white rounded-[2.5rem] p-8 card-shadow border border-white flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-secondary-light flex items-center justify-center text-secondary-dark text-4xl font-black">
              {avatarUrl ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" /> : userInitial}
            </div>
            <div className="absolute bottom-1 right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full shadow-sm" />
          </div>

          <div className="flex-1 text-center md:text-left relative">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-3">
              <h1 className="text-3xl font-black text-slate-900">{userName}</h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary-light text-secondary-dark text-xs font-bold rounded-full border border-secondary-light/50">
                <ShieldCheck size={14} /> 学内認証済み
              </span>
            </div>
            <div className="flex flex-col gap-2 text-slate-500 font-medium">
              <div className="flex items-center justify-center md:justify-start gap-2"><Mail size={16} className="text-slate-400" /><span>{user.email}</span></div>
              <div className="flex items-center justify-center md:justify-start gap-2"><Calendar size={16} className="text-slate-400" /><span>登録日: {new Date(user.created_at).toLocaleDateString('ja-JP')}</span></div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
               <div className="text-center px-6 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-xl font-black text-slate-900">{myPosts.length}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">譲渡実績</div>
               </div>
               <div className="text-center px-6 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-xl font-black text-slate-900">4.9</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">評価</div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
           <div className="bg-white rounded-3xl p-4 card-shadow border border-slate-50">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-4 mb-4">アカウント設定</h3>
              <nav className="space-y-1">
                 <MenuLink icon={<Package size={18}/>} label="私の出品アイテム" count={myPosts.length} active={showMyPosts} onClick={() => setShowMyPosts(!showMyPosts)} />
                 <MenuLink icon={<Heart size={18}/>} label="お気に入り" count={0} />
                 <MenuLink icon={<Settings size={18}/>} label="プロフィールの編集" />
              </nav>
           </div>
           <button onClick={handleLogout} disabled={loading} className="w-full flex items-center justify-between p-4 text-red-500 font-bold bg-red-50 hover:bg-red-100 rounded-3xl transition-all group">
              <div className="flex items-center gap-3"><LogOut size={18} /><span>ログアウト</span></div>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
           </button>
        </div>

        <div className="md:col-span-2 space-y-6">
           <div className="bg-white rounded-[2.5rem] p-8 card-shadow border border-slate-50 h-full min-h-[400px]">
              {showMyPosts ? (
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black text-slate-900">私の出品アイテム</h2>
                    <button onClick={() => setShowMyPosts(false)} className="text-slate-400 font-bold text-sm hover:text-primary">戻る</button>
                  </div>
                  {fetchingPosts ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
                  ) : myPosts.length > 0 ? (
                    <div className="space-y-4">
                      {myPosts.map(post => (
                        <div key={post.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shadow-sm shrink-0">
                            <img src={post.photos?.[0]} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 truncate">{post.title}</h4>
                            <p className="text-[10px] text-slate-400 font-black uppercase mt-1">{post.status} • {post.category}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => navigate(`/post/edit/${post.id}`)} className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-lg shadow-sm transition-all"><Edit size={16}/></button>
                            <button onClick={() => handleDeletePost(post.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg shadow-sm transition-all"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-slate-400 font-bold">まだ出品したアイテムはありません</div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black text-slate-900">最近の活動</h2>
                    <button className="text-primary font-bold text-sm flex items-center gap-1 hover:underline">すべて見る <ExternalLink size={14} /></button>
                  </div>
                  <div className="space-y-6">
                     <ActivityItem title="マクロ経済学の教科書" status="譲渡完了" date="2024.03.01" image="https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=100" />
                     <div className="pt-8 text-center"><p className="text-slate-400 text-sm font-medium">現在、進行中のリクエストはありません</p></div>
                  </div>
                </>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

const MenuLink = ({ icon, label, count, active, onClick }: { icon: React.ReactNode, label: string, count?: number, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${
      active ? 'bg-primary-light/30 text-primary' : 'text-slate-600 hover:text-primary hover:bg-primary-light/30'
    }`}
  >
    <div className="flex items-center gap-3">
      <span className={`${active ? 'text-primary' : 'text-slate-400'} group-hover:text-primary transition-colors`}>{icon}</span>
      <span className="font-bold">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {count !== undefined && (
        <span className={`px-2 py-0.5 rounded-lg text-xs font-black transition-colors ${
          active ? 'bg-primary text-white' : 'bg-slate-100 group-hover:bg-primary-light text-slate-500 group-hover:text-primary-dark'
        }`}>
          {count}
        </span>
      )}
      <ChevronRight size={16} className={`${active ? 'text-primary' : 'text-slate-300'} group-hover:text-primary group-hover:translate-x-1 transition-all`} />
    </div>
  </button>
);

const ActivityItem = ({ title, status, date, image }: { title: string, status: string, date: string, image: string }) => (
  <div className="flex items-center gap-4 group cursor-pointer">
    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-100 card-shadow group-hover:scale-105 transition-transform"><img src={image} alt={title} className="w-full h-full object-cover" /></div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-slate-800 truncate group-hover:text-primary transition-colors">{title}</h4>
      <div className="flex items-center gap-3 mt-1">
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${status === '譲渡完了' ? 'bg-green-50 text-green-600' : 'bg-primary-light text-primary-dark'}`}>{status}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase">{date}</span>
      </div>
    </div>
    <ChevronRight size={18} className="text-slate-200 group-hover:text-primary group-hover:translate-x-1 transition-all" />
  </div>
);
