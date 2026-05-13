import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Loader2,
  Search,
  Filter,
  EyeOff,
  Eye,
  Trash2,
  Package,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface AdminContext {
  role: 'school_admin' | 'super_admin';
  adminSchoolIds: string[];
}

interface PostRow {
  id: string;
  title: string;
  category: string;
  status: string;
  mode: string;
  user_id: string;
  admin_note: string | null;
  hidden_by: string | null;
  created_at: string;
  profiles: { display_name: string };
  post_images: { storage_path: string }[];
  schools?: { name_ja: string } | null;
}

const PAGE_SIZE = 15;

const CATEGORY_LABELS: Record<string, string> = {
  Uniform: '制服',
  Textbook: '教科書',
  Digital: 'デジタル',
  Life: '生活用品',
  ArtSport: '体育/美術',
  Other: 'その他',
};

export const AdminPostsPage = () => {
  const { role } = useOutletContext<AdminContext>();
  const { user: currentUser } = useAuth();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select(`
          id, title, category, status, mode, user_id, admin_note, hidden_by, created_at,
          profiles (display_name),
          post_images (storage_path),
          schools (name_ja)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      const { data, count } = await query;
      setPosts((data as any[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Posts fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterStatus, filterCategory]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleHide = async (postId: string, postTitle: string, userId: string) => {
    if (!currentUser) return;
    const note = prompt('非表示の理由（任意）：');
    if (!confirm('この投稿を非表示にしますか？')) return;

    try {
      await supabase
        .from('posts')
        .update({
          status: 'Hidden',
          hidden_by: currentUser.id,
          hidden_at: new Date().toISOString(),
          admin_note: note || null,
        })
        .eq('id', postId);

      // Notify user
      await supabase.from('admin_notifications').insert({
        user_id: userId,
        type: 'post_hidden',
        title: '投稿が非表示になりました',
        message: `あなたの投稿「${postTitle}」が管理者により非表示にされました。${note ? `理由: ${note}` : ''}`,
      });

      // Audit log
      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'post_hide',
        target_type: 'post',
        target_id: postId,
        details: { title: postTitle, note },
      });

      fetchPosts();
    } catch (err: any) {
      alert('操作に失敗しました: ' + err.message);
    }
  };

  const handleRestore = async (postId: string) => {
    if (!currentUser) return;
    if (!confirm('この投稿を復元しますか？')) return;

    try {
      await supabase
        .from('posts')
        .update({
          status: 'Available',
          hidden_by: null,
          hidden_at: null,
          admin_note: null,
        })
        .eq('id', postId);

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'post_restore',
        target_type: 'post',
        target_id: postId,
      });

      fetchPosts();
    } catch (err: any) {
      alert('操作に失敗しました: ' + err.message);
    }
  };

  const handleDelete = async (postId: string, postTitle: string) => {
    if (!currentUser) return;
    if (role !== 'super_admin') {
      alert('投稿の完全削除はSuper Adminのみ可能です。');
      return;
    }
    if (!confirm(`投稿「${postTitle}」を完全に削除しますか？この操作は取り消せません。`)) return;

    try {
      await supabase.from('posts').delete().eq('id', postId);

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'post_delete',
        target_type: 'post',
        target_id: postId,
        details: { title: postTitle },
      });

      fetchPosts();
    } catch (err: any) {
      alert('削除に失敗しました: ' + err.message);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <h2 className="text-xl font-black text-slate-800 mb-6">投稿管理</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="投稿タイトルで検索..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-slate-200">
          <Filter size={14} className="text-slate-400" />
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
            className="text-sm font-bold text-slate-600 bg-transparent focus:outline-none"
          >
            <option value="all">全ステータス</option>
            <option value="Available">出品中</option>
            <option value="Reserved">予約済み</option>
            <option value="Given">お譲り完了</option>
            <option value="Hidden">非表示</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-slate-200">
          <select
            value={filterCategory}
            onChange={e => { setFilterCategory(e.target.value); setPage(0); }}
            className="text-sm font-bold text-slate-600 bg-transparent focus:outline-none"
          >
            <option value="all">全カテゴリ</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs font-bold text-slate-400 mb-4">{totalCount} 件の投稿</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-lime-500" size={28} />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
          <Package className="mx-auto text-slate-200 mb-4" size={48} />
          <p className="text-slate-400 font-bold">該当する投稿がありません。</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {posts.map(post => {
            const thumb = post.post_images?.[0]?.storage_path;
            return (
              <div
                key={post.id}
                className={`bg-white p-4 rounded-[2rem] shadow-sm border transition-all ${
                  post.status === 'Hidden' ? 'border-red-200 bg-red-50/20' : 'border-slate-100 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 shrink-0 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100">
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package size={20} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <StatusBadge status={post.status as any} />
                      <span className="text-[10px] font-bold text-slate-300">
                        {CATEGORY_LABELS[post.category] || post.category}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300">
                        {post.schools?.name_ja}
                      </span>
                    </div>
                    <Link
                      to={`/post/${post.id}`}
                      className="font-bold text-slate-800 hover:text-lime-600 transition-colors truncate block"
                    >
                      {post.title}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {post.profiles?.display_name} · {new Date(post.created_at).toLocaleDateString('ja-JP')}
                    </p>
                    {post.admin_note && (
                      <p className="text-[10px] text-red-400 italic mt-1">管理者メモ: {post.admin_note}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      to={`/post/${post.id}`}
                      className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all"
                      title="投稿を見る"
                    >
                      <ExternalLink size={14} />
                    </Link>
                    {post.status === 'Hidden' ? (
                      <button
                        onClick={() => handleRestore(post.id)}
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-500 hover:bg-emerald-100 transition-all"
                        title="復元"
                      >
                        <Eye size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleHide(post.id, post.title, post.user_id)}
                        className="p-2 rounded-xl bg-amber-50 text-amber-500 hover:bg-amber-100 transition-all"
                        title="非表示"
                      >
                        <EyeOff size={14} />
                      </button>
                    )}
                    {role === 'super_admin' && (
                      <button
                        onClick={() => handleDelete(post.id, post.title)}
                        className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                        title="完全削除"
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
