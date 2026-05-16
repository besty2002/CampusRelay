import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  Loader2,
  ExternalLink,
  EyeOff,
  XCircle,
  Ban,
  Mail,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Filter,
  MessageSquare,
  User,
  FileText,
} from 'lucide-react';

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
  inappropriate: '不適切なコンテンツ',
  harassment: 'ハラスメント',
  fake: '偽情報',
  prohibited: '禁止されたアイテム',
  other: 'その他',
};

const TARGET_ICONS: Record<string, typeof FileText> = {
  post: FileText,
  user: User,
  comment: MessageSquare,
};

const PAGE_SIZE = 15;

export const AdminReportsPage = () => {
  const { role } = useOutletContext<AdminContext>();
  const { user: currentUser } = useAuth();
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
        .select(`
          *,
          posts (title, status),
          profiles!reports_reporter_id_fkey (display_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (filterType !== 'all') {
        query = query.eq('target_type', filterType);
      }

      const { data, count } = await query;
      setReports((data as any[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterType]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleAction = async (report: Report, action: 'hide' | 'ignore' | 'warn' | 'ban') => {
    if (!currentUser) return;

    try {
      // 1. Execute action
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

        // Notify post owner
        const { data: post } = await supabase
          .from('posts')
          .select('user_id, title')
          .eq('id', report.post_id)
          .single();

        if (post) {
          await supabase.from('admin_notifications').insert({
            user_id: post.user_id,
            type: 'post_hidden',
            title: '投稿が非表示になりました',
            message: `あなたの投稿「${post.title}」が利用規約に基づき非表示になりました。${adminNote ? `理由: ${adminNote}` : ''}`,
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
          title: '利用規約に関する警告',
          message: `管理者からの警告です。${adminNote || '利用規約を確認してください。'}`,
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
          title: 'アカウントが停止されました',
          message: `利用規約違反のため、アカウントが停止されました。理由: ${adminNote || report.reason}`,
        });
      }

      // 2. Update report
      await supabase
        .from('reports')
        .update({
          status: 'Reviewed',
          resolved_by: currentUser.id,
          resolved_at: new Date().toISOString(),
          admin_note: adminNote || null,
        })
        .eq('id', report.id);

      // 3. Audit log
      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: action === 'ignore' ? 'report_dismiss' : 'report_resolve',
        target_type: 'report',
        target_id: report.id,
        details: { action, admin_note: adminNote, target_type: report.target_type },
      });

      setActionModal(null);
      setAdminNote('');
      fetchReports();
    } catch (err: any) {
      alert('操作に失敗しました: ' + err.message);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <h2 className="text-xl font-black text-slate-800 mb-6">通報管理</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-slate-200">
          <Filter size={14} className="text-slate-400" />
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
            className="text-sm font-bold text-slate-600 bg-transparent focus:outline-none"
          >
            <option value="all">全ステータス</option>
            <option value="Pending">処理待ち</option>
            <option value="Reviewed">処理済み</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-slate-200">
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(0); }}
            className="text-sm font-bold text-slate-600 bg-transparent focus:outline-none"
          >
            <option value="all">全種別</option>
            <option value="post">投稿</option>
            <option value="user">ユーザー</option>
            <option value="comment">コメント</option>
          </select>
        </div>
      </div>

      <p className="text-xs font-bold text-slate-400 mb-4">{totalCount} 件の通報</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-lime-500" size={28} />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
          <CheckCircle className="mx-auto text-lime-500 mb-4" size={48} />
          <p className="text-slate-400 font-bold">処理が必要な通報はありません。</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map(report => {
            const TargetIcon = TARGET_ICONS[report.target_type] || FileText;
            return (
              <div
                key={report.id}
                className={`bg-white p-6 rounded-[2rem] shadow-sm border transition-all ${
                  report.status === 'Pending' ? 'border-amber-200' : 'border-slate-100 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      report.status === 'Pending' ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'
                    }`}>
                      <TargetIcon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          report.status === 'Pending' ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          {report.status === 'Pending' ? '処理待ち' : '処理済み'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300">
                          {report.target_type === 'post' ? '投稿' : report.target_type === 'user' ? 'ユーザー' : 'コメント'}
                        </span>
                        {report.category && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                            {CATEGORY_LABELS[report.category] || report.category}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-800 mt-1">{report.reason}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 shrink-0">
                    {new Date(report.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl mb-4">
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                    {report.posts && (
                      <Link
                        to={`/post/${report.post_id}`}
                        className="flex items-center gap-1 text-sky-600 hover:underline"
                      >
                        <ExternalLink size={12} /> {report.posts.title}
                      </Link>
                    )}
                    <span className="text-slate-400">
                      通報者: {report.profiles?.display_name || '不明'}
                    </span>
                  </div>
                  {report.admin_note && (
                    <p className="text-xs text-slate-500 mt-2 italic">メモ: {report.admin_note}</p>
                  )}
                </div>

                {report.status === 'Pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setActionModal(report); setAdminNote(''); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 text-sm"
                    >
                      <EyeOff size={16} /> 対応する
                    </button>
                    <button
                      onClick={() => handleAction(report, 'ignore')}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-800/20 text-sm"
                    >
                      <XCircle size={16} /> 棄却
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-slate-500">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-2">通報への対応</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">{actionModal.reason}</p>

            <textarea
              placeholder="管理者メモ（任意）"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-medium resize-none h-24 focus:outline-none focus:ring-2 focus:ring-lime-500/30 mb-6"
            />

            <div className="grid gap-2">
              {actionModal.post_id && (
                <button
                  onClick={() => handleAction(actionModal, 'hide')}
                  className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-2xl font-bold hover:bg-red-600 transition-all text-sm"
                >
                  <EyeOff size={16} /> 投稿を非表示
                </button>
              )}
              {actionModal.comment_id && (
                <button
                  onClick={() => handleAction(actionModal, 'hide')}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-2xl font-bold hover:bg-orange-600 transition-all text-sm"
                >
                  <EyeOff size={16} /> コメントを非表示
                </button>
              )}
              {(actionModal.target_user_id || actionModal.posts) && (
                <button
                  onClick={() => handleAction(actionModal, 'warn')}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-2xl font-bold hover:bg-amber-600 transition-all text-sm"
                >
                  <Mail size={16} /> 警告を送信
                </button>
              )}
              {role === 'super_admin' && actionModal.target_user_id && (
                <button
                  onClick={() => handleAction(actionModal, 'ban')}
                  className="w-full flex items-center justify-center gap-2 bg-red-700 text-white py-3 rounded-2xl font-bold hover:bg-red-800 transition-all text-sm"
                >
                  <Ban size={16} /> ユーザーをBAN
                </button>
              )}
              <button
                onClick={() => { setActionModal(null); setAdminNote(''); }}
                className="w-full py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors text-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
