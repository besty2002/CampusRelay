import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Loader2,
  ScrollText,
  Filter,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Eye,
  Trash2,
  Ban,
  ShieldAlert,
  Shield,
  XCircle,
  CheckCircle,
  UserX,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

interface AdminContext {
  role: 'school_admin' | 'super_admin';
  adminSchoolIds: string[];
}

type AuditLogDetails = Record<string, string | number | boolean | null | undefined>;

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: AuditLogDetails;
  created_at: string;
  profiles: { display_name: string } | null;
}

interface ActionMeta {
  label: string;
  icon: LucideIcon;
  color: string;
}

const ACTION_LABELS: Record<string, ActionMeta> = {
  post_hide: { label: '投稿を非公開', icon: EyeOff, color: 'text-amber-600 bg-amber-50' },
  post_restore: { label: '投稿を復元', icon: Eye, color: 'text-emerald-600 bg-emerald-50' },
  post_delete: { label: '投稿を削除', icon: Trash2, color: 'text-red-600 bg-red-50' },
  user_ban: { label: 'ユーザーBAN', icon: Ban, color: 'text-red-600 bg-red-50' },
  user_unban: { label: 'BAN解除', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
  user_role_change: { label: 'ロール変更', icon: Shield, color: 'text-purple-600 bg-purple-50' },
  report_resolve: { label: '通報対応済み', icon: CheckCircle, color: 'text-lime-600 bg-lime-50' },
  report_dismiss: { label: '通報を却下', icon: XCircle, color: 'text-slate-500 bg-slate-50' },
  comment_hide: { label: 'コメントを非表示', icon: EyeOff, color: 'text-amber-600 bg-amber-50' },
  comment_delete: { label: 'コメントを削除', icon: Trash2, color: 'text-red-600 bg-red-50' },
  verification_grant: { label: '認証を付与', icon: ShieldAlert, color: 'text-lime-600 bg-lime-50' },
  verification_revoke: { label: '認証を解除', icon: UserX, color: 'text-red-600 bg-red-50' },
};

const PAGE_SIZE = 20;

export const AdminAuditLogPage = () => {
  const {} = useOutletContext<AdminContext>();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterTarget, setFilterTarget] = useState<string>('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('admin_audit_logs')
        .select(
          `
          *,
          profiles!admin_audit_logs_admin_id_fkey (display_name)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }
      if (filterTarget !== 'all') {
        query = query.eq('target_type', filterTarget);
      }

      const { data, count } = await query;
      setLogs((data as AuditLog[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Audit log fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterTarget]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatDetails = (details: AuditLogDetails) => {
    if (!details || Object.keys(details).length === 0) return null;

    return Object.entries(details)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(' | ');
  };

  return (
    <div>
      <h2 className="text-xl font-black text-slate-800 mb-6">監査ログ</h2>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-slate-200">
          <Filter size={14} className="text-slate-400" />
          <select
            value={filterAction}
            onChange={(event) => {
              setFilterAction(event.target.value);
              setPage(0);
            }}
            className="text-sm font-bold text-slate-600 bg-transparent focus:outline-none"
          >
            <option value="all">すべてのアクション</option>
            {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-slate-200">
          <select
            value={filterTarget}
            onChange={(event) => {
              setFilterTarget(event.target.value);
              setPage(0);
            }}
            className="text-sm font-bold text-slate-600 bg-transparent focus:outline-none"
          >
            <option value="all">すべての対象</option>
            <option value="post">投稿</option>
            <option value="user">ユーザー</option>
            <option value="comment">コメント</option>
            <option value="report">通報</option>
          </select>
        </div>
      </div>

      <p className="text-xs font-bold text-slate-400 mb-4">{totalCount} 件のログ</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-lime-500" size={28} />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
          <ScrollText className="mx-auto text-slate-200 mb-4" size={48} />
          <p className="text-slate-400 font-bold">監査ログはまだありません。</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <div className="col-span-2">日時</div>
            <div className="col-span-2">担当者</div>
            <div className="col-span-2">アクション</div>
            <div className="col-span-2">対象</div>
            <div className="col-span-4">詳細</div>
          </div>

          {logs.map((log) => {
            const actionInfo = ACTION_LABELS[log.action] || {
              label: log.action,
              icon: ScrollText,
              color: 'text-slate-500 bg-slate-50',
            };
            const Icon = actionInfo.icon;
            const detailStr = formatDetails(log.details);

            return (
              <div
                key={log.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors items-center"
              >
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-600">
                    {new Date(log.created_at).toLocaleDateString('ja-JP')}
                  </p>
                  <p className="text-[10px] text-slate-300 font-medium">
                    {new Date(log.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-700 truncate">{log.profiles?.display_name || '不明'}</p>
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${actionInfo.color}`}>
                    <Icon size={10} /> {actionInfo.label}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                    {log.target_type}
                  </span>
                  <p className="text-[10px] text-slate-300 mt-0.5 truncate font-mono">
                    {log.target_id.substring(0, 8)}...
                  </p>
                </div>
                <div className="col-span-4">
                  {detailStr ? (
                    <p className="text-[11px] text-slate-500 font-medium truncate" title={detailStr}>
                      {detailStr}
                    </p>
                  ) : (
                    <span className="text-[10px] text-slate-300">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-slate-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
