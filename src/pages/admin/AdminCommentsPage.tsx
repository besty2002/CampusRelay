import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  Loader2,
  MessageSquare,
  EyeOff,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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
  profiles: { display_name: string };
  posts: { title: string };
}

const PAGE_SIZE = 20;

export const AdminCommentsPage = () => {
  const { role } = useOutletContext<AdminContext>();
  const { user: currentUser } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showHidden, setShowHidden] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('comments')
        .select(`
          id, post_id, user_id, content, is_hidden, created_at,
          profiles (display_name),
          posts (title)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (showHidden) {
        query = query.eq('is_hidden', true);
      }

      const { data, count } = await query;
      setComments((data as any[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Comments fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, showHidden]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleHide = async (commentId: string, userId: string) => {
    if (!currentUser) return;
    if (!confirm('このコメントを非表示にしますか？')) return;

    try {
      await supabase
        .from('comments')
        .update({
          is_hidden: true,
          hidden_by: currentUser.id,
          hidden_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      // Notify user
      await supabase.from('admin_notifications').insert({
        user_id: userId,
        type: 'comment_hidden',
        title: 'コメントが非表示になりました',
        message: 'あなたのコメントが利用規約に基づき非表示にされました。',
      });

      // Audit log
      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'comment_hide',
        target_type: 'comment',
        target_id: commentId,
      });

      fetchComments();
    } catch (err: any) {
      alert('操作に失敗しました: ' + err.message);
    }
  };

  const handleRestore = async (commentId: string) => {
    if (!currentUser) return;
    if (!confirm('このコメントを復元しますか？')) return;

    try {
      await supabase
        .from('comments')
        .update({
          is_hidden: false,
          hidden_by: null,
          hidden_at: null,
        })
        .eq('id', commentId);

      fetchComments();
    } catch (err: any) {
      alert('操作に失敗しました: ' + err.message);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!currentUser) return;
    if (role !== 'super_admin') {
      alert('完全削除はSuper Adminのみ可能です。');
      return;
    }
    if (!confirm('このコメントを完全に削除しますか？')) return;

    try {
      await supabase.from('comments').delete().eq('id', commentId);

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'comment_delete',
        target_type: 'comment',
        target_id: commentId,
      });

      fetchComments();
    } catch (err: any) {
      alert('削除に失敗しました: ' + err.message);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-slate-800">コメント管理</h2>
        <button
          onClick={() => { setShowHidden(!showHidden); setPage(0); }}
          className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
            showHidden
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          {showHidden ? '非表示のみ' : '全コメント'}
        </button>
      </div>

      <p className="text-xs font-bold text-slate-400 mb-4">{totalCount} 件のコメント</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-lime-500" size={28} />
        </div>
      ) : comments.length === 0 ? (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
          <MessageSquare className="mx-auto text-slate-200 mb-4" size={48} />
          <p className="text-slate-400 font-bold">コメントがありません。</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {comments.map(comment => (
            <div
              key={comment.id}
              className={`bg-white p-5 rounded-[2rem] shadow-sm border transition-all ${
                comment.is_hidden ? 'border-red-200 bg-red-50/20 opacity-70' : 'border-slate-100'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  comment.is_hidden ? 'bg-red-50 text-red-400' : 'bg-slate-50 text-slate-400'
                }`}>
                  <MessageSquare size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link
                      to={`/user/${comment.user_id}`}
                      className="text-sm font-black text-slate-700 hover:text-lime-600 transition-colors"
                    >
                      {comment.profiles?.display_name}
                    </Link>
                    <span className="text-[10px] text-slate-300 font-medium">
                      {new Date(comment.created_at).toLocaleDateString('ja-JP')}
                    </span>
                    {comment.is_hidden && (
                      <span className="text-[10px] font-black text-red-400 bg-red-50 px-2 py-0.5 rounded-full">
                        非表示
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{comment.content}</p>
                  <Link
                    to={`/post/${comment.post_id}`}
                    className="text-[10px] text-sky-500 font-bold hover:underline mt-1 inline-block"
                  >
                    投稿: {comment.posts?.title}
                  </Link>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {comment.is_hidden ? (
                    <button
                      onClick={() => handleRestore(comment.id)}
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-500 hover:bg-emerald-100 transition-all"
                      title="復元"
                    >
                      <Eye size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleHide(comment.id, comment.user_id)}
                      className="p-2 rounded-xl bg-amber-50 text-amber-500 hover:bg-amber-100 transition-all"
                      title="非表示"
                    >
                      <EyeOff size={14} />
                    </button>
                  )}
                  {role === 'super_admin' && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
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
    </div>
  );
};
