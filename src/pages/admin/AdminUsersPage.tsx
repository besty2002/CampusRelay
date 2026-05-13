import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { UserAvatar } from '../../components/UserAvatar';
import { MannerTempGauge } from '../../components/MannerTempGauge';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import {
  Search,
  Loader2,
  ChevronRight,
  Crown,
  Shield,
  ShieldAlert,
  Ban,
  ChevronLeft,
} from 'lucide-react';

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

const PAGE_SIZE = 20;

export const AdminUsersPage = () => {
  const { role } = useOutletContext<AdminContext>();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterBanned, setFilterBanned] = useState<string>('all');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (searchQuery.trim()) {
        query = query.ilike('display_name', `%${searchQuery.trim()}%`);
      }
      if (filterRole !== 'all') {
        query = query.eq('role', filterRole);
      }
      if (filterBanned === 'banned') {
        query = query.eq('is_banned', true);
      } else if (filterBanned === 'active') {
        query = query.or('is_banned.is.null,is_banned.eq.false');
      }

      const { data, count } = await query;
      setUsers((data as UserRow[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Users fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterRole, filterBanned]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleBan = async (userId: string, ban: boolean) => {
    if (!currentUser) return;
    const reason = ban ? prompt('BAN理由を入力してください：') : null;
    if (ban && !reason) return;

    const confirmMsg = ban
      ? 'このユーザーをBANしますか？投稿がすべて非表示になります。'
      : 'このユーザーのBANを解除しますか？';
    if (!confirm(confirmMsg)) return;

    try {
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: ban,
          banned_at: ban ? new Date().toISOString() : null,
          ban_reason: ban ? reason : null,
        })
        .eq('id', userId);

      if (error) throw error;

      // Hide all posts if banning
      if (ban) {
        await supabase
          .from('posts')
          .update({ status: 'Hidden', hidden_by: currentUser.id, hidden_at: new Date().toISOString() })
          .eq('user_id', userId)
          .neq('status', 'Hidden');
      }

      // Send notification to user
      await supabase.from('admin_notifications').insert({
        user_id: userId,
        type: ban ? 'ban' : 'unban',
        title: ban ? 'アカウントが停止されました' : 'アカウント停止が解除されました',
        message: ban
          ? `利用規約違反のため、アカウントが停止されました。理由: ${reason}`
          : 'アカウント停止が解除されました。再度サービスをご利用いただけます。',
      });

      // Write audit log
      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: ban ? 'user_ban' : 'user_unban',
        target_type: 'user',
        target_id: userId,
        details: ban ? { reason } : {},
      });

      fetchUsers();
    } catch (err: any) {
      alert('操作に失敗しました: ' + err.message);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!currentUser) return;
    if (role !== 'super_admin') {
      alert('ロール変更はSuper Adminのみ可能です。');
      return;
    }
    if (!confirm(`このユーザーのロールを「${newRole}」に変更しますか？`)) return;

    try {
      const targetUser = users.find(u => u.id === userId);
      const oldRole = targetUser?.role || 'user';

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'user_role_change',
        target_type: 'user',
        target_id: userId,
        details: { old_role: oldRole, new_role: newRole },
      });

      fetchUsers();
    } catch (err: any) {
      alert('ロール変更に失敗しました: ' + err.message);
    }
  };

  const handleVerification = async (userId: string, grant: boolean) => {
    if (!currentUser) return;
    if (!confirm(grant ? '学校認証を付与しますか？' : '学校認証を取り消しますか？')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          email_verified: grant,
          verified_school_domain: grant ? 'manual-admin' : null,
        })
        .eq('id', userId);

      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: grant ? 'verification_grant' : 'verification_revoke',
        target_type: 'user',
        target_id: userId,
      });

      fetchUsers();
    } catch (err: any) {
      alert('操作に失敗しました: ' + err.message);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getRoleBadge = (r: string) => {
    if (r === 'super_admin') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-full">
        <Crown size={10} /> Super
      </span>
    );
    if (r === 'school_admin') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-black rounded-full">
        <Shield size={10} /> School
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-black rounded-full">
        User
      </span>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-black text-slate-800 mb-6">ユーザー管理</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ユーザー名で検索..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-400 transition-all"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => { setFilterRole(e.target.value); setPage(0); }}
          className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/30"
        >
          <option value="all">全ロール</option>
          <option value="user">User</option>
          <option value="school_admin">School Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <select
          value={filterBanned}
          onChange={e => { setFilterBanned(e.target.value); setPage(0); }}
          className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/30"
        >
          <option value="all">全ステータス</option>
          <option value="active">アクティブ</option>
          <option value="banned">BAN中</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-xs font-bold text-slate-400 mb-4">{totalCount} 件のユーザー</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-lime-500" size={28} />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
          <p className="text-slate-400 font-bold">該当するユーザーがいません。</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {users.map(u => (
            <div
              key={u.id}
              className={`bg-white p-5 rounded-[2rem] shadow-sm border transition-all ${
                u.is_banned ? 'border-red-200 bg-red-50/30' : 'border-slate-100 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-4">
                <Link to={`/user/${u.id}`}>
                  <UserAvatar avatarUrl={u.avatar_url} displayName={u.display_name} size="md" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/user/${u.id}`} className="font-black text-slate-800 hover:text-lime-600 transition-colors">
                      {u.display_name}
                    </Link>
                    {getRoleBadge(u.role)}
                    <VerifiedBadge verified={u.email_verified} size="sm" />
                    {u.is_banned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded-full">
                        <Ban size={10} /> BAN
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400 font-medium">
                    <span>取引 {u.completed_count}件</span>
                    <span>⭐ {u.avg_rating}</span>
                    <MannerTempGauge temp={u.manner_temp ?? 36.5} size="sm" />
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1">
                    登録日: {new Date(u.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {role === 'super_admin' && u.id !== currentUser?.id && (
                    <>
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="px-2 py-1.5 text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500/30"
                      >
                        <option value="user">User</option>
                        <option value="school_admin">School Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>

                      <button
                        onClick={() => handleVerification(u.id, !u.email_verified)}
                        className={`p-2 rounded-xl text-xs font-bold transition-all ${
                          u.email_verified
                            ? 'bg-lime-50 text-lime-600 hover:bg-lime-100'
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                        title={u.email_verified ? '認証取消' : '認証付与'}
                      >
                        <ShieldAlert size={16} />
                      </button>
                    </>
                  )}

                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => handleBan(u.id, !u.is_banned)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all ${
                        u.is_banned
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-500 hover:bg-red-100'
                      }`}
                      title={u.is_banned ? 'BAN解除' : 'BAN'}
                    >
                      <Ban size={16} />
                    </button>
                  )}

                  <Link
                    to={`/user/${u.id}`}
                    className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-slate-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
