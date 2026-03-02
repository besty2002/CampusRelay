import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { HomePage } from './pages/HomePage';
import { PostDetailPage } from './pages/PostDetailPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { MessagesPage } from './pages/MessagesPage';
import { ChatRoomPage } from './pages/ChatRoomPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { User as UserIcon, MessageCircle, Home, PlusSquare, Shield, LogOut } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

// 관리자 권한을 가질 이메일 리스트 (사용자 이메일을 추가하시면 해당 계정으로 로그인 시 관리자 메뉴가 활성화됩니다)
const ADMIN_EMAILS = ['doogiya2002@gmail.com']; 

function Layout({ children, session, isAdmin }: { children: React.ReactNode; session: Session | null; isAdmin: boolean }) {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isAdminPath) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#fcfdfc] pb-24 md:pb-0 md:pt-16">
      {/* Top Nav */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-100 z-50 h-16 flex items-center justify-between px-6 md:px-8">
        <Link to="/" className="text-xl md:text-2xl font-black text-primary tracking-tighter shrink-0">
          新田学園<span className="text-slate-900">リレーシェア</span>
        </Link>
        
        <div className="flex items-center gap-2 md:gap-6">
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-slate-600 hover:text-primary font-bold">ホーム</Link>
            <Link to="/post/new" className="text-slate-600 hover:text-primary font-bold">譲る</Link>
            <Link to="/messages" className="text-slate-600 hover:text-primary font-bold">メッセージ</Link>
            {isAdmin && (
              <Link to="/admin" className="text-slate-400 hover:text-primary transition-colors flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                <Shield size={16}/>
                <span className="text-[10px] font-black uppercase tracking-widest">Admin</span>
              </Link>
            )}
          </div>

          {session ? (
            <div className="flex items-center gap-3">
              <Link to="/profile" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-secondary-light flex items-center justify-center text-secondary-dark font-bold border-2 border-white shadow-sm overflow-hidden">
                {(session.user.email?.[0] || session.user.id[0] || '?').toUpperCase()}
              </Link>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="bg-primary text-white px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold hover:bg-primary-dark transition-all text-sm md:text-base">
              ログイン
            </Link>
          )}
        </div>
      </nav>

      <div className="pt-16 md:pt-4">
        {children}
      </div>

      {/* Bottom Nav (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50">
        <Link to="/" className="flex flex-col items-center gap-1 text-primary">
          <Home size={24} />
          <span className="text-[10px] font-bold">ホーム</span>
        </Link>
        <Link to="/post/new" className="flex flex-col items-center gap-1 text-slate-400">
          <PlusSquare size={24} />
          <span className="text-[10px] font-bold">譲る</span>
        </Link>
        <Link to="/messages" className="flex flex-col items-center gap-1 text-slate-400">
          <MessageCircle size={24} />
          <span className="text-[10px] font-bold">チャット</span>
        </Link>
        <Link to={session ? "/profile" : "/login"} className="flex flex-col items-center gap-1 text-slate-400">
          <UserIcon size={24} />
          <span className="text-[10px] font-bold">{session ? 'マイページ' : 'ログイン'}</span>
        </Link>
      </nav>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        if (currentSession?.user?.email) {
          setIsAdmin(ADMIN_EMAILS.includes(currentSession.user.email));
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.email) {
        setIsAdmin(ADMIN_EMAILS.includes(newSession.user.email));
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfdfc] font-sans">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 font-black text-primary">読み込み中...</p>
      </div>
    );
  }

  const basename = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

  return (
    <BrowserRouter basename={basename}>
      <Layout session={session} isAdmin={isAdmin}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/post/:id" element={<PostDetailPage session={session} />} />
          <Route path="/post/new" element={session ? <CreatePostPage session={session} /> : <Navigate to="/login" replace />} />
          <Route path="/post/edit/:id" element={session ? <CreatePostPage session={session} /> : <Navigate to="/login" replace />} />
          <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />} />
          <Route path="/messages" element={session ? <MessagesPage /> : <Navigate to="/login" replace />} />
          <Route path="/messages/:id" element={session ? <ChatRoomPage /> : <Navigate to="/login" replace />} />
          <Route path="/profile" element={<ProfilePage session={session} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
