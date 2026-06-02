import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Bell, Home, Loader2, MessageCircle, PlusSquare, ShieldCheck, User } from 'lucide-react';
import { AnnouncementPopup } from './components/announcements/AnnouncementPopup';
import { OfflineBanner } from './components/OfflineBanner';
import { ToastProvider } from './components/feedback/ToastProvider';
import { useAuth } from './hooks/useAuth';
import { isSupabaseConfigured, missingPublicEnvVars } from './lib/env';
import { logger } from './lib/logger';
import { supabase } from './lib/supabase';
import type { Announcement } from './types';

const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const SchoolSelectPage = lazy(() => import('./pages/SchoolSelectPage').then((module) => ({ default: module.SchoolSelectPage })));
const FeedPage = lazy(() => import('./pages/FeedPage').then((module) => ({ default: module.FeedPage })));
const CreatePostPage = lazy(() => import('./pages/CreatePostPage').then((module) => ({ default: module.CreatePostPage })));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage').then((module) => ({ default: module.PostDetailPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage').then((module) => ({ default: module.AdminOverviewPage })));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage').then((module) => ({ default: module.AdminReportsPage })));
const AdminPostsPage = lazy(() => import('./pages/admin/AdminPostsPage').then((module) => ({ default: module.AdminPostsPage })));
const AdminCommentsPage = lazy(() => import('./pages/admin/AdminCommentsPage').then((module) => ({ default: module.AdminCommentsPage })));
const AdminAuditLogPage = lazy(() => import('./pages/admin/AdminAuditLogPage').then((module) => ({ default: module.AdminAuditLogPage })));
const AdminInvitesPage = lazy(() => import('./pages/admin/AdminInvitesPage').then((module) => ({ default: module.AdminInvitesPage })));
const AdminAnnouncementsPage = lazy(() =>
  import('./pages/admin/AdminAnnouncementsPage').then((module) => ({ default: module.AdminAnnouncementsPage }))
);
const AdminAuthPage = lazy(() => import('./pages/admin/AdminAuthPage').then((module) => ({ default: module.AdminAuthPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage').then((module) => ({ default: module.NotificationSettingsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const UserPublicProfilePage = lazy(() => import('./pages/UserPublicProfilePage').then((module) => ({ default: module.UserPublicProfilePage })));
const ActivityDashboardPage = lazy(() => import('./pages/ActivityDashboardPage').then((module) => ({ default: module.ActivityDashboardPage })));
const ChatListPage = lazy(() => import('./pages/ChatListPage').then((module) => ({ default: module.ChatListPage })));
const ChatRoomPage = lazy(() => import('./pages/ChatRoomPage').then((module) => ({ default: module.ChatRoomPage })));
const SchoolVerificationPage = lazy(() => import('./pages/SchoolVerificationPage').then((module) => ({ default: module.SchoolVerificationPage })));

const PAGE_LOADER_COPY = {
  localSetup: 'ローカル設定が必要です',
  startTitle: 'Campus Relay を開始できません',
  startDescription:
    'このローカル環境では Supabase の環境変数が不足しているため、最初の画面を表示する前にアプリが停止しています。プロジェクト直下の `.env` に下記キーを設定してから、開発サーバーを再起動してください。',
  missingNow: '不足中のキー',
  startHint: '`.env.example` をベースに設定できます。値を追加すると通常どおりアプリが起動します。',
};

const NAV_COPY = {
  home: 'ホーム',
  notifications: '通知',
  create: '出品',
  createAria: '出品する',
  messages: 'トーク',
  profile: 'プロフィール',
  admin: '管理',
};

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
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
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  const isAnnouncementVisible = useCallback((item: Announcement) => {
    const now = Date.now();
    const startsAt = item.starts_at ? new Date(item.starts_at).getTime() : null;
    const endsAt = item.ends_at ? new Date(item.ends_at).getTime() : null;
    return (startsAt === null || startsAt <= now) && (endsAt === null || endsAt >= now);
  }, []);

  const getDismissKey = useCallback((item: Announcement) => {
    return `campusrelay:announcement:dismissed:${item.id}:${item.updated_at}`;
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadMessages(0);
      return;
    }

    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('seller_id, buyer_id, unread_count_seller, unread_count_buyer')
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`);

    if (!rooms) return;

    const total = rooms.reduce((sum, room) => {
      const isSeller = room.seller_id === user.id;
      return sum + (isSeller ? (room.unread_count_seller || 0) : (room.unread_count_buyer || 0));
    }, 0);

    setUnreadMessages(total);
  }, [user]);

  const checkAdmin = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    setIsAdmin(data?.role === 'school_admin' || data?.role === 'super_admin');
  }, [user]);

  const fetchAnnouncement = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .eq('show_as_popup', true)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const nextAnnouncement =
        ((data as Announcement[] | null) || []).find(
          (item) => isAnnouncementVisible(item) && !window.localStorage.getItem(getDismissKey(item))
        ) ?? null;

      setAnnouncement(nextAnnouncement);
    } catch (error) {
      logger.warn('Announcement popup skipped', error);
      setAnnouncement(null);
    }
  }, [getDismissKey, isAnnouncementVisible]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setUnreadMessages(0);
      return;
    }

    void checkAdmin();
    void fetchUnreadCount();

    const channel = supabase
      .channel('nav-unread')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms',
        },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkAdmin, fetchUnreadCount, user]);

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      setAnnouncement(null);
      return;
    }

    void fetchAnnouncement();
  }, [fetchAnnouncement, location.pathname]);

  const isAuthPage = location.pathname === '/auth' || location.pathname === '/admin/auth';
  const isChatRoom = location.pathname.startsWith('/chat/');
  const isActivityPage = location.pathname === '/activity';

  if (isAuthPage || isChatRoom || isActivityPage) {
    return (
      <>
        <OfflineBanner />
        {children}
        <AnnouncementPopup
          announcement={announcement}
          onClose={() => setAnnouncement(null)}
          onDismissForNow={() => {
            if (!announcement) return;
            window.localStorage.setItem(getDismissKey(announcement), '1');
            setAnnouncement(null);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <OfflineBanner />
      <div className="mx-auto max-w-4xl">{children}</div>
      <AnnouncementPopup
        announcement={announcement}
        onClose={() => setAnnouncement(null)}
        onDismissForNow={() => {
          if (!announcement) return;
          window.localStorage.setItem(getDismissKey(announcement), '1');
          setAnnouncement(null);
        }}
      />

      <nav className="fixed bottom-0 z-50 w-full border-t border-slate-100 bg-white/80 px-2 py-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-md items-end justify-between gap-1">
          <NavLink to="/" icon={<Home size={20} />} label={NAV_COPY.home} active={location.pathname === '/'} />
          <NavLink
            to="/notifications"
            icon={<Bell size={20} />}
            label={NAV_COPY.notifications}
            active={location.pathname === '/notifications'}
          />

          <Link
            to="/post/new"
            aria-label={NAV_COPY.createAria}
            title={NAV_COPY.createAria}
            className="mt-[-2rem] flex shrink-0 flex-col items-center gap-1 transition-all active:scale-90"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-white bg-lime-500 text-white shadow-lg shadow-lime-500/30">
              <PlusSquare size={24} />
            </span>
            <span className="text-[9px] font-black tracking-tight text-slate-500">{NAV_COPY.create}</span>
          </Link>

          <NavLink
            to="/messages"
            icon={<MessageCircle size={20} />}
            label={NAV_COPY.messages}
            active={location.pathname === '/messages'}
            badge={unreadMessages}
          />
          <NavLink to="/me" icon={<User size={20} />} label={NAV_COPY.profile} active={location.pathname === '/me'} />

          {isAdmin && (
            <NavLink
              to="/admin"
              icon={<ShieldCheck size={20} />}
              label={NAV_COPY.admin}
              active={location.pathname.startsWith('/admin')}
            />
          )}
        </div>
      </nav>
    </div>
  );
};

const NavLink = ({
  to,
  icon,
  label,
  active,
  badge,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  badge?: number;
}) => (
  <Link
    to={to}
    aria-label={label}
    title={label}
    className={`relative flex flex-1 flex-col items-center gap-1 transition-all ${active ? 'scale-110 text-lime-600' : 'text-slate-400'}`}
  >
    <div className="relative">
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-sm shadow-red-500/30">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
    <span className="text-[9px] font-black tracking-tight">{label}</span>
  </Link>
);

const MissingConfigPage = () => (
  <div className="min-h-screen bg-slate-50 px-6 py-16">
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold text-lime-600">{PAGE_LOADER_COPY.localSetup}</p>
      <h1 className="mt-3 text-3xl font-black text-slate-900">{PAGE_LOADER_COPY.startTitle}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{PAGE_LOADER_COPY.startDescription}</p>
      <div className="mt-6 rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">
        <pre className="whitespace-pre-wrap font-mono">VITE_SUPABASE_URL=your-project-url{'\n'}VITE_SUPABASE_ANON_KEY=your-anon-key</pre>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        {PAGE_LOADER_COPY.missingNow}: {missingPublicEnvVars.join(', ')}
      </p>
      <p className="mt-4 text-xs leading-5 text-slate-500">{PAGE_LOADER_COPY.startHint}</p>
    </div>
  </div>
);

function App() {
  const basename = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

  if (!isSupabaseConfigured) {
    return <MissingConfigPage />;
  }

  return (
    <ToastProvider>
      <BrowserRouter basename={basename}>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/" element={<HomePage />} />
              <Route
                path="/schools"
                element={
                  <ProtectedRoute>
                    <SchoolSelectPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/feed/:schoolId"
                element={
                  <ProtectedRoute>
                    <FeedPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post/new"
                element={
                  <ProtectedRoute>
                    <CreatePostPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post/edit/:postId"
                element={
                  <ProtectedRoute>
                    <CreatePostPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/post/:postId" element={<PostDetailPage />} />
              <Route
                path="/me"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user/:userId"
                element={
                  <ProtectedRoute>
                    <UserPublicProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activity"
                element={
                  <ProtectedRoute>
                    <ActivityDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/verify"
                element={
                  <ProtectedRoute>
                    <SchoolVerificationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <ChatListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat/:roomId"
                element={
                  <ProtectedRoute>
                    <ChatRoomPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/admin/auth" element={<AdminAuthPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminOverviewPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="posts" element={<AdminPostsPage />} />
                <Route path="comments" element={<AdminCommentsPage />} />
                <Route path="announcements" element={<AdminAnnouncementsPage />} />
                <Route path="audit" element={<AdminAuditLogPage />} />
                <Route path="invites" element={<AdminInvitesPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
