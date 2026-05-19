import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Trash2,
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

interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_hidden: boolean;
  created_at: string;
  profiles: { display_name: string } | null;
  posts: { title: string } | null;
}

interface RawCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_hidden: boolean;
  created_at: string;
  profiles: { display_name: string }[] | { display_name: string } | null;
  posts: { title: string }[] | { title: string } | null;
}

type PendingAction =
  | { type: 'hide'; commentId: string; userId: string }
  | { type: 'restore'; commentId: string }
  | { type: 'delete'; commentId: string }
  | null;

const PAGE_SIZE = 20;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

const pickSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
};

export const AdminCommentsPage = () => {
  const { role } = useOutletContext<AdminContext>();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showHidden, setShowHidden] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [busyAction, setBusyAction] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('comments')
        .select(
          `
          id, post_id, user_id, content, is_hidden, created_at,
          profiles (display_name),
          posts (title)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (showHidden) {
        query = query.eq('is_hidden', true);
      }

      const { data, count } = await query;
      const normalizedComments = (((data as unknown) as RawCommentRow[]) || []).map((comment) => ({
        ...comment,
        profiles: pickSingle(comment.profiles),
        posts: pickSingle(comment.posts),
      }));
      setComments(normalizedComments);
      setTotalCount(count || 0);
    } catch (error) {
      logger.error('Comments fetch error:', error);
      showToast({
        tone: 'error',
        title: 'コメント一覧を読み込めませんでした',
        description: '少し時間をおいてもう一度お試しください。',
      });
    } finally {
      setLoading(false);
    }
  }, [page, showHidden, showToast]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleHide = async (commentId: string, userId: string) => {
    if (!currentUser) return;

    setBusyAction(true);
    try {
      const { error: updateError } = await supabase
        .from('comments')
        .update({
          is_hidden: true,
          hidden_by: currentUser.id,
          hidden_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (updateError) throw updateError;

      await supabase.from('admin_notifications').insert({
        user_id: userId,
        type: 'comment_hidden',
        title: 'コメントが非表示になりました',
        message: '利用ルールに基づき、あなたのコメントを非表示にしました。',
      });

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'comment_hide',
        target_type: 'comment',
        target_id: commentId,
      });

      showToast({
        tone: 'success',
        title: 'コメントを非表示にしました',
      });
      setPendingAction(null);
      await fetchComments();
    } catch (error) {
      showToast({
        tone: 'error',
        title: 'コメントを非表示にできませんでした',
        description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
      });
    } finally {
      setBusyAction(false);
    }
  };

  const handleRestore = async (commentId: string) => {
    if (!currentUser) return;

    setBusyAction(true);
    try {
      const { error } = await supabase
        .from('comments')
        .update({
          is_hidden: false,
          hidden_by: null,
          hidden_at: null,
        })
        .eq('id', commentId);

      if (error) throw error;

      showToast({
        tone: 'success',
        title: 'コメントを再表示しました',
      });
      setPendingAction(null);
      await fetchComments();
    } catch (error) {
      showToast({
        tone: 'error',
        title: 'コメントを再表示できませんでした',
        description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
      });
    } finally {
      setBusyAction(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!currentUser) return;
    if (role !== 'super_admin') {
      showToast({
        tone: 'info',
        title: '完全削除は Super Admin のみ実行できます。',
      });
      setPendingAction(null);
      return;
    }

    setBusyAction(true);
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'comment_delete',
        target_type: 'comment',
        target_id: commentId,
      });

      showToast({
        tone: 'success',
        title: 'コメントを完全削除しました',
      });
      setPendingAction(null);
      await fetchComments();
    } catch (error) {
      showToast({
        tone: 'error',
        title: 'コメントを削除できませんでした',
        description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
      });
    } finally {
      setBusyAction(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const confirmConfig =
    pendingAction?.type === 'hide'
      ? {
          title: 'コメントを非表示にしますか？',
          description: 'このコメントは一般ユーザーに表示されなくなります。',
          confirmLabel: '非表示にする',
          tone: 'danger' as const,
          onConfirm: () => handleHide(pendingAction.commentId, pendingAction.userId),
        }
      : pendingAction?.type === 'restore'
        ? {
            title: 'コメントを再表示しますか？',
            description: '確認後、このコメントは再びユーザーに表示されます。',
            confirmLabel: '再表示する',
            tone: 'default' as const,
            onConfirm: () => handleRestore(pendingAction.commentId),
          }
        : pendingAction?.type === 'delete'
          ? {
              title: 'コメントを完全削除しますか？',
              description: 'この操作は元に戻せません。監査ログには削除履歴が残ります。',
              confirmLabel: '完全削除する',
              tone: 'danger' as const,
              onConfirm: () => handleDelete(pendingAction.commentId),
            }
          : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800">コメント管理</h2>
        <button
          onClick={() => {
            setShowHidden(!showHidden);
            setPage(0);
          }}
          className={`rounded-2xl border px-4 py-2 text-sm font-bold transition-all ${
            showHidden
              ? 'border-red-200 bg-red-50 text-red-600'
              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          {showHidden ? '非表示コメントのみ' : 'すべてのコメント'}
        </button>
      </div>

      <p className="mb-4 text-xs font-bold text-slate-400">{totalCount} 件のコメント</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-lime-500" size={28} />
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-[2.5rem] border-2 border-dashed border-slate-100 bg-white p-12 text-center">
          <MessageSquare className="mx-auto mb-4 text-slate-200" size={48} />
          <p className="font-bold text-slate-400">該当するコメントはありません。</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-[2rem] border bg-white p-5 shadow-sm transition-all ${
                comment.is_hidden ? 'border-red-200 bg-red-50/20 opacity-70' : 'border-slate-100'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`mt-0.5 shrink-0 rounded-xl p-2 ${
                    comment.is_hidden ? 'bg-red-50 text-red-400' : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  <MessageSquare size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/user/${comment.user_id}`}
                      className="text-sm font-black text-slate-700 transition-colors hover:text-lime-600"
                    >
                      {comment.profiles?.display_name ?? 'ユーザー'}
                    </Link>
                    <span className="text-[10px] font-medium text-slate-300">
                      {new Date(comment.created_at).toLocaleDateString('ja-JP')}
                    </span>
                    {comment.is_hidden && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-400">
                        非表示
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-slate-600">{comment.content}</p>
                  <Link
                    to={`/post/${comment.post_id}`}
                    className="mt-1 inline-block text-[10px] font-bold text-sky-500 hover:underline"
                  >
                    投稿: {comment.posts?.title ?? '削除済みの投稿'}
                  </Link>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {comment.is_hidden ? (
                    <button
                      onClick={() => setPendingAction({ type: 'restore', commentId: comment.id })}
                      className="rounded-xl bg-emerald-50 p-2 text-emerald-500 transition-all hover:bg-emerald-100"
                      title="再表示"
                    >
                      <Eye size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setPendingAction({ type: 'hide', commentId: comment.id, userId: comment.user_id })}
                      className="rounded-xl bg-amber-50 p-2 text-amber-500 transition-all hover:bg-amber-100"
                      title="非表示"
                    >
                      <EyeOff size={14} />
                    </button>
                  )}
                  {role === 'super_admin' && (
                    <button
                      onClick={() => setPendingAction({ type: 'delete', commentId: comment.id })}
                      className="rounded-xl bg-red-50 p-2 text-red-500 transition-all hover:bg-red-100"
                      title="完全削除"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
            disabled={page === 0}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-slate-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((currentPage) => Math.min(totalPages - 1, currentPage + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {confirmConfig && (
        <ConfirmDialog
          isOpen
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          tone={confirmConfig.tone}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setPendingAction(null)}
          busy={busyAction}
        />
      )}
    </div>
  );
};
