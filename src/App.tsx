import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { SchoolSelectPage } from './pages/SchoolSelectPage';
import { FeedPage } from './pages/FeedPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { useAuth } from './hooks/useAuth';
import { Loader2 } from 'lucide-react';

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

function App() {
  const basename = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        
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
        
        <Route path="/post/:postId" element={
          <ProtectedRoute>
            <PostDetailPage />
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/schools" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
