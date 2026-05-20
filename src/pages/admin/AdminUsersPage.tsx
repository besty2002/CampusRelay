import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Ban,
  Bookmark,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  Crown,
  Loader2,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  UsersRound,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { UserAvatar } from '../../components/UserAvatar';
import { MannerTempGauge } from '../../components/MannerTempGauge';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { useToast } from '../../components/feedback/ToastProvider';
import { logger } from '../../lib/logger';

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

type BulkActionTarget = {
  action: 'ban' | 'unban' | 'verify' | 'unverify';
  ids: string[];
};

type VerificationFilter = 'all' | 'verified' | 'unverified';

const PAGE_SIZE = 20;
const FILTER_STORAGE_KEY = 'campusrelay:admin-users-filters';

const COPY = {
  title: 'ユーザー管理',
  searchPlaceholder: 'ユーザー名で検索...',
  allRoles: 'すべてのロール',
  allStates: 'すべての状態',
  allVerification: '認証状態すべて',
  active: 'アクティブ',
  banned: 'BAN中',
  verified: '認証済み',
  unverified: '未認証',
  noResults: '条件に合うユーザーが見つかりません。',
  countSuffix: '件のユーザー',
  completedCount: '完了取引',
  rating: '評価',
  signupDate: '登録日',
  roleChangeRestricted: 'ロール変更は Super Admin のみ可能です。',
  roleChangeSuccess: 'ロールを変更しました',
  banSuccess: 'アカウントを停止しました',
  unbanSuccess: 'アカウント停止を解除しました',
  verificationGrantSuccess: '学校認証を付与しました',
  verificationRevokeSuccess: '学校認証を解除しました',
  actionError: '操作に失敗しました',
  banTitle: 'アカウントを停止しますか？',
  banDescription: '必要であれば理由を残して、このユーザーのアカウントを停止します。',
  banReasonPlaceholder: '停止理由を入力してください',
  banConfirm: 'BANする',
  unbanTitle: 'アカウント停止を解除しますか？',
  unbanDescription: '解除すると、このユーザーは再びサービスを利用できます。',
  unbanConfirm: '解除する',
  roleChangeTitle: 'ロールを変更しますか？',
  roleChangeConfirm: '変更する',
  verificationGrantTitle: '学校認証を付与しますか？',
  verificationRevokeTitle: '学校認証を解除しますか？',
  verificationGrantDescription: 'このユーザーを手動で学校認証済みにします。',
  verificationRevokeDescription: 'このユーザーの学校認証状態を解除します。',
  verificationGrantConfirm: '付与する',
  verificationRevokeConfirm: '解除する',
  bannedBadge: 'BAN',
  retry: 'もう一度お試しください。',
  cancel: 'キャンセル',
  banNoticeTitle: 'アカウントが停止されました',
  unbanNoticeTitle: 'アカウント停止が解除されました',
  unbanNoticeMessage: 'アカウント停止が解除されました。サービスを再び利用できます。',
  quickViews: 'クイック表示',
  clearFilters: '条件をリセット',
  saveFilters: 'この条件を保存',
  savedFilters: '前回の条件を復元しました',
  selectedUsers: '選択中',
  visibleUsers: '表示中',
  allVisibleSelect: '表示中のユーザーをまとめて選択',
  clearVisibleSelect: '表示中の選択を解除',
  bulkVerify: '一括認証',
  bulkUnverify: '認証解除',
  bulkBan: '一括BAN',
  bulkBanTitle: '選択したユーザーを一括で停止しますか？',
  bulkBanDescriptionPrefix: '選択した',
  bulkBanDescriptionSuffix: '人を一括で停止します。必要であれば理由も残せます。',
  bulkVerifyTitle: '選択したユーザーを認証済みにしますか？',
  bulkVerifyDescriptionPrefix: '選択した',
  bulkVerifyDescriptionSuffix: '人をまとめて認証済みにします。',
  bulkUnverifyTitle: '選択したユーザーの認証を解除しますか？',
  bulkUnverifyDescriptionPrefix: '選択した',
  bulkUnverifyDescriptionSuffix: '人の学校認証をまとめて解除します。',
  bulkVerifyConfirm: '認証する',
  bulkUnverifyConfirm: '認証解除',
  verificationToggleOn: '認証を付与する',
  verificationToggleOff: '認証を解除する',
  checkboxSuffix: 'を選択',
  completedSuffix: '件',
  quickAll: '全体',
  quickSchoolAdmins: '学校管理者',
  quickUnverified: '未認証',
  quickBanned: 'BAN中',
} as const;

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  school_admin: 'School Admin',
  super_admin: 'Super Admin',
};

