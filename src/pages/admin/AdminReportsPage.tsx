import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  EyeOff,
  FileText,
  Filter,
  Loader2,
  Mail,
  MessageSquare,
  User,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/feedback/ToastProvider';
import { logger } from '../../lib/logger';

interface AdminContext {
  role: 'school_admin' | 'super_admin';
  adminSchoolIds: string[];
}

interface Report {
  id: string;
  post_id: string | null;
  target_user_id: string | null;
  comment_id: string | null;
  target_type: string;
  reporter_id: string;
  reason: string;
  category: string | null;
  status: 'Pending' | 'Reviewed';
  admin_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  posts?: { title: string; status: string } | null;
  profiles?: { display_name: string } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  spam: 'スパム',
  inappropriate: '不適切な内容',
  harassment: 'ハラスメント',
  fake: '虚偽・詐欺',
  prohibited: '禁止アイテム',
  other: 'その他',
};

const TARGET_ICONS: Record<string, typeof FileText> = {
  post: FileText,
  user: User,
  comment: MessageSquare,
};

const PAGE_SIZE = 15;

const COPY = {
  title: '通報管理',
  allStatuses: 'すべてのステータス',
  pending: '対応待ち',
  reviewed: '対応済み',
  allTargets: 'すべての対象',
  post: '投稿',
  user: 'ユーザー',
  comment: 'コメント',
  countSuffix: '件の通報',
  empty: '対応が必要な通報はありません。',
  reportedBy: '通報者',
  memo: 'メモ',
  action: '対応する',
  dismiss: '却下する',
  modalTitle: '通報への対応',
  modalPlaceholder: '管理メモを入力（任意）',
  hidePost: '投稿を非公開にする',
  hideComment: 'コメントを非表示にする',
  warnUser: '注意メッセージを送る',
  banUser: 'ユーザーを停止する',
  cancel: 'キャンセル',
  actionSuccess: '通報対応を記録しました',
  actionError: '操作に失敗しました',
  retry: 'もう一度お試しください。',
  postHiddenTitle: '投稿が非公開になりました',
  warningTitle: '注意メッセージが届いています',
  banTitle: 'アカウントが停止されました',
  warningFallback: '利用ルールをご確認ください。',
  anonymous: '不明',
} as const;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
};

