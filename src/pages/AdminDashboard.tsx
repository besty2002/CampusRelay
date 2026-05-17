import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  EyeOff,
  Loader2,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { useToast } from '../components/feedback/ToastProvider';

interface Report {
  id: string;
  post_id: string;
  reason: string;
  status: 'Pending' | 'Reviewed';
  created_at: string;
  posts: {
    title: string;
    status: string;
    user_id: string;
  };
  profiles: {
    display_name: string;
  };
}

type PendingResolve = {
  reportId: string;
  postId: string;
  action: 'hide' | 'ignore';
} | null;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingResolve, setPendingResolve] = useState<PendingResolve>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (user) {
      void checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    const { data, error } = await supabase.from('profiles').select('role').eq('id', user?.id).single();

    if (error) {
      showToast({
        tone: 'error',
        title: '管理者権限を確認できませんでした',
        description: error.message,
      });
      navigate('/');
      return;
    }

    if (data?.role === 'user') {
      showToast({
        tone: 'info',
        title: '管理者権限がありません',
      });
      navigate('/');
      return;
    }

    await fetchReports();
  };

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select(
        `
        *,
        posts (title, status, user_id),
        profiles (display_name)
      `
      )
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    if (error) {
      showToast({
        tone: 'error',
        title: '通報一覧を読み込めませんでした',
        description: error.message,
      });
    } else if (data) {
      setReports((data as Report[]) || []);
    }

    setLoading(false);
  };

  const handleResolveReport = async (reportId: string, postId: string, action: 'hide' | 'ignore') => {
    setResolving(true);
    try {
      if (action === 'hide') {
        const { error: postError } = await supabase.from('posts').update({ status: 'Hidden' }).eq('id', postId);
        if (postError) throw postError;
      }

      const { error: reportError } = await supabase
        .from('reports')
        .update({ status: 'Reviewed' })
        .eq('id', reportId);

      if (reportError) throw reportError;

      showToast({
        tone: 'success',
        title: action === 'hide' ? '投稿を非表示にしました' : '通報を確認済みにしました',
      });
      setPendingResolve(null);
      await fetchReports();
    } catch (error) {
      showToast({
        tone: 'error',
        title: '通報を処理できませんでした',
        description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
      });
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-lime-500" />
      </div>
    );
  }

  const confirmTitle =
    pendingResolve?.action === 'hide' ? '投稿を非表示にしますか？' : '通報を確認済みにしますか？';
  const confirmDescription =
    pendingResolve?.action === 'hide'
      ? 'この投稿は一般ユーザーに表示されなくなります。必要であれば後から管理画面で再確認できます。'
      : 'この通報は対応済みとして一覧から外れます。投稿自体はそのまま公開されます。';
  const confirmLabel = pendingResolve?.action === 'hide' ? '非表示にする' : '確認済みにする';
  const confirmTone = pendingResolve?.action === 'hide' ? 'danger' : 'default';

  return (
    <div className="mx-auto max-w-4xl p-6 pb-32 pt-12">
      <header className="mb-10">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-xl bg-lime-500 p-2 text-white shadow-lg shadow-lime-500/30">
            <ShieldAlert size={24} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Admin Dashboard</h1>
        </div>
        <p className="ml-1 font-medium text-slate-500">
          学校運営に必要な通報対応をここで確認できます。
        </p>
      </header>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-800">
            <AlertTriangle className="text-amber-500" size={20} />
            未対応の通報 ({reports.length})
          </h2>
        </div>

        {reports.length === 0 ? (
          <div className="rounded-[2.5rem] border-2 border-dashed border-slate-100 bg-white p-12 text-center">
            <CheckCircle className="mx-auto mb-4 text-lime-500" size={48} />
            <p className="font-bold text-slate-400">現在、対応が必要な通報はありません。</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      REASON
                    </span>
                    <p className="text-lg font-bold text-slate-800">{report.reason}</p>
                  </div>
                  <Link
                    to={`/post/${report.post_id}`}
                    className="flex items-center gap-1 text-xs font-black text-sky-600 hover:underline"
                  >
                    投稿を見る <ExternalLink size={14} />
                  </Link>
                </div>

                <div className="mb-6 rounded-2xl bg-slate-50 p-4">
                  <p className="mb-1 text-xs font-bold text-slate-400">対象の投稿</p>
                  <p className="font-black text-slate-700">{report.posts?.title}</p>
                  <p className="mt-1 text-[10px] text-slate-400">通報者: {report.profiles?.display_name}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPendingResolve({ reportId: report.id, postId: report.post_id, action: 'hide' })}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600"
                  >
                    <EyeOff size={18} /> 投稿を非表示にする
                  </button>
                  <button
                    onClick={() => setPendingResolve({ reportId: report.id, postId: report.post_id, action: 'ignore' })}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-800 py-3 font-bold text-white shadow-lg shadow-slate-800/20 transition-all hover:bg-black"
                  >
                    <XCircle size={18} /> 通報を確認済みにする
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={pendingResolve !== null}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        tone={confirmTone}
        onConfirm={() =>
          pendingResolve &&
          handleResolveReport(pendingResolve.reportId, pendingResolve.postId, pendingResolve.action)
        }
        onCancel={() => setPendingResolve(null)}
        busy={resolving}
      />
    </div>
  );
};
