import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Loader2,
  Package,
  Search,
  Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { useToast } from '../../components/feedback/ToastProvider';
import type { PostCategory, PostMode, PostStatus } from '../../types';

interface AdminContext {
  role: 'school_admin' | 'super_admin';
  adminSchoolIds: string[];
}

interface PostRow {
  id: string;
  title: string;
  category: PostCategory;
  status: PostStatus;
  mode: PostMode;
  user_id: string;
  admin_note: string | null;
  hidden_by: string | null;
  created_at: string;
  profiles: { display_name: string };
  post_images: { storage_path: string }[];
  schools?: { name_ja: string } | null;
}

type RawPostRow = Omit<PostRow, 'profiles' | 'schools'> & {
  profiles: { display_name: string } | { display_name: string }[];
  schools?: { name_ja: string } | { name_ja: string }[] | null;
};

type HideTarget = {
  id: string;
  title: string;
  userId: string;
};

type DeleteTarget = {
  id: string;
  title: string;
};

const PAGE_SIZE = 15;

const CATEGORY_LABELS: Record<PostCategory, string> = {
  Uniform: '制服',
  Textbook: '教科書・書籍',
  Digital: 'デジタル',
  Life: '生活用品',
  ArtSport: '文化・スポーツ',
  Other: 'その他',
};

const COPY = {
  title: '投稿管理',
  searchPlaceholder: '投稿タイトルで検索...',
  allStatuses: 'すべてのステータス',
  allCategories: 'すべてのカテゴリ',
  available: '受付中',
  reserved: '予約済み',
  given: '譲渡済み',
  hidden: '非公開',
  noResults: '条件に合う投稿が見つかりません。',
  countSuffix: '件の投稿',
  viewPost: '投稿を見る',
  restore: '再表示する',
  hide: '非公開にする',
  permanentDelete: '完全削除',
  adminNotePrefix: '管理メモ',
  separator: '・',
  hideTitle: '投稿を非公開にしますか？',
  hideDescription:
    '必要であれば管理メモを残して、この投稿を一般ユーザーから見えない状態にします。',
  hideNotePlaceholder: '管理メモを入力（任意）',
  hideConfirm: '非公開にする',
  restoreTitle: '投稿を再表示しますか？',
  restoreDescription: '確認後、この投稿は再びユーザーに公開されます。',
  restoreConfirm: '再表示する',
  deleteTitle: '投稿を完全削除しますか？',
  deleteDescription:
    'この操作は元に戻せません。関連する申請情報にも影響するため、慎重に判断してください。',
  deleteConfirm: '完全削除する',
  hideSuccess: '投稿を非公開にしました',
  restoreSuccess: '投稿を再表示しました',
  deleteSuccess: '投稿を削除しました',
  actionError: '操作に失敗しました',
  superAdminOnly: '投稿の完全削除は Super Admin のみ実行できます。',
  hiddenNoticeTitle: '投稿が非公開になりました',
  hiddenNoticeReason: '理由',
  retry: '時間をおいてもう一度お試しください。',
  cancel: 'キャンセル',
} as const;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
};