export const AdminReportsPage = () => {
  const { role } = useOutletContext<AdminContext>();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('Pending');
  const [filterType, setFilterType] = useState<string>('all');
  const [actionModal, setActionModal] = useState<Report | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reports')
        .select(
          `
            *,
            posts (title, status),
            profiles!reports_reporter_id_fkey (display_name)
          `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filterStatus !== 'all') query = query.eq('status', filterStatus);
      if (filterType !== 'all') query = query.eq('target_type', filterType);

      const { data, count } = await query;
      setReports(((data as unknown) as Report[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      logger.error('Reports fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterType]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const handleAction = async (report: Report, action: 'hide' | 'ignore' | 'warn' | 'ban') => {
    if (!currentUser) return;

    try {
      if (action === 'hide' && report.post_id) {
        await supabase
          .from('posts')
          .update({
            status: 'Hidden',
            hidden_by: currentUser.id,
            hidden_at: new Date().toISOString(),
            admin_note: adminNote || undefined,
          })
          .eq('id', report.post_id);

        const { data: post } = await supabase.from('posts').select('user_id, title').eq('id', report.post_id).single();
        if (post) {
          await supabase.from('admin_notifications').insert({
            user_id: post.user_id,
            type: 'post_hidden',
            title: COPY.postHiddenTitle,
            message: `あなたの投稿「${post.title}」は通報対応により非公開になりました。${
              adminNote ? `理由: ${adminNote}` : ''
            }`,
          });
        }
      }

      if (action === 'hide' && report.comment_id) {
        await supabase
          .from('comments')
          .update({
            is_hidden: true,
            hidden_by: currentUser.id,
            hidden_at: new Date().toISOString(),
          })
          .eq('id', report.comment_id);
      }

      if (action === 'warn' && report.target_user_id) {
        await supabase.from('admin_notifications').insert({
          user_id: report.target_user_id,
          type: 'warning',
          title: COPY.warningTitle,
          message: adminNote || COPY.warningFallback,
        });
      }

      if (action === 'ban' && report.target_user_id) {
        await supabase
          .from('profiles')
          .update({
            is_banned: true,
            banned_at: new Date().toISOString(),
            ban_reason: adminNote || report.reason,
          })
          .eq('id', report.target_user_id);

        await supabase.from('admin_notifications').insert({
          user_id: report.target_user_id,
          type: 'ban',
          title: COPY.banTitle,
          message: `利用規約にもとづき、アカウントが停止されました。理由: ${adminNote || report.reason}`,
        });
      }

      await supabase
        .from('reports')
        .update({
          status: 'Reviewed',
          resolved_by: currentUser.id,
          resolved_at: new Date().toISOString(),
          admin_note: adminNote || null,
        })
        .eq('id', report.id);

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: action === 'ignore' ? 'report_dismiss' : 'report_resolve',
        target_type: 'report',
        target_id: report.id,
        details: { action, admin_note: adminNote, target_type: report.target_type },
      });

      showToast({ tone: 'success', title: COPY.actionSuccess });
      setActionModal(null);
      setAdminNote('');
      void fetchReports();
    } catch (error: unknown) {
      showToast({ tone: 'error', title: COPY.actionError, description: getErrorMessage(error, COPY.retry) });
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <h2 className="mb-6 text-xl font-black text-slate-800">{COPY.title}</h2>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
          <Filter size={14} className="text-slate-400" />
          <select
            value={filterStatus}
            onChange={(event) => {
              setFilterStatus(event.target.value);
              setPage(0);
            }}
            className="bg-transparent text-sm font-bold text-slate-600 focus:outline-none"
          >
            <option value="all">{COPY.allStatuses}</option>
            <option value="Pending">{COPY.pending}</option>
            <option value="Reviewed">{COPY.reviewed}</option>
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
          <select
            value={filterType}
            onChange={(event) => {
              setFilterType(event.target.value);
              setPage(0);
            }}
            className="bg-transparent text-sm font-bold text-slate-600 focus:outline-none"
          >
            <option value="all">{COPY.allTargets}</option>
            <option value="post">{COPY.post}</option>
            <option value="user">{COPY.user}</option>
            <option value="comment">{COPY.comment}</option>
          </select>
        </div>
      </div>

      <p className="mb-4 text-xs font-bold text-slate-400">
        {totalCount} {COPY.countSuffix}
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-lime-500" size={28} />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-[2.5rem] border-2 border-dashed border-slate-100 bg-white p-12 text-center">
          <CheckCircle className="mx-auto mb-4 text-lime-500" size={48} />
          <p className="font-bold text-slate-400">{COPY.empty}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => {
            const TargetIcon = TARGET_ICONS[report.target_type] || FileText;
            return (
              <div
                key={report.id}
                className={`rounded-[2rem] border bg-white p-6 shadow-sm transition-all ${
                  report.status === 'Pending' ? 'border-amber-200' : 'border-slate-100 opacity-70'
                }`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-xl p-2 ${
                        report.status === 'Pending' ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      <TargetIcon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider ${
                            report.status === 'Pending' ? 'text-amber-600' : 'text-slate-400'
                          }`}
                        >
                          {report.status === 'Pending' ? COPY.pending : COPY.reviewed}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300">
                          {report.target_type === 'post' ? COPY.post : report.target_type === 'user' ? COPY.user : COPY.comment}
                        </span>
                        {report.category && (
                          <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                            {CATEGORY_LABELS[report.category] || report.category}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-bold text-slate-800">{report.reason}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-slate-300">
                    {new Date(report.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>

                <div className="mb-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                    {report.posts && (
                      <Link to={`/post/${report.post_id}`} className="flex items-center gap-1 text-sky-600 hover:underline">
                        <ExternalLink size={12} /> {report.posts.title}
                      </Link>
                    )}
                    <span className="text-slate-400">
                      {COPY.reportedBy}: {report.profiles?.display_name || COPY.anonymous}
                    </span>
                  </div>
                  {report.admin_note && (
                    <p className="mt-2 text-xs italic text-slate-500">
                      {COPY.memo}: {report.admin_note}
                    </p>
                  )}
                </div>

                {report.status === 'Pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setActionModal(report);
                        setAdminNote('');
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600"
                    >
                      <EyeOff size={16} /> {COPY.action}
                    </button>
                    <button
                      onClick={() => void handleAction(report, 'ignore')}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-800 py-3 text-sm font-bold text-white shadow-lg shadow-slate-800/20 transition-all hover:bg-black"
                    >
                      <XCircle size={16} /> {COPY.dismiss}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-slate-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2.5rem] bg-white p-8 shadow-2xl">
            <h3 className="mb-2 text-xl font-black text-slate-800">{COPY.modalTitle}</h3>
            <p className="mb-6 text-sm font-medium text-slate-500">{actionModal.reason}</p>

            <textarea
              placeholder={COPY.modalPlaceholder}
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              className="mb-6 h-24 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lime-500/30"
            />

            <div className="grid gap-2">
              {actionModal.post_id && (
                <button
                  onClick={() => void handleAction(actionModal, 'hide')}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white transition-all hover:bg-red-600"
                >
                  <EyeOff size={16} /> {COPY.hidePost}
                </button>
              )}
              {actionModal.comment_id && (
                <button
                  onClick={() => void handleAction(actionModal, 'hide')}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3 text-sm font-bold text-white transition-all hover:bg-orange-600"
                >
                  <EyeOff size={16} /> {COPY.hideComment}
                </button>
              )}
              {(actionModal.target_user_id || actionModal.posts) && (
                <button
                  onClick={() => void handleAction(actionModal, 'warn')}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-sm font-bold text-white transition-all hover:bg-amber-600"
                >
                  <Mail size={16} /> {COPY.warnUser}
                </button>
              )}
              {role === 'super_admin' && actionModal.target_user_id && (
                <button
                  onClick={() => void handleAction(actionModal, 'ban')}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-700 py-3 text-sm font-bold text-white transition-all hover:bg-red-800"
                >
                  <Ban size={16} /> {COPY.banUser}
                </button>
              )}
              <button
                onClick={() => {
                  setActionModal(null);
                  setAdminNote('');
                }}
                className="w-full py-3 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
              >
                {COPY.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
