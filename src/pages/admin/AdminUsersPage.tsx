import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Ban, ChevronLeft, ChevronRight, ChevronRightIcon, Crown, Loader2, Search, Shield, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { UserAvatar } from '../../components/UserAvatar';
import { MannerTempGauge } from '../../components/MannerTempGauge';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { useToast } from '../../components/feedback/ToastProvider';

interface AdminContext {
  role: 'school_admin' | 'super_admin';
  adminSchoolIds: string[];
}

interface UserRow {
  id: string;
  display_name: string;
  avatar_url?: string;
  role: string;
  completed_count: number;
  avg_rating: number;
  manner_temp: number;
  email_verified: boolean;
  is_banned: boolean;
  created_at: string;
}

type BanTarget = {
  id: string;
  ban: boolean;
};

type RoleChangeTarget = {
  id: string;
  oldRole: string;
  newRole: string;
};

type VerificationTarget = {
  id: string;
  grant: boolean;
};

const PAGE_SIZE = 20;

const COPY = {
  title: 'ユーザー管理',
  searchPlaceholder: 'ユーザー名で検索...',
  allRoles: 'すべてのロール',
  allStates: 'すべての状態',
  active: 'アクティブ',
  banned: 'BAN中',
  noResults: '条件に合うユーザーが見つかりません。',
  countSuffix: '件のユーザー',
  completedCount: '取引完了',
  rating: '評価',
  signupDate: '登録日',
  roleChangeRestricted: 'ロール変更は Super Admin のみ実行できます。',
  roleChangeSuccess: 'ロールを変更しました',
  banSuccess: 'アカウントを停止しました',
  unbanSuccess: 'アカウント停止を解除しました',
  verificationGrantSuccess: '学校認証を付与しました',
  verificationRevokeSuccess: '学校認証を解除しました',
  actionError: '操作に失敗しました',
  banTitle: 'アカウントを停止しますか？',
  banDescription: '必要であれば理由を残して、このユーザーのアカウントを停止します。',
  banReasonPlaceholder: '停止理由を入力してください',
  banConfirm: '停止する',
  unbanTitle: 'アカウント停止を解除しますか？',
  unbanDescription: '解除すると、このユーザーは再びサービスを利用できます。',
  unbanConfirm: '解除する',
  roleChangeTitle: 'ロールを変更しますか？',
  roleChangeConfirm: '変更する',
  verificationGrantTitle: '学校認証を付与しますか？',
  verificationRevokeTitle: '学校認証を解除しますか？',
  verificationGrantDescription: 'このユーザーを管理画面で学校認証済みにします。',
  verificationRevokeDescription: 'このユーザーの学校認証状態を解除します。',
  verificationGrantConfirm: '付与する',
  verificationRevokeConfirm: '解除する',
  bannedBadge: 'BAN',
  retry: 'もう一度お試しください。',
  cancel: 'キャンセル',
  banNoticeTitle: 'アカウントが停止されました',
  unbanNoticeTitle: 'アカウント停止が解除されました',
  unbanNoticeMessage: 'アカウント停止が解除されました。サービスを再び利用できます。',
} as const;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
};

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  school_admin: 'School Admin',
  super_admin: 'Super Admin',
};

