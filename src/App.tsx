import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Bell, Home, Loader2, MessageCircle, PlusSquare, ShieldCheck, User } from 'lucide-react';
import { OfflineBanner } from './components/OfflineBanner';
import { useAuth } from './hooks/useAuth';
import { isSupabaseConfigured, missingPublicEnvVars } from './lib/env';
import { supabase } from './lib/supabase';

const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));
const SchoolSelectPage = lazy(() => import('./pages/SchoolSelectPage').then(module => ({ default: module.SchoolSelectPage })));
const FeedPage = lazy(() => import('./pages/FeedPage').then(module => ({ default: module.FeedPage })));
const CreatePostPage = lazy(() => import('./pages/CreatePostPage').then(module => ({ default: module.CreatePostPage })));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage').then(module => ({ default: module.PostDetailPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(module => ({ default: module.NotificationsPage })));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage').then(module => ({ default: module.NotificationSettingsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const UserPublicProfilePage = lazy(() => import('./pages/UserPublicProfilePage').then(module => ({ default: module.UserPublicProfilePage })));
const ActivityDashboardPage = lazy(() => import('./pages/ActivityDashboardPage').then(module => ({ default: module.ActivityDashboardPage })));
const ChatListPage = lazy(() => import('./pages/ChatListPage').then(module => ({ default: module.ChatListPage })));
const ChatRoomPage = lazy(() => import('./pages/ChatRoomPage').then(module => ({ default: module.ChatRoomPage })));
const SchoolVerificationPage = lazy(() => import('./pages/SchoolVerificationPage').then(module => ({ default: module.SchoolVerificationPage })));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="animate-spin text-lime-500" />
  </div>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;

  return <>{children}</>;
};

const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadMessages(0);
      return;
    }

    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('seller_id, buyer_id, unread_count_seller, unread_count_buyer')
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`);

    if (rooms) {
      const total = rooms.reduce((sum, room) => {
        const isSeller = room.seller_id === user.id;
        return sum + (isSeller ? (room.unread_count_seller || 0) : (room.unread_count_buyer || 0));
      }, 0);
      setUnreadMessages(total);
    }
  }, [user]);

  const checkAdmin = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    setIsAdmin(data?.role === 'school_admin' || data?.role === 'super_admin');
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setUnreadMessages(0);
      return;
    }

    checkAdmin();
    fetchUnreadCount();

    const channel = supabase
      .channel('nav-unread')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_rooms',
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadCount, checkAdmin]);

  const isAuthPage = location.pathname === '/auth';
  const isChatRoom = location.pathname.startsWith('/chat/');

  if (isAuthPage || isChatRoom) {
    return (
      <>
        <OfflineBanner />
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <OfflineBanner />
      <div className="max-w-4xl mx-auto">
        {children}
      </div>

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

          <NavLink to="/messages" icon={<MessageCircle size={20} />} label="トーク" active={location.pathname === '/messages'} badge={unreadMessages} />
          <NavLink to="/me" icon={<User size={20} />} label="プロフィール" active={location.pathname === '/me'} />

          {isAdmin && (
            <NavLink to="/admin" icon={<ShieldCheck size={20} />} label="管理" active={location.pathname === '/admin'} />
          )}
        </div>
      </nav>
    </div>
  );
};

const NavLink = ({ to, icon, label, active, badge }: { to: string, icon: ReactNode, label: string, active: boolean, badge?: number }) => (
  <Link to={to} className={`flex flex-col items-center gap-1 transition-all flex-1 relative ${active ? 'text-lime-600 scale-110' : 'text-slate-400'}`}>
    <div className="relative">
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-sm shadow-red-500/30 animate-in zoom-in-50 duration-200">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </Link>
);

const MissingConfigPage = () => (
  <div className="min-h-screen bg-slate-50 px-6 py-16">
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold text-lime-600">Local setup needed</p>
      <h1 className="mt-3 text-3xl font-black text-slate-900">Campus Relay can&apos;t start yet</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        This local build is missing Supabase environment variables, so the app was stopping before the first screen rendered.
        Add the keys below to <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env</code> in the project root, then restart the dev server.
      </p>
      <div className="mt-6 rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">
        <pre className="whitespace-pre-wrap font-mono">VITE_SUPABASE_URL=your-project-url{'\n'}VITE_SUPABASE_ANON_KEY=your-anon-key</pre>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Missing now: {missingPublicEnvVars.join(', ')}
      </p>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        You can start from <code className="rounded bg-slate-100 px-1.5 py-0.5">.env.example</code>. Once those values are set, the normal app will load again.
      </p>
    </div>
  </div>
);

function App() {
  const basename = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

  if (!isSupabaseConfigured) {
    return <MissingConfigPage />;
  }

  return (
    <BrowserRouter basename={basename}>
      <Layout>
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute><NotificationSettingsPage /></ProtectedRoute>} />
            <Route path="/verify" element={<ProtectedRoute><SchoolVerificationPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><ChatListPage /></ProtectedRoute>} />
            <Route path="/chat/:roomId" element={<ProtectedRoute><ChatRoomPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
