import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  Loader2,
  KeyRound,
  Plus,
  Copy,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Building,
} from 'lucide-react';

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

export const AdminInvitesPage = () => {
  const { role } = useOutletContext<AdminContext>();
  const { user: currentUser } = useAuth();
  
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [newRole, setNewRole] = useState<'school_admin' | 'super_admin'>('school_admin');
  const [newSchoolId, setNewSchoolId] = useState<string>('');
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [generating, setGenerating] = useState(false);

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Invites
      const { data: invitesData, error: invitesError } = await supabase
        .from('admin_invites')
        .select(`
          *,
          schools (name_ja),
          created_by_profile:profiles!admin_invites_created_by_fkey (display_name),
          used_by_profile:profiles!admin_invites_used_by_fkey (display_name)
        `)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;
      setInvites(invitesData || []);

      // 2. Fetch Schools for dropdown
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('id, name_ja')
        .order('name_ja');
        
      setSchools(schoolsData || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'super_admin') {
      fetchData();
    } else {
      setLoading(false); // Non-super admins won't see anything anyway
    }
  }, [role, fetchData]);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'ADMIN-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
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
        expires_at: expiresAt.toISOString()
      });

      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'invite_create',
        target_type: 'system',
        target_id: 'invite',
        details: { role: newRole, expiryDays }
      });

      // Reset form
      setNewRole('school_admin');
      setNewSchoolId('');
      fetchData();
    } catch (err: any) {
      alert('招待コードの作成に失敗しました: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm('この招待コードを無効化（削除）しますか？')) return;
    
    try {
      await supabase.from('admin_invites').delete().eq('id', id);
      
      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser?.id,
        action: 'invite_delete',
        target_type: 'system',
        target_id: 'invite',
        details: { code }
      });

      fetchData();
    } catch (err: any) {
      alert('削除に失敗しました: ' + err.message);
    }
  };

  const copyToClipboard = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (role !== 'super_admin') {
    return (
      <div className="bg-red-50 text-red-600 p-8 rounded-3xl font-bold text-center border border-red-100">
        <Shield size={48} className="mx-auto mb-4 opacity-50" />
        このページへのアクセス権限がありません。（Super Admin専用）
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-black text-slate-800 mb-6">招待コード管理</h2>

      {/* Create Form */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-lime-100 text-lime-600 rounded-xl">
            <KeyRound size={20} />
          </div>
          <h3 className="text-lg font-black text-slate-800">新規招待コード発行</h3>
        </div>

        <form onSubmit={handleCreateInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">権限 (Role)</label>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-lime-500/30 transition-all"
            >
              <option value="school_admin">School Admin (学校管理者)</option>
              <option value="super_admin">Super Admin (全体管理者)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">担当学校 (School Admin用)</label>
            <select
              value={newSchoolId}
              onChange={e => setNewSchoolId(e.target.value)}
              disabled={newRole === 'super_admin'}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-lime-500/30 transition-all disabled:opacity-50"
            >
              <option value="">指定なし (後で設定)</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name_ja}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">有効期限</label>
            <select
              value={expiryDays}
              onChange={e => setExpiryDays(Number(e.target.value))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-lime-500/30 transition-all"
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
              className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white font-bold py-3 rounded-2xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-800/20 disabled:opacity-50 text-sm h-[46px]"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> 発行する</>}
            </button>
          </div>
        </form>
      </div>

      {/* Invites List */}
      <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">発行済みコード一覧</h3>
      
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-lime-500" size={28} />
        </div>
      ) : invites.length === 0 ? (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
          <p className="text-slate-400 font-bold">発行された招待コードはありません。</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {invites.map(invite => {
            const isExpired = new Date(invite.expires_at) < new Date();
            const isUsed = !!invite.used_at;
            const status = isUsed ? 'used' : isExpired ? 'expired' : 'active';
            
            return (
              <div key={invite.id} className={`bg-white p-5 rounded-[2rem] border transition-all ${
                status === 'active' ? 'border-lime-200 shadow-sm' : 'border-slate-100 opacity-60'
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                        status === 'active' ? 'bg-lime-100 text-lime-700' :
                        status === 'used' ? 'bg-slate-100 text-slate-500' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {status === 'active' && <Clock size={10} />}
                        {status === 'used' && <CheckCircle size={10} />}
                        {status === 'expired' && <XCircle size={10} />}
                        {status === 'active' ? '有効' : status === 'used' ? '使用済み' : '期限切れ'}
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${
                        invite.role === 'super_admin' ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600'
                      }`}>
                        <Shield size={10} /> {invite.role === 'super_admin' ? 'Super Admin' : 'School Admin'}
                      </span>

                      {invite.schools && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 text-slate-500 text-[10px] font-black">
                          <Building size={10} /> {invite.schools.name_ja}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <code className="text-lg font-black text-slate-800 tracking-wider bg-slate-50 px-3 py-1 rounded-xl">
                        {invite.code}
                      </code>
                      {status === 'active' && (
                        <button
                          onClick={() => copyToClipboard(invite.id, invite.code)}
                          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                          title="コピー"
                        >
                          {copiedId === invite.id ? <CheckCircle size={16} className="text-lime-500" /> : <Copy size={16} />}
                        </button>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-slate-400 font-medium flex gap-4 flex-wrap">
                      <span>発行: {new Date(invite.created_at).toLocaleDateString()} ({invite.created_by_profile?.display_name || '不明'})</span>
                      <span>期限: {new Date(invite.expires_at).toLocaleDateString()}</span>
                      {isUsed && (
                        <span className="text-slate-600 font-bold">
                          使用: {new Date(invite.used_at!).toLocaleDateString()} ({invite.used_by_profile?.display_name || '不明'})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {status === 'active' && (
                    <div className="shrink-0 flex items-center">
                      <button
                        onClick={() => handleDelete(invite.id, invite.code)}
                        className="p-3 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
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
    </div>
  );
};
