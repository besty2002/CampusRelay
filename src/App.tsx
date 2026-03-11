import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { SchoolSelectPage } from './pages/SchoolSelectPage';
import { FeedPage } from './pages/FeedPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { HomePage } from './pages/HomePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { NotificationsPage } from './pages/NotificationsPage';
import { UserPublicProfilePage } from './pages/UserPublicProfilePage';
import { ActivityDashboardPage } from './pages/ActivityDashboardPage';
import { ChatListPage } from './pages/ChatListPage';
import { ChatRoomPage } from './pages/ChatRoomPage';
import { useAuth } from './hooks/useAuth';
import { Loader2, Home, PlusSquare, User, ShieldCheck, Bell, Activity, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-lime-500" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    if (user) {
      checkAdmin();
    }
  }, [user]);

  const checkAdmin = async () => {
    const { data } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
    if (data?.role === 'school_admin' || data?.role === 'super_admin') {
      setIsAdmin(true);
    }
  };

  const isAuthPage = location.pathname === '/auth';
  if (isAuthPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-4xl mx-auto">
        {children}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white/80 backdrop-blur-lg border-t border-slate-100 px-2 py-3 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center gap-1">
          <NavLink to="/" icon={<Home size={20} />} label="ホーム" active={location.pathname === '/'} />
          <NavLink to="/notifications" icon={<Bell size={20} />} label="通知" active={location.pathname === '/notifications'} />
          
          <Link 
            to="/post/new" 
            className="w-12 h-12 bg-lime-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-lime-500/30 active:scale-90 transition-all -mt-8 border-4 border-white shrink-0"
          >
            <PlusSquare size={24} />
          </Link>
          
          <NavLink to="/messages" icon={<MessageCircle size={20} />} label="トーク" active={location.pathname === '/messages'} />
          <NavLink to="/me" icon={<User size={20} />} label="プロフィール" active={location.pathname === '/me'} />
          
          {isAdmin && (
            <NavLink to="/admin" icon={<ShieldCheck size={20} />} label="管理" active={location.pathname === '/admin'} />
          )}
        </div>
      </nav>
    </div>
  );
};

const NavLink = ({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) => (
  <Link to={to} className={`flex flex-col items-center gap-1 transition-all flex-1 ${active ? 'text-lime-600 scale-110' : 'text-slate-400'}`}>
    {icon}
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </Link>
);

function App() {
  const basename = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

  return (
    <BrowserRouter basename={basename}>
      <Layout>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/schools" element={<ProtectedRoute><SchoolSelectPage /></ProtectedRoute>} />
          <Route path="/feed/:schoolId" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
          <Route path="/post/new" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
          <Route path="/post/edit/:postId" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
          <Route path="/post/:postId" element={<PostDetailPage />} />
          <Route path="/me" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/user/:userId" element={<ProtectedRoute><UserPublicProfilePage /></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute><ActivityDashboardPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><ChatListPage /></ProtectedRoute>} />
          <Route path="/chat/:roomId" element={<ProtectedRoute><ChatRoomPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
