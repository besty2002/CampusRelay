import { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Loader2, Crown, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/feedback/ToastProvider';
import { ADMIN_TABS, type AdminRole } from './adminCopy';

interface AdminContext {
  role: AdminRole;
  adminSchoolIds: string[];
}

export const AdminLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [adminCtx, setAdminCtx] = useState<AdminContext | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdmin = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (!data || data.role === 'user') {
      showToast({
        tone: 'error',
        title: '管理者権限がありません',
        description: 'ホーム画面から一般ユーザーとしてご利用ください。',
      });
      navigate('/');
      setLoading(false);
      return;
    }

    let schoolIds: string[] = [];
    if (data.role === 'school_admin') {
      const { data: schools } = await supabase.from('user_schools').select('school_id').eq('user_id', user.id);
      schoolIds = schools?.map((school) => school.school_id) || [];
    }

    setAdminCtx({ role: data.role as AdminRole, adminSchoolIds: schoolIds });
    setLoading(false);
  }, [navigate, showToast, user]);

  useEffect(() => {
    void checkAdmin();
  }, [checkAdmin]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-lime-500" size={32} />
      </div>
    );
  }

  if (!adminCtx) return null;

  const visibleTabs = ADMIN_TABS.filter((tab) => tab.roles.includes(adminCtx.role));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-8">
      <header className="mb-8">
        <Link
          to="/"
          className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-lime-600"
        >
          <ArrowLeft size={16} /> ホームに戻る
        </Link>
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-2.5 text-white shadow-xl shadow-slate-800/30">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800">管理者パネル</h1>
            <div className="mt-1 flex items-center gap-2">
              {adminCtx.role === 'super_admin' ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-700">
                  <Crown size={10} /> Super Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-black text-sky-700">
                  <Shield size={10} /> School Admin
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="-mx-4 mb-8 flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-black transition-all ${
                isActive
                  ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/20'
                  : 'border border-slate-100 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <Outlet context={adminCtx} />
    </div>
  );
};
