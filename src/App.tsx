import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { PostDetailPage } from './pages/PostDetailPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { MessagesPage } from './pages/MessagesPage';
import { ChatRoomPage } from './pages/ChatRoomPage';
import { User, MessageCircle, Home, PlusSquare, Shield } from 'lucide-react';

function Layout({ children }: { children: React.ReactNode }) {
  const isAdminPath = window.location.pathname.startsWith('/admin');

  if (isAdminPath) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#fcfdfc] pb-24 md:pb-0 md:pt-16">
      {/* Top Nav (Desktop) */}
      <nav className="hidden md:flex fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 z-50 h-16 items-center justify-between px-8">
        <Link to="/" className="text-2xl font-black text-primary tracking-tighter">
          新田学園<span className="text-slate-900">リレーシェア</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className="text-slate-600 hover:text-primary font-bold">ホーム</Link>
          <Link to="/post/new" className="text-slate-600 hover:text-primary font-bold">譲る</Link>
          <Link to="/messages" className="text-slate-600 hover:text-primary font-bold">メッセージ</Link>
          <Link to="/admin" className="text-slate-400 hover:text-primary transition-colors"><Shield size={20}/></Link>
          <Link to="/profile" className="w-10 h-10 rounded-full bg-secondary-light flex items-center justify-center text-secondary-dark font-bold border-2 border-white shadow-sm">S</Link>
        </div>
      </nav>

      {children}

      {/* Bottom Nav (Mobile) */}
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
        <Link to="/profile" className="flex flex-col items-center gap-1 text-slate-400">
          <User size={24} />
          <span className="text-[10px] font-bold">マイページ</span>
        </Link>
      </nav>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/post/:id" element={<PostDetailPage />} />
          <Route path="/post/new" element={<CreatePostPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:id" element={<ChatRoomPage />} />
          <Route path="/profile" element={<div className="p-8 text-center text-slate-400">マイページは準備中です</div>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
