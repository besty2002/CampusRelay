import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { SchoolSelectPage } from './pages/SchoolSelectPage';
import { FeedPage } from './pages/FeedPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { HomePage } from './pages/HomePage';
import { useAuth } from './hooks/useAuth';
import { Loader2, Home, Search, PlusSquare, User } from 'lucide-react';

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
  
  const isAuthPage = location.pathname === '/auth';
  if (isAuthPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-4xl mx-auto">
        {children}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white/80 backdrop-blur-lg border-t border-slate-100 px-6 py-3 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <NavLink to="/" icon={<Home size={24} />} label="홈" active={location.pathname === '/'} />
          <NavLink to="/schools" icon={<Search size={24} />} label="학교" active={location.pathname === '/schools'} />
          <Link 
            to="/schools" 
            className="w-12 h-12 bg-lime-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-lime-500/30 active:scale-90 transition-all -mt-8 border-4 border-white"
          >
            <PlusSquare size={24} />
          </Link>
          <NavLink to="/me" icon={<User size={24} />} label="프로필" active={location.pathname === '/me'} />
        </div>
      </nav>
    </div>
  );
};

const NavLink = ({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) => (
  <Link to={to} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-lime-600 scale-110' : 'text-slate-400'}`}>
    {icon}
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
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
          
          <Route path="/schools" element={
            <ProtectedRoute>
              <SchoolSelectPage />
            </ProtectedRoute>
          } />
          
          <Route path="/feed/:schoolId" element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          } />
          
          <Route path="/post/new" element={
            <ProtectedRoute>
              <CreatePostPage />
            </ProtectedRoute>
          } />

          <Route path="/post/edit/:postId" element={
            <ProtectedRoute>
              <CreatePostPage />
            </ProtectedRoute>
          } />
          
          <Route path="/post/:postId" element={
            <PostDetailPage />
          } />

          <Route path="/me" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