export const AdminUsersPage = () => {
  const { role } = useOutletContext<AdminContext>();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterBanned, setFilterBanned] = useState<string>('all');
  const [banTarget, setBanTarget] = useState<BanTarget | null>(null);
  const [banReason, setBanReason] = useState('');
  const [roleChangeTarget, setRoleChangeTarget] = useState<RoleChangeTarget | null>(null);
  const [verificationTarget, setVerificationTarget] = useState<VerificationTarget | null>(null);
  const [busyAction, setBusyAction] = useState<'ban' | 'role' | 'verify' | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (searchQuery.trim()) query = query.ilike('display_name', `%${searchQuery.trim()}%`);
      if (filterRole !== 'all') query = query.eq('role', filterRole);
      if (filterBanned === 'banned') query = query.eq('is_banned', true);
      else if (filterBanned === 'active') query = query.or('is_banned.is.null,is_banned.eq.false');

      const { data, count } = await query;
      setUsers(((data as unknown) as UserRow[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Users fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterRole, filterBanned]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const confirmBanChange = async () => {
    if (!currentUser || !banTarget) return;
    setBusyAction('ban');
    try {
      const reason = banTarget.ban ? banReason.trim() || null : null;

      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: banTarget.ban,
          banned_at: banTarget.ban ? new Date().toISOString() : null,
          ban_reason: reason,
        })
        .eq('id', banTarget.id);

      if (error) throw error;

      if (banTarget.ban) {
        await supabase
          .from('posts')
          .update({ status: 'Hidden', hidden_by: currentUser.id, hidden_at: new Date().toISOString() })
          .eq('user_id', banTarget.id)
          .neq('status', 'Hidden');
      }

      await supabase.from('admin_notifications').insert({
        user_id: banTarget.id,
        type: banTarget.ban ? 'ban' : 'unban',
        title: banTarget.ban ? COPY.banNoticeTitle : COPY.unbanNoticeTitle,
        message: banTarget.ban
          ? `利用規約にもとづき、アカウントが停止されました。${reason ? `理由: ${reason}` : ''}`
          : COPY.unbanNoticeMessage,
      });

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: banTarget.ban ? 'user_ban' : 'user_unban',
        target_type: 'user',
        target_id: banTarget.id,
        details: banTarget.ban ? { reason } : {},
      });

      showToast({ tone: 'success', title: banTarget.ban ? COPY.banSuccess : COPY.unbanSuccess });
      setBanTarget(null);
      setBanReason('');
      void fetchUsers();
    } catch (error: unknown) {
      showToast({ tone: 'error', title: COPY.actionError, description: getErrorMessage(error, COPY.retry) });
    } finally {
      setBusyAction(null);
    }
  };

  const requestRoleChange = (userId: string, newRole: string) => {
    if (role !== 'super_admin') {
      showToast({ tone: 'info', title: COPY.roleChangeRestricted });
      return;
    }
    const targetUser = users.find((item) => item.id === userId);
    if (!targetUser || targetUser.role === newRole) return;
    setRoleChangeTarget({ id: userId, oldRole: targetUser.role, newRole });
  };

  const confirmRoleChange = async () => {
    if (!currentUser || !roleChangeTarget) return;
    setBusyAction('role');
    try {
      const { error } = await supabase.from('profiles').update({ role: roleChangeTarget.newRole }).eq('id', roleChangeTarget.id);
      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'user_role_change',
        target_type: 'user',
        target_id: roleChangeTarget.id,
        details: { old_role: roleChangeTarget.oldRole, new_role: roleChangeTarget.newRole },
      });

      showToast({ tone: 'success', title: COPY.roleChangeSuccess });
      setRoleChangeTarget(null);
      void fetchUsers();
    } catch (error: unknown) {
      showToast({ tone: 'error', title: COPY.actionError, description: getErrorMessage(error, COPY.retry) });
    } finally {
      setBusyAction(null);
    }
  };

  const confirmVerification = async () => {
    if (!currentUser || !verificationTarget) return;
    setBusyAction('verify');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          email_verified: verificationTarget.grant,
          verified_school_domain: verificationTarget.grant ? 'manual-admin' : null,
        })
        .eq('id', verificationTarget.id);

      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: verificationTarget.grant ? 'verification_grant' : 'verification_revoke',
        target_type: 'user',
        target_id: verificationTarget.id,
      });

      showToast({
        tone: 'success',
        title: verificationTarget.grant ? COPY.verificationGrantSuccess : COPY.verificationRevokeSuccess,
      });
      setVerificationTarget(null);
      void fetchUsers();
    } catch (error: unknown) {
      showToast({ tone: 'error', title: COPY.actionError, description: getErrorMessage(error, COPY.retry) });
    } finally {
      setBusyAction(null);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getRoleBadge = (userRole: string) => {
    if (userRole === 'super_admin') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
          <Crown size={10} /> Super
        </span>
      );
    }
    if (userRole === 'school_admin') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700">
          <Shield size={10} /> School
        </span>
      );
    }
    return <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-500">User</span>;
  };

  return (
    <>
      <div>
        <h2 className="mb-6 text-xl font-black text-slate-800">{COPY.title}</h2>

        <div className="mb-6 flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={COPY.searchPlaceholder}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(0);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium transition-all focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-500/30"
            />
          </div>

          <select
            value={filterRole}
            onChange={(event) => {
              setFilterRole(event.target.value);
              setPage(0);
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/30"
          >
            <option value="all">{COPY.allRoles}</option>
            <option value="user">{ROLE_LABELS.user}</option>
            <option value="school_admin">{ROLE_LABELS.school_admin}</option>
            <option value="super_admin">{ROLE_LABELS.super_admin}</option>
          </select>

          <select
            value={filterBanned}
            onChange={(event) => {
              setFilterBanned(event.target.value);
              setPage(0);
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/30"
          >
            <option value="all">{COPY.allStates}</option>
            <option value="active">{COPY.active}</option>
            <option value="banned">{COPY.banned}</option>
          </select>
        </div>

        <p className="mb-4 text-xs font-bold text-slate-400">
          {totalCount} {COPY.countSuffix}
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-lime-500" size={28} />
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-[2.5rem] border-2 border-dashed border-slate-100 bg-white p-12 text-center">
            <p className="font-bold text-slate-400">{COPY.noResults}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {users.map((targetUser) => (
              <div
                key={targetUser.id}
                className={`rounded-[2rem] border bg-white p-5 shadow-sm transition-all ${
                  targetUser.is_banned ? 'border-red-200 bg-red-50/30' : 'border-slate-100 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Link to={`/user/${targetUser.id}`}>
                    <UserAvatar avatarUrl={targetUser.avatar_url} displayName={targetUser.display_name} size="md" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/user/${targetUser.id}`} className="font-black text-slate-800 transition-colors hover:text-lime-600">
                        {targetUser.display_name}
                      </Link>
                      {getRoleBadge(targetUser.role)}
                      <VerifiedBadge verified={targetUser.email_verified} size="sm" />
                      {targetUser.is_banned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600">
                          <Ban size={10} /> {COPY.bannedBadge}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-4 text-xs font-medium text-slate-400">
                      <span>
                        {COPY.completedCount} {targetUser.completed_count}件
                      </span>
                      <span>
                        {COPY.rating} {targetUser.avg_rating}
                      </span>
                      <MannerTempGauge temp={targetUser.manner_temp ?? 36.5} size="sm" />
                    </div>

                    <p className="mt-1 text-[10px] text-slate-300">
                      {COPY.signupDate}: {new Date(targetUser.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {role === 'super_admin' && targetUser.id !== currentUser?.id && (
                      <>
                        <select
                          value={targetUser.role}
                          onChange={(event) => requestRoleChange(targetUser.id, event.target.value)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-lime-500/30"
                        >
                          <option value="user">{ROLE_LABELS.user}</option>
                          <option value="school_admin">{ROLE_LABELS.school_admin}</option>
                          <option value="super_admin">{ROLE_LABELS.super_admin}</option>
                        </select>

                        <button
                          onClick={() => setVerificationTarget({ id: targetUser.id, grant: !targetUser.email_verified })}
                          className={`rounded-xl p-2 text-xs font-bold transition-all ${
                            targetUser.email_verified
                              ? 'bg-lime-50 text-lime-600 hover:bg-lime-100'
                              : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                          }`}
                          title={targetUser.email_verified ? '認証を解除する' : '認証を付与する'}
                        >
                          <ShieldAlert size={16} />
                        </button>
                      </>
                    )}

                    {targetUser.id !== currentUser?.id && (
                      <button
                        onClick={() => {
                          setBanTarget({ id: targetUser.id, ban: !targetUser.is_banned });
                          setBanReason('');
                        }}
                        className={`rounded-xl p-2 text-xs font-bold transition-all ${
                          targetUser.is_banned
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-500 hover:bg-red-100'
                        }`}
                        title={targetUser.is_banned ? COPY.unbanConfirm : COPY.banConfirm}
                      >
                        <Ban size={16} />
                      </button>
                    )}

                    <Link to={`/user/${targetUser.id}`} className="rounded-xl bg-slate-50 p-2 text-slate-400 transition-all hover:bg-slate-100">
                      <ChevronRightIcon size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-bold text-slate-500">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {banTarget?.ban && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl">
            <h3 className="mb-3 text-lg font-black text-slate-800">{COPY.banTitle}</h3>
            <p className="mb-4 text-sm font-medium leading-6 text-slate-500">{COPY.banDescription}</p>
            <textarea
              value={banReason}
              onChange={(event) => setBanReason(event.target.value)}
              placeholder={COPY.banReasonPlaceholder}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none transition-all focus:border-lime-400 focus:ring-2 focus:ring-lime-500/20"
            />
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setBanTarget(null);
                  setBanReason('');
                }}
                disabled={busyAction === 'ban'}
                className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:opacity-60"
              >
                {COPY.cancel}
              </button>
              <button
                type="button"
                onClick={confirmBanChange}
                disabled={busyAction === 'ban'}
                className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 disabled:opacity-60"
              >
                {COPY.banConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={banTarget?.ban === false}
        title={COPY.unbanTitle}
        description={COPY.unbanDescription}
        confirmLabel={COPY.unbanConfirm}
        cancelLabel={COPY.cancel}
        busy={busyAction === 'ban'}
        onCancel={() => setBanTarget(null)}
        onConfirm={confirmBanChange}
      />

      <ConfirmDialog
        isOpen={roleChangeTarget !== null}
        title={COPY.roleChangeTitle}
        description={
          roleChangeTarget
            ? `ロールを「${roleChangeTarget.oldRole}」から「${roleChangeTarget.newRole}」へ変更します。`
            : ''
        }
        confirmLabel={COPY.roleChangeConfirm}
        cancelLabel={COPY.cancel}
        busy={busyAction === 'role'}
        onCancel={() => setRoleChangeTarget(null)}
        onConfirm={confirmRoleChange}
      />

      <ConfirmDialog
        isOpen={verificationTarget !== null}
        title={verificationTarget?.grant ? COPY.verificationGrantTitle : COPY.verificationRevokeTitle}
        description={verificationTarget?.grant ? COPY.verificationGrantDescription : COPY.verificationRevokeDescription}
        confirmLabel={verificationTarget?.grant ? COPY.verificationGrantConfirm : COPY.verificationRevokeConfirm}
        cancelLabel={COPY.cancel}
        busy={busyAction === 'verify'}
        onCancel={() => setVerificationTarget(null)}
        onConfirm={confirmVerification}
      />
    </>
  );
};