export const AdminPostsPage = () => {
  const { role } = useOutletContext<AdminContext>();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [hideTarget, setHideTarget] = useState<HideTarget | null>(null);
  const [hideNote, setHideNote] = useState('');
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [busyAction, setBusyAction] = useState<'hide' | 'restore' | 'delete' | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select(
          `
            id, title, category, status, mode, user_id, admin_note, hidden_by, created_at,
            profiles (display_name),
            post_images (storage_path),
            schools (name_ja)
          `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (searchQuery.trim()) query = query.ilike('title', `%${searchQuery.trim()}%`);
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);
      if (filterCategory !== 'all') query = query.eq('category', filterCategory);

      const { data, count } = await query;
      const normalizedPosts = (((data as unknown) as RawPostRow[] | null) ?? []).map((post) => ({
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] ?? { display_name: '' } : post.profiles,
        schools: Array.isArray(post.schools) ? post.schools[0] ?? null : post.schools ?? null,
      }));

      setPosts(normalizedPosts);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Posts fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterStatus, filterCategory]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const confirmHide = async () => {
    if (!currentUser || !hideTarget) return;
    setBusyAction('hide');
    try {
      await supabase
        .from('posts')
        .update({
          status: 'Hidden',
          hidden_by: currentUser.id,
          hidden_at: new Date().toISOString(),
          admin_note: hideNote.trim() || null,
        })
        .eq('id', hideTarget.id);

      await supabase.from('admin_notifications').insert({
        user_id: hideTarget.userId,
        type: 'post_hidden',
        title: COPY.hiddenNoticeTitle,
        message: `あなたの投稿「${hideTarget.title}」は管理者により非公開になりました。${
          hideNote.trim() ? `${COPY.hiddenNoticeReason}: ${hideNote.trim()}` : ''
        }`,
      });

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'post_hide',
        target_type: 'post',
        target_id: hideTarget.id,
        details: { title: hideTarget.title, note: hideNote.trim() || null },
      });

      showToast({ tone: 'success', title: COPY.hideSuccess });
      setHideTarget(null);
      setHideNote('');
      void fetchPosts();
    } catch (error: unknown) {
      showToast({ tone: 'error', title: COPY.actionError, description: getErrorMessage(error, COPY.retry) });
    } finally {
      setBusyAction(null);
    }
  };

  const confirmRestore = async () => {
    if (!currentUser || !restoreTarget) return;
    setBusyAction('restore');
    try {
      await supabase
        .from('posts')
        .update({
          status: 'Available',
          hidden_by: null,
          hidden_at: null,
          admin_note: null,
        })
        .eq('id', restoreTarget);

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'post_restore',
        target_type: 'post',
        target_id: restoreTarget,
      });

      showToast({ tone: 'success', title: COPY.restoreSuccess });
      setRestoreTarget(null);
      void fetchPosts();
    } catch (error: unknown) {
      showToast({ tone: 'error', title: COPY.actionError, description: getErrorMessage(error, COPY.retry) });
    } finally {
      setBusyAction(null);
    }
  };

  const requestDelete = (postId: string, postTitle: string) => {
    if (role !== 'super_admin') {
      showToast({ tone: 'info', title: COPY.superAdminOnly });
      return;
    }
    setDeleteTarget({ id: postId, title: postTitle });
  };

  const confirmDelete = async () => {
    if (!currentUser || !deleteTarget) return;
    setBusyAction('delete');
    try {
      await supabase.from('posts').delete().eq('id', deleteTarget.id);
      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'post_delete',
        target_type: 'post',
        target_id: deleteTarget.id,
        details: { title: deleteTarget.title },
      });
      showToast({ tone: 'success', title: COPY.deleteSuccess });
      setDeleteTarget(null);
      void fetchPosts();
    } catch (error: unknown) {
      showToast({ tone: 'error', title: COPY.actionError, description: getErrorMessage(error, COPY.retry) });
    } finally {
      setBusyAction(null);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
              <option value="Available">{COPY.available}</option>
              <option value="Reserved">{COPY.reserved}</option>
              <option value="Given">{COPY.given}</option>
              <option value="Hidden">{COPY.hidden}</option>
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
            <select
              value={filterCategory}
              onChange={(event) => {
                setFilterCategory(event.target.value);
                setPage(0);
              }}
              className="bg-transparent text-sm font-bold text-slate-600 focus:outline-none"
            >
              <option value="all">{COPY.allCategories}</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
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
        ) : posts.length === 0 ? (
          <div className="rounded-[2.5rem] border-2 border-dashed border-slate-100 bg-white p-12 text-center">
            <Package className="mx-auto mb-4 text-slate-200" size={48} />
            <p className="font-bold text-slate-400">{COPY.noResults}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {posts.map((post) => {
              const thumb = post.post_images?.[0]?.storage_path;
              return (
                <div
                  key={post.id}
                  className={`rounded-[2rem] border bg-white p-4 shadow-sm transition-all ${
                    post.status === 'Hidden' ? 'border-red-200 bg-red-50/20' : 'border-slate-100 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <Package size={20} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <StatusBadge status={post.status} />
                        <span className="text-[10px] font-bold text-slate-300">{CATEGORY_LABELS[post.category]}</span>
                        <span className="text-[10px] font-bold text-slate-300">{post.schools?.name_ja}</span>
                      </div>
                      <Link
                        to={`/post/${post.id}`}
                        className="block truncate font-bold text-slate-800 transition-colors hover:text-lime-600"
                      >
                        {post.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {post.profiles?.display_name} {COPY.separator} {new Date(post.created_at).toLocaleDateString('ja-JP')}
                      </p>
                      {post.admin_note && (
                        <p className="mt-1 text-[10px] italic text-red-400">
                          {COPY.adminNotePrefix}: {post.admin_note}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <Link
                        to={`/post/${post.id}`}
                        className="rounded-xl bg-slate-50 p-2 text-slate-400 transition-all hover:bg-slate-100"
                        title={COPY.viewPost}
                      >
                        <ExternalLink size={14} />
                      </Link>

                      {post.status === 'Hidden' ? (
                        <button
                          onClick={() => setRestoreTarget(post.id)}
                          className="rounded-xl bg-emerald-50 p-2 text-emerald-500 transition-all hover:bg-emerald-100"
                          title={COPY.restore}
                        >
                          <Eye size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setHideTarget({ id: post.id, title: post.title, userId: post.user_id });
                            setHideNote(post.admin_note ?? '');
                          }}
                          className="rounded-xl bg-amber-50 p-2 text-amber-500 transition-all hover:bg-amber-100"
                          title={COPY.hide}
                        >
                          <EyeOff size={14} />
                        </button>
                      )}

                      {role === 'super_admin' && (
                        <button
                          onClick={() => requestDelete(post.id, post.title)}
                          className="rounded-xl bg-red-50 p-2 text-red-500 transition-all hover:bg-red-100"
                          title={COPY.permanentDelete}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
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
      </div>

      {hideTarget && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl">
            <h3 className="mb-3 text-lg font-black text-slate-800">{COPY.hideTitle}</h3>
            <p className="mb-4 text-sm font-medium leading-6 text-slate-500">{COPY.hideDescription}</p>
            <textarea
              value={hideNote}
              onChange={(event) => setHideNote(event.target.value)}
              placeholder={COPY.hideNotePlaceholder}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none transition-all focus:border-lime-400 focus:ring-2 focus:ring-lime-500/20"
            />
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setHideTarget(null);
                  setHideNote('');
                }}
                disabled={busyAction === 'hide'}
                className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:opacity-60"
              >
                {COPY.cancel}
              </button>
              <button
                type="button"
                onClick={confirmHide}
                disabled={busyAction === 'hide'}
                className="flex-1 rounded-2xl bg-amber-500 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 disabled:opacity-60"
              >
                {COPY.hideConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={restoreTarget !== null}
        title={COPY.restoreTitle}
        description={COPY.restoreDescription}
        confirmLabel={COPY.restoreConfirm}
        cancelLabel={COPY.cancel}
        busy={busyAction === 'restore'}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={confirmRestore}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={COPY.deleteTitle}
        description={
          deleteTarget ? `「${deleteTarget.title}」を削除します。${COPY.deleteDescription}` : COPY.deleteDescription
        }
        confirmLabel={COPY.deleteConfirm}
        cancelLabel={COPY.cancel}
        tone="danger"
        busy={busyAction === 'delete'}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
};
