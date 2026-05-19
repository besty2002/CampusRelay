import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Building,
  CheckCircle,
  Clock,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  Shield,
  Trash2,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { useToast } from '../../components/feedback/ToastProvider';
import { logger } from '../../lib/logger';

interface AdminContext {
  role: 'school_admin' | 'super_admin';
  adminSchoolIds: string[];
}

interface InviteRow {
  id: string;
  code: string;
  role: string;
  school_id: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  schools?: { name_ja: string } | null;
  created_by_profile?: { display_name: string } | null;
  used_by_profile?: { display_name: string } | null;
}

interface School {
  id: string;
  name_ja: string;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export const AdminInvitesPage = () => {
  const { role } = useOutletContext<AdminContext>();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRole, setNewRole] = useState<'school_admin' | 'super_admin'>('school_admin');
  const [newSchoolId, setNewSchoolId] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; code: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: invitesData, error: invitesError } = await supabase
        .from('admin_invites')
        .select(
          `
          *,
          schools (name_ja),
          created_by_profile:profiles!admin_invites_created_by_fkey (display_name),
          used_by_profile:profiles!admin_invites_used_by_fkey (display_name)
        `
        )
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;
      setInvites((invitesData as InviteRow[]) || []);

      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('id, name_ja')
        .order('name_ja');

      if (schoolsError) throw schoolsError;
      setSchools((schoolsData as School[]) || []);
    } catch (error) {
      logger.error('Fetch error:', error);
      showToast({
        tone: 'error',
        title: '招待コードを読み込めませんでした',
        description: getErrorMessage(error, '少し時間をおいてもう一度お試しください。'),
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (role === 'super_admin') {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [role, fetchData]);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'ADMIN-';
    for (let index = 0; index < 4; index += 1) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let index = 0; index < 4; index += 1) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const handleCreateInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    setGenerating(true);
    try {
      const code = generateCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      const { error } = await supabase.from('admin_invites').insert({
        code,
        role: newRole,
        school_id: newRole === 'school_admin' && newSchoolId ? newSchoolId : null,
        created_by: currentUser.id,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'invite_create',
        target_type: 'system',
        target_id: 'invite',
        details: { role: newRole, expiryDays },
      });

      setNewRole('school_admin');
      setNewSchoolId('');
      showToast({
        tone: 'success',
        title: '招待コードを発行しました',
      });
      await fetchData();
    } catch (error) {
      showToast({
        tone: 'error',
        title: '招待コードを発行できませんでした',
        description: getErrorMessage(error, '入力内容を確認して、もう一度お試しください。'),
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('admin_invites').delete().eq('id', id);
      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser?.id,
        action: 'invite_delete',
        target_type: 'system',
        target_id: 'invite',
        details: { code },
      });

      showToast({
        tone: 'success',
        title: '招待コードを無効化しました',
      });
      setPendingDelete(null);
      await fetchData();
    } catch (error) {
      showToast({
        tone: 'error',
        title: '招待コードを無効化できませんでした',
        description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
      });
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      showToast({
        tone: 'success',
        title: '招待コードをコピーしました',
      });
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      showToast({
        tone: 'error',
        title: 'コピーに失敗しました',
        description: getErrorMessage(error, '手動でコードを選択してコピーしてください。'),
      });
    }
  };

  if (role !== 'super_admin') {
    return (
      <div className="rounded-3xl border border-red-100 bg-red-50 p-8 text-center font-bold text-red-600">
        <Shield size={48} className="mx-auto mb-4 opacity-50" />
        このページにアクセスできるのは Super Admin のみです。
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-black text-slate-800">招待コード管理</h2>

      <div className="mb-8 rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-lime-100 p-2.5 text-lime-600">
            <KeyRound size={20} />
          </div>
          <h3 className="text-lg font-black text-slate-800">新しい招待コードを発行</h3>
        </div>

        <form onSubmit={handleCreateInvite} className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1.5 ml-1 block text-xs font-bold text-slate-500">権限</label>
            <select
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as 'school_admin' | 'super_admin')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-lime-500/30"
            >
              <option value="school_admin">School Admin（学校管理者）</option>
              <option value="super_admin">Super Admin（全体管理者）</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 ml-1 block text-xs font-bold text-slate-500">対象学校</label>
            <select
              value={newSchoolId}
              onChange={(event) => setNewSchoolId(event.target.value)}
              disabled={newRole === 'super_admin'}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-lime-500/30 disabled:opacity-50"
            >
              <option value="">選択なし</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name_ja}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 ml-1 block text-xs font-bold text-slate-500">有効期限</label>
            <select
              value={expiryDays}
              onChange={(event) => setExpiryDays(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-lime-500/30"
            >
              <option value={1}>1日</option>
              <option value={7}>7日</option>
              <option value={30}>30日</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={generating}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 py-3 text-sm font-bold text-white shadow-lg shadow-slate-800/20 transition-all hover:bg-slate-900 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Plus size={16} /> 発行する
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">発行済みの招待コード</h3>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-lime-500" size={28} />
        </div>
      ) : invites.length === 0 ? (
        <div className="rounded-[2.5rem] border-2 border-dashed border-slate-100 bg-white p-12 text-center">
          <p className="font-bold text-slate-400">まだ招待コードはありません。</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {invites.map((invite) => {
            const isExpired = new Date(invite.expires_at) < new Date();
            const isUsed = Boolean(invite.used_at);
            const status = isUsed ? 'used' : isExpired ? 'expired' : 'active';

            return (
              <div
                key={invite.id}
                className={`rounded-[2rem] border bg-white p-5 transition-all ${
                  status === 'active' ? 'border-lime-200 shadow-sm' : 'border-slate-100 opacity-60'
                }`}
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${
                          status === 'active'
                            ? 'bg-lime-100 text-lime-700'
                            : status === 'used'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {status === 'active' && <Clock size={10} />}
                        {status === 'used' && <CheckCircle size={10} />}
                        {status === 'expired' && <XCircle size={10} />}
                        {status === 'active' ? '有効' : status === 'used' ? '使用済み' : '期限切れ'}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black ${
                          invite.role === 'super_admin' ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600'
                        }`}
                      >
                        <Shield size={10} />
                        {invite.role === 'super_admin' ? 'Super Admin' : 'School Admin'}
                      </span>

                      {invite.schools && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-500">
                          <Building size={10} />
                          {invite.schools.name_ja}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <code className="rounded-xl bg-slate-50 px-3 py-1 text-lg font-black tracking-wider text-slate-800">
                        {invite.code}
                      </code>
                      {status === 'active' && (
                        <button
                          onClick={() => copyToClipboard(invite.id, invite.code)}
                          className="rounded-xl bg-slate-50 p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                          title="コピー"
                        >
                          {copiedId === invite.id ? (
                            <CheckCircle size={16} className="text-lime-500" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-4 text-xs font-medium text-slate-400">
                      <span>
                        発行日: {new Date(invite.created_at).toLocaleDateString('ja-JP')} (
                        {invite.created_by_profile?.display_name || '不明'})
                      </span>
                      <span>期限: {new Date(invite.expires_at).toLocaleDateString('ja-JP')}</span>
                      {isUsed && (
                        <span className="font-bold text-slate-600">
                          使用日: {new Date(invite.used_at!).toLocaleDateString('ja-JP')} (
                          {invite.used_by_profile?.display_name || '不明'})
                        </span>
                      )}
                    </div>
                  </div>

                  {status === 'active' && (
                    <div className="flex shrink-0 items-center">
                      <button
                        onClick={() => setPendingDelete({ id: invite.id, code: invite.code })}
                        className="rounded-2xl bg-red-50 p-3 text-red-500 transition-all hover:bg-red-100"
                        title="無効化"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="招待コードを無効化しますか？"
        description="無効化した招待コードは再利用できません。必要なら新しいコードを作成してください。"
        confirmLabel="無効化する"
        tone="danger"
        onConfirm={() => pendingDelete && handleDelete(pendingDelete.id, pendingDelete.code)}
        onCancel={() => setPendingDelete(null)}
        busy={deleting}
      />
    </div>
  );
};