const QUICK_FILTERS = [
  { key: 'all', label: COPY.quickAll, role: 'all', banned: 'all', verification: 'all' as VerificationFilter },
  { key: 'school_admin', label: COPY.quickSchoolAdmins, role: 'school_admin', banned: 'all', verification: 'all' as VerificationFilter },
  { key: 'unverified', label: COPY.quickUnverified, role: 'all', banned: 'all', verification: 'unverified' as VerificationFilter },
  { key: 'banned', label: COPY.quickBanned, role: 'all', banned: 'banned', verification: 'all' as VerificationFilter },
] as const;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
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
  const [filterVerification, setFilterVerification] = useState<VerificationFilter>('all');
  const [banTarget, setBanTarget] = useState<BanTarget | null>(null);
  const [banReason, setBanReason] = useState('');
  const [roleChangeTarget, setRoleChangeTarget] = useState<RoleChangeTarget | null>(null);
  const [verificationTarget, setVerificationTarget] = useState<VerificationTarget | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkActionTarget, setBulkActionTarget] = useState<BulkActionTarget | null>(null);
  const [busyAction, setBusyAction] = useState<'ban' | 'role' | 'verify' | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as {
        searchQuery?: string;
        filterRole?: string;
        filterBanned?: string;
        filterVerification?: VerificationFilter;
      };

      if (typeof parsed.searchQuery === 'string') setSearchQuery(parsed.searchQuery);
      if (typeof parsed.filterRole === 'string') setFilterRole(parsed.filterRole);
      if (typeof parsed.filterBanned === 'string') setFilterBanned(parsed.filterBanned);
      if (parsed.filterVerification === 'all' || parsed.filterVerification === 'verified' || parsed.filterVerification === 'unverified') {
        setFilterVerification(parsed.filterVerification);
      }
    } catch {
      window.localStorage.removeItem(FILTER_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify({
        searchQuery,
        filterRole,
        filterBanned,
        filterVerification,
      })
    );
  }, [searchQuery, filterRole, filterBanned, filterVerification]);

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
      if (filterVerification === 'verified') query = query.eq('email_verified', true);
      if (filterVerification === 'unverified') query = query.or('email_verified.is.null,email_verified.eq.false');

      const { data, count } = await query;
      setUsers(((data as unknown) as UserRow[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      logger.error('admin.users.fetch', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterRole, filterBanned, filterVerification]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setSelectedUserIds((current) => current.filter((id) => users.some((user) => user.id === id)));
  }, [users]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = users.filter((targetUser) => targetUser.id !== currentUser?.id).map((targetUser) => targetUser.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedUserIds.includes(id));
    setSelectedUserIds(allVisibleSelected ? [] : visibleIds);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterRole('all');
    setFilterBanned('all');
    setFilterVerification('all');
    setPage(0);
  };

  const applyQuickFilter = (quickFilter: (typeof QUICK_FILTERS)[number]) => {
    setFilterRole(quickFilter.role);
    setFilterBanned(quickFilter.banned);
    setFilterVerification(quickFilter.verification);
    setSearchQuery('');
    setPage(0);
  };

  const saveCurrentFilters = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({
          searchQuery,
          filterRole,
          filterBanned,
          filterVerification,
        })
      );
    }
    showToast({ tone: 'success', title: COPY.savedFilters });
  };

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
          ? `利用制限によりアカウントが停止されました。${reason ? `理由: ${reason}` : ''}`
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

  const confirmBulkAction = async () => {
    if (!currentUser || !bulkActionTarget || bulkActionTarget.ids.length === 0) return;

    const targetIds = bulkActionTarget.ids;
    setBusyAction(bulkActionTarget.action === 'ban' || bulkActionTarget.action === 'unban' ? 'ban' : 'verify');

    try {
      if (bulkActionTarget.action === 'ban' || bulkActionTarget.action === 'unban') {
        const isBan = bulkActionTarget.action === 'ban';
        const reason = isBan ? banReason.trim() || null : null;

        const { error } = await supabase
          .from('profiles')
          .update({
            is_banned: isBan,
            banned_at: isBan ? new Date().toISOString() : null,
            ban_reason: reason,
          })
          .in('id', targetIds);

        if (error) throw error;

        if (isBan) {
          await supabase
            .from('posts')
            .update({ status: 'Hidden', hidden_by: currentUser.id, hidden_at: new Date().toISOString() })
            .in('user_id', targetIds)
            .neq('status', 'Hidden');
        }

        showToast({
          tone: 'success',
          title: isBan
            ? `選択した ${targetIds.length} 人を一括で停止しました`
            : `選択した ${targetIds.length} 人の停止を解除しました`,
        });
      } else {
        const grant = bulkActionTarget.action === 'verify';
        const { error } = await supabase
          .from('profiles')
          .update({
            email_verified: grant,
            verified_school_domain: grant ? 'manual-admin' : null,
          })
          .in('id', targetIds);

        if (error) throw error;

        showToast({
          tone: 'success',
          title: grant
            ? `選択した ${targetIds.length} 人を認証済みにしました`
            : `選択した ${targetIds.length} 人の認証を解除しました`,
        });
      }

      setSelectedUserIds([]);
      setBulkActionTarget(null);
      setBanReason('');
      void fetchUsers();
    } catch (error: unknown) {
      showToast({ tone: 'error', title: COPY.actionError, description: getErrorMessage(error, COPY.retry) });
    } finally {
      setBusyAction(null);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const selectableUsers = users.filter((targetUser) => targetUser.id !== currentUser?.id);
  const allVisibleSelected = selectableUsers.length > 0 && selectableUsers.every((targetUser) => selectedUserIds.includes(targetUser.id));
  const activeFilterCount = [Boolean(searchQuery.trim()), filterRole !== 'all', filterBanned !== 'all', filterVerification !== 'all'].filter(Boolean).length;

  const activeQuickFilterKey = useMemo(() => {
    const matched = QUICK_FILTERS.find(
      (item) => item.role === filterRole && item.banned === filterBanned && item.verification === filterVerification && !searchQuery.trim()
    );
    return matched?.key ?? null;
  }, [filterBanned, filterRole, filterVerification, searchQuery]);

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
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800">{COPY.title}</h2>
            <p className="mt-1 text-sm font-medium text-slate-400">
              {totalCount} {COPY.countSuffix}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <span className="inline-flex items-center gap-2 text-xs font-black text-slate-500">
              <UsersRound size={14} />
              {COPY.visibleUsers} {users.length}名
            </span>
            <span className="text-slate-200">|</span>
            <span className="inline-flex items-center gap-2 text-xs font-black text-slate-500">
              <CheckSquare size={14} />
              {COPY.selectedUsers} {selectedUserIds.length}名
            </span>
            <span className="text-slate-200">|</span>
            <span className="inline-flex items-center gap-2 text-xs font-black text-slate-500">
              <Bookmark size={14} />
              条件 {activeFilterCount}件
            </span>
          </div>
        </div>

        <div className="mb-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{COPY.quickViews}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveCurrentFilters}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 transition-colors hover:bg-slate-200"
              >
                {COPY.saveFilters}
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 transition-colors hover:bg-slate-200"
              >
                <RotateCcw size={12} />
                {COPY.clearFilters}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((quickFilter) => (
              <button
                key={quickFilter.key}
                type="button"
                onClick={() => applyQuickFilter(quickFilter)}
                className={`rounded-full px-3 py-2 text-xs font-black transition-colors ${
                  activeQuickFilterKey === quickFilter.key
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {quickFilter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
          <div className="relative min-w-[200px]">
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

          <select
            value={filterVerification}
            onChange={(event) => {
              setFilterVerification(event.target.value as VerificationFilter);
              setPage(0);
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/30"
          >
            <option value="all">{COPY.allVerification}</option>
            <option value="verified">{COPY.verified}</option>
            <option value="unverified">{COPY.unverified}</option>
          </select>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={toggleSelectAllVisible}
            className="inline-flex items-center gap-2 text-sm font-black text-slate-600 transition-colors hover:text-lime-600"
          >
            <CheckSquare size={16} />
            {allVisibleSelected ? COPY.clearVisibleSelect : COPY.allVisibleSelect}
          </button>

          {selectedUserIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-400">
                {COPY.selectedUsers} {selectedUserIds.length}名
              </span>
              <button
                type="button"
                onClick={() => setBulkActionTarget({ action: 'verify', ids: selectedUserIds })}
                className="rounded-xl bg-lime-50 px-3 py-2 text-xs font-black text-lime-700 transition-colors hover:bg-lime-100"
              >
                {COPY.bulkVerify}
              </button>
              <button
                type="button"
                onClick={() => setBulkActionTarget({ action: 'unverify', ids: selectedUserIds })}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition-colors hover:bg-slate-200"
              >
                {COPY.bulkUnverify}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBulkActionTarget({ action: 'ban', ids: selectedUserIds });
                  setBanReason('');
                }}
                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition-colors hover:bg-red-100"
              >
                {COPY.bulkBan}
              </button>
            </div>
          )}
        </div>

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
                  {targetUser.id !== currentUser?.id && (
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(targetUser.id)}
                      onChange={() => toggleUserSelection(targetUser.id)}
                      aria-label={`${targetUser.display_name} ${COPY.checkboxSuffix}`}
                      className="h-4 w-4 rounded border-slate-300 text-lime-500 focus:ring-lime-500"
                    />
                  )}
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
                        {COPY.completedCount} {targetUser.completed_count}
                        {COPY.completedSuffix}
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
                          title={targetUser.email_verified ? COPY.verificationToggleOff : COPY.verificationToggleOn}
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

      {bulkActionTarget?.action === 'ban' && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl">
            <h3 className="mb-3 text-lg font-black text-slate-800">{COPY.bulkBanTitle}</h3>
            <p className="mb-4 text-sm font-medium leading-6 text-slate-500">
              {COPY.bulkBanDescriptionPrefix} {bulkActionTarget.ids.length} {COPY.bulkBanDescriptionSuffix}
            </p>
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
                  setBulkActionTarget(null);
                  setBanReason('');
                }}
                disabled={busyAction === 'ban'}
                className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:opacity-60"
              >
                {COPY.cancel}
              </button>
              <button
                type="button"
                onClick={confirmBulkAction}
                disabled={busyAction === 'ban'}
                className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 disabled:opacity-60"
              >
                {COPY.bulkBan}
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

      <ConfirmDialog
        isOpen={bulkActionTarget?.action === 'unverify'}
        title={COPY.bulkUnverifyTitle}
        description={
          bulkActionTarget ? `${COPY.bulkUnverifyDescriptionPrefix} ${bulkActionTarget.ids.length} ${COPY.bulkUnverifyDescriptionSuffix}` : ''
        }
        confirmLabel={COPY.bulkUnverifyConfirm}
        cancelLabel={COPY.cancel}
        busy={busyAction === 'verify'}
        onCancel={() => setBulkActionTarget(null)}
        onConfirm={confirmBulkAction}
      />

      <ConfirmDialog
        isOpen={bulkActionTarget?.action === 'verify'}
        title={COPY.bulkVerifyTitle}
        description={
          bulkActionTarget ? `${COPY.bulkVerifyDescriptionPrefix} ${bulkActionTarget.ids.length} ${COPY.bulkVerifyDescriptionSuffix}` : ''
        }
        confirmLabel={COPY.bulkVerifyConfirm}
        cancelLabel={COPY.cancel}
        busy={busyAction === 'verify'}
        onCancel={() => setBulkActionTarget(null)}
        onConfirm={confirmBulkAction}
      />
    </>
  );
};
