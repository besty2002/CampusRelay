import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { HomePage } from './pages/HomePage';
import { PostDetailPage } from './pages/PostDetailPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { MessagesPage } from './pages/MessagesPage';
import { ChatRoomPage } from './pages/ChatRoomPage';
import { LoginPage } from './pages/LoginPage';
import { User as UserIcon, MessageCircle, Home, PlusSquare, Shield, LogOut } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

function Layout({ children, session }: { children: React.ReactNode; session: Session | null }) {
  const isAdminPath = window.location.pathname.startsWith('/admin');

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
            <Link to="/admin" className="text-slate-400 hover:text-primary transition-colors"><Shield size={20}/></Link>
          </div>

          {session ? (
            <div className="flex items-center gap-3">
              <Link to="/profile" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-secondary-light flex items-center justify-center text-secondary-dark font-bold border-2 border-white shadow-sm overflow-hidden">
                {session.user.email?.[0].toUpperCase()}
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

  useEffect(() => {
    console.log('App Initializing... Base URL:', import.meta.env.BASE_URL);
    
    // 세션 확인 타임아웃 (무한 로딩 방지)
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Session check timed out. Forcing content render.');
        setLoading(false);
      }
    }, 5000);

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        console.log('Session fetched:', currentSession ? 'User Logged In' : 'No User');
        setSession(currentSession);
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('Auth state changed:', _event, newSession ? 'Session Active' : 'No Session');
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fcfdfc',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid rgba(0,0,0,0.1)',
          borderTopColor: '#4f46e5',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '16px', fontWeight: 'bold', color: '#4f46e5' }}>읽어오는 중...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Layout session={session}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/post/:id" element={<PostDetailPage />} />
          <Route path="/post/new" element={session ? <CreatePostPage /> : <Navigate to="/login" replace />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/messages" element={session ? <MessagesPage /> : <Navigate to="/login" replace />} />
          <Route path="/messages/:id" element={session ? <ChatRoomPage /> : <Navigate to="/login" replace />} />
          <Route path="/profile" element={session ? <div className="p-8 text-center text-slate-400">マイページは準備中です</div> : <Navigate to="/login" replace />} />
          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
