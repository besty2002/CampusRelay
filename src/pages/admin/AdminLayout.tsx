import { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  BarChart3,
  Users,
  AlertTriangle,
  FileText,
  MessageSquare,
  ScrollText,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Crown,
  Shield,
  KeyRound,
} from 'lucide-react';

type AdminRole = 'school_admin' | 'super_admin';

interface AdminContext {
  role: AdminRole;
  adminSchoolIds: string[];
}

const TABS = [
  { path: '/admin', label: '概要', icon: BarChart3, roles: ['school_admin', 'super_admin'] },
  { path: '/admin/users', label: 'ユーザー', icon: Users, roles: ['super_admin'] },
  { path: '/admin/reports', label: '通報', icon: AlertTriangle, roles: ['school_admin', 'super_admin'] },
  { path: '/admin/posts', label: '投稿管理', icon: FileText, roles: ['school_admin', 'super_admin'] },
  { path: '/admin/comments', label: 'コメント', icon: MessageSquare, roles: ['school_admin', 'super_admin'] },
  { path: '/admin/audit', label: '操作ログ', icon: ScrollText, roles: ['super_admin'] },
  { path: '/admin/invites', label: '招待管理', icon: KeyRound, roles: ['super_admin'] },
] as const;

export const AdminLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [adminCtx, setAdminCtx] = useState<AdminContext | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdmin = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!data || data.role === 'user') {
      alert('管理者権限がありません。');
      navigate('/');
      return;
    }

    // Get school IDs for school_admin scoping
    let schoolIds: string[] = [];
    if (data.role === 'school_admin') {
      const { data: schools } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', user.id);
      schoolIds = schools?.map(s => s.school_id) || [];
    }

    setAdminCtx({ role: data.role as AdminRole, adminSchoolIds: schoolIds });
    setLoading(false);
  }, [user, navigate]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-lime-500" size={32} />
      </div>
    );
  }

  if (!adminCtx) return null;

  const visibleTabs = TABS.filter(t => (t.roles as readonly string[]).includes(adminCtx.role));

  return (
    <div className="max-w-6xl mx-auto px-4 pt-8 pb-32">
      {/* Admin Header */}
      <header className="mb-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-4 hover:text-lime-600 transition-colors"
        >
          <ArrowLeft size={16} /> ホームに戻る
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl shadow-xl shadow-slate-800/30">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">管理者パネル</h1>
            <div className="flex items-center gap-2 mt-1">
              {adminCtx.role === 'super_admin' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-full border border-amber-200">
                  <Crown size={10} /> Super Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-black rounded-full border border-sky-200">
                  <Shield size={10} /> School Admin
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="flex gap-1 mb-8 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black whitespace-nowrap transition-all shrink-0
                ${isActive
                  ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/20'
                  : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                }
              `}
            >
              <Icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Page Content */}
      <Outlet context={adminCtx} />
    </div>
  );
};
