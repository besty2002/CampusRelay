import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Loader2, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { useToast } from '../../components/feedback/ToastProvider';
import { logger } from '../../lib/logger';
import type { Announcement } from '../../types';

interface AdminContext {
  role: 'school_admin' | 'super_admin';
  adminSchoolIds: string[];
}

type FormState = {
  title: string;
  body: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  showAsPopup: boolean;
};

const EMPTY_FORM: FormState = {
  title: '',
  body: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
  showAsPopup: true,
};

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const toIsoOrNull = (value: string) => (value ? new Date(value).toISOString() : null);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export const AdminAnnouncementsPage = () => {
  const { role } = useOutletContext<AdminContext>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setAnnouncements((data as Announcement[]) || []);
    } catch (error) {
      logger.error('Failed to fetch announcements', error);
      showToast({
        tone: 'error',
        title: 'お知らせを読み込めませんでした',
        description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (role === 'super_admin') {
      void fetchAnnouncements();
    } else {
      setLoading(false);
    }
  }, [fetchAnnouncements, role]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const activeCount = useMemo(() => announcements.filter((item) => item.is_active).length, [announcements]);

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      body: announcement.body,
      startsAt: toDateTimeLocalValue(announcement.starts_at),
      endsAt: toDateTimeLocalValue(announcement.ends_at),
      isActive: announcement.is_active,
      showAsPopup: announcement.show_as_popup,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    if (!form.title.trim() || !form.body.trim()) {
      showToast({
        tone: 'error',
        title: 'タイトルと本文を入力してください',
      });
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      starts_at: toIsoOrNull(form.startsAt),
      ends_at: toIsoOrNull(form.endsAt),
      is_active: form.isActive,
      show_as_popup: form.showAsPopup,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('announcements').update(payload).eq('id', editingId);
        if (error) throw error;

        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'announcement_update',
          target_type: 'system',
          target_id: editingId,
          details: { title: payload.title, is_active: payload.is_active, show_as_popup: payload.show_as_popup },
        });

        showToast({ tone: 'success', title: 'お知らせを更新しました' });
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .insert({ ...payload, created_by: user.id })
          .select('id')
          .single();
        if (error) throw error;

        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'announcement_create',
          target_type: 'system',
          target_id: data.id,
          details: { title: payload.title, is_active: payload.is_active, show_as_popup: payload.show_as_popup },
        });

        showToast({ tone: 'success', title: 'お知らせを作成しました' });
      }

      resetForm();
      await fetchAnnouncements();
    } catch (error) {
      showToast({
        tone: 'error',
        title: editingId ? 'お知らせを更新できませんでした' : 'お知らせを作成できませんでした',
        description: getErrorMessage(error, '入力内容を確認して再度お試しください。'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete || !user) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', pendingDelete.id);
      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'announcement_delete',
        target_type: 'system',
        target_id: pendingDelete.id,
        details: { title: pendingDelete.title },
      });

      showToast({ tone: 'success', title: 'お知らせを削除しました' });
      setPendingDelete(null);
      if (editingId === pendingDelete.id) resetForm();
      await fetchAnnouncements();
    } catch (error) {
      showToast({
        tone: 'error',
        title: 'お知らせを削除できませんでした',
        description: getErrorMessage(error, '時間をおいて再度お試しください。'),
      });
    } finally {
      setDeleting(false);
    }
  };

  if (role !== 'super_admin') {
    return (
      <div className="rounded-3xl border border-red-100 bg-red-50 p-8 text-center font-bold text-red-600">
        サイト全体のお知らせ管理は Super Admin のみ利用できます。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-lime-100 p-3 text-lime-600">
              <Megaphone size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">お知らせ管理</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                公開中のお知らせは、ユーザーがサイトへアクセスしたときにポップアップで表示されます。
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            公開中 {activeCount}件 / 全体 {announcements.length}件
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 ml-1 block text-xs font-bold text-slate-500">タイトル</span>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="例: オープン準備に伴うお知らせ"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-lime-500/30"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 ml-1 block text-xs font-bold text-slate-500">掲載開始</span>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-lime-500/30"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 ml-1 block text-xs font-bold text-slate-500">掲載終了</span>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-lime-500/30"
                />
              </label>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 ml-1 block text-xs font-bold text-slate-500">本文</span>
            <textarea
              value={form.body}
              onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
              rows={6}
              placeholder="例: 現在ベータ公開中です。ご意見・ご要望はプロフィール内のお問い合わせからご連絡ください。"
              className="w-full rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition-all focus:ring-2 focus:ring-lime-500/30"
            />
          </label>

          <div className="flex flex-col gap-3 rounded-[1.75rem] bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                />
                公開する
              </label>
              <label className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={form.showAsPopup}
                  onChange={(event) => setForm((prev) => ({ ...prev, showAsPopup: event.target.checked }))}
                />
                ポップアップ表示
              </label>
            </div>
            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
                >
                  新規作成に戻す
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : editingId ? <Pencil size={16} /> : <Plus size={16} />}
                {editingId ? '更新する' : '作成する'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-black uppercase tracking-[0.24em] text-slate-500">Announcements</h3>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-lime-500" size={28} />
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50 p-10 text-center text-sm font-bold text-slate-400">
            まだお知らせはありません。
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <article key={announcement.id} className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                          announcement.is_active ? 'bg-lime-100 text-lime-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {announcement.is_active ? '公開中' : '下書き'}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                          announcement.show_as_popup ? 'bg-sky-100 text-sky-700' : 'bg-white text-slate-500'
                        }`}
                      >
                        {announcement.show_as_popup ? 'ポップアップ表示' : '一覧のみ'}
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-slate-800">{announcement.title}</h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{announcement.body}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-400">
                      <span>更新: {new Date(announcement.updated_at).toLocaleString('ja-JP')}</span>
                      {announcement.starts_at && <span>開始: {new Date(announcement.starts_at).toLocaleString('ja-JP')}</span>}
                      {announcement.ends_at && <span>終了: {new Date(announcement.ends_at).toLocaleString('ja-JP')}</span>}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(announcement)}
                      className="rounded-2xl bg-white p-3 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      title="編集する"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(announcement)}
                      className="rounded-2xl bg-white p-3 text-red-500 transition-colors hover:bg-red-50"
                      title="削除する"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="お知らせを削除しますか？"
        description="削除すると、このお知らせは一覧とポップアップの両方から消えます。"
        confirmLabel="削除する"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
        busy={deleting}
      />
    </div>
  );
};
