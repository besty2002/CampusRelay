import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Loader2,
  ArrowLeft,
  Package,
  Star,
  Search,
  Filter,
  Clock,
  ArrowDownWideNarrow,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Post } from '../types';
import { CATEGORY_MAP } from './HomePage';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { id: 'ALL', label: 'すべて' },
  { id: 'Available', label: '受付中' },
  { id: 'Reserved', label: '予約済み' },
  { id: 'Given', label: '譲渡済み' },
] as const;

const SORT_OPTIONS = [
  { id: 'newest', label: '新しい順', icon: <Clock size={14} /> },
  { id: 'oldest', label: '古い順', icon: <Clock size={14} /> },
] as const;

type FeedStatus = (typeof STATUS_OPTIONS)[number]['id'];
type FeedSort = (typeof SORT_OPTIONS)[number]['id'];

const FEED_COPY = {
  backToSchools: '学校一覧に戻る',
  subtitle: 'この学校のリアルタイム出品フィード',
  createPost: '出品する',
  searchPlaceholder: 'アイテムを検索...',
  filters: 'フィルタ',
  statusLabel: '商品の状態',
  sortLabel: '並び順',
  searchSummaryPrefix: '「',
  searchSummarySuffix: '」の検索結果',
  summaryFallback: '並び順を変更中',
  loading: 'アイテムを読み込み中...',
  emptyTitle: 'アイテムがまだ見つかりません',
  emptyDescription: '検索や条件を変えて、もう一度試してみてください。',
  reserved: '予約済み',
  given: '譲渡済み',
  loadingMore: '読み込み中...',
  loadedAll: 'すべてのアイテムを表示しました',
} as const;

export const FeedPage = () => {
  const { schoolId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState('');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeedStatus>(() => {
    const status = searchParams.get('status');
    return STATUS_OPTIONS.some((option) => option.id === status) ? (status as FeedStatus) : 'Available';
  });
  const [sortBy, setSortBy] = useState<FeedSort>(() => {
    const sort = searchParams.get('sort');
    return SORT_OPTIONS.some((option) => option.id === sort) ? (sort as FeedSort) : 'newest';
  });
  const [showFilters, setShowFilters] = useState(false);

  const { page, hasMore, setHasMore, loadingMore, setLoadingMore, sentinelRef, reset } = useInfiniteScroll({
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (searchQuery.trim()) nextParams.set('q', searchQuery.trim());
    if (statusFilter !== 'Available') nextParams.set('status', statusFilter);
    if (sortBy !== 'newest') nextParams.set('sort', sortBy);
    setSearchParams(nextParams, { replace: true });
  }, [searchQuery, statusFilter, sortBy, setSearchParams]);

  const fetchSchoolInfo = useCallback(async () => {
    if (!schoolId) {
      setSchoolName('');
      return;
    }

    const { data } = await supabase.from('schools').select('name_ja').eq('id', schoolId).single();
    if (data) setSchoolName(data.name_ja);
  }, [schoolId]);

  const fetchPosts = useCallback(
    async (pageNum: number, isFirstPage: boolean) => {
      if (!schoolId) {
        setPosts([]);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (isFirstPage) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('posts')
        .select(
          `
        *,
        profiles!user_id (display_name, completed_count, avg_rating, rating_count),
        post_images (storage_path, sort_order)
      `
        )
        .eq('school_id', schoolId)
        .range(from, to)
        .order('created_at', { ascending: sortBy === 'oldest' });

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Available') {
          query = query.or('status.eq.Available,status.is.null');
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      if (debouncedQuery) {
        query = query.or(`title.ilike.%${debouncedQuery}%,description.ilike.%${debouncedQuery}%`);
      }

      const { data } = await query;

      if (data) {
        if (isFirstPage) {
          setPosts((data as Post[]) ?? []);
        } else {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosts = ((data as Post[]) ?? []).filter((p) => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          });
        }
        setHasMore(data.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [schoolId, statusFilter, debouncedQuery, sortBy, setHasMore, setLoadingMore]
  );

  useEffect(() => {
    void fetchSchoolInfo();
  }, [fetchSchoolInfo]);

  useEffect(() => {
    setPosts([]);
    reset();
  }, [statusFilter, debouncedQuery, sortBy, reset]);

  useEffect(() => {
    void fetchPosts(page, page === 0);
  }, [page, fetchPosts]);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32">
      <header className="mb-6 pt-8">
        <Link
          to="/schools"
          className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-lime-600"
        >
          <ArrowLeft size={16} /> {FEED_COPY.backToSchools}
        </Link>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800">{schoolName}</h1>
            <p className="mt-1 font-medium italic text-slate-500">{FEED_COPY.subtitle}</p>
          </div>
          <Link
            to={`/post/new?schoolId=${schoolId}`}
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-lime-500 px-6 py-3 font-black text-white shadow-lg shadow-lime-500/30 transition-all hover:bg-lime-600 active:scale-95"
          >
            <Plus size={20} />
            {FEED_COPY.createPost}
          </Link>
        </div>
      </header>

      <div className="mb-8 space-y-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <Search className="text-slate-400" size={20} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={FEED_COPY.searchPlaceholder}
              className="w-full rounded-2xl border-none bg-slate-50 py-3.5 pl-12 pr-4 font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-lime-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-label={showFilters ? 'フィルタを閉じる' : 'フィルタを開く'}
            title={showFilters ? 'フィルタを閉じる' : 'フィルタを開く'}
            className={`flex items-center gap-2 rounded-2xl px-4 py-3.5 font-bold transition-all ${
              showFilters ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Filter size={18} />
            <span className="hidden sm:inline">{FEED_COPY.filters}</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid animate-in grid-cols-1 gap-6 border-t border-slate-100 pt-4 opacity-0 fade-in slide-in-from-top-2 duration-200 fill-mode-forwards md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                {FEED_COPY.statusLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => setStatusFilter(status.id)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                      statusFilter === status.id
                        ? 'bg-lime-500 text-white shadow-md shadow-lime-500/20'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                {FEED_COPY.sortLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((sort) => (
                  <button
                    key={sort.id}
                    onClick={() => setSortBy(sort.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                      sortBy === sort.id ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowDownWideNarrow size={14} />
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && (debouncedQuery || statusFilter !== 'Available' || sortBy !== 'newest') && (
        <div className="mb-6 px-1 text-xs font-bold text-slate-400">
          {debouncedQuery
            ? `${FEED_COPY.searchSummaryPrefix}${debouncedQuery}${FEED_COPY.searchSummarySuffix}`
            : FEED_COPY.summaryFallback}{' '}
          ・ {SORT_OPTIONS.find((option) => option.id === sortBy)?.label}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="mb-4 animate-spin text-lime-500" size={40} />
          <p className="font-bold text-slate-400">{FEED_COPY.loading}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-[3rem] border-2 border-dashed border-slate-100 bg-white py-24 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
            <Package className="text-slate-200" size={40} />
          </div>
          <p className="mb-2 text-lg font-bold text-slate-400">{FEED_COPY.emptyTitle}</p>
          <p className="text-sm text-slate-400">{FEED_COPY.emptyDescription}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {posts.map((post) => {
            const thumbnail = post.post_images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path;
            const categoryInfo = CATEGORY_MAP[post.category];
            const isCompleted = post.status === 'Given';
            const hasDistinctDescription = Boolean(post.description?.trim() && post.description.trim() !== post.title.trim());

            return (
              <Link
                key={post.id}
                to={`/post/${post.id}`}
                className={`group flex flex-col overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm transition-all hover:shadow-2xl ${
                  isCompleted ? 'grayscale-[30%] opacity-60' : ''
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <Package size={48} strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute left-4 top-4 flex gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm ${
                        post.mode === 'GIVEAWAY' ? 'bg-lime-500/90 text-white' : 'bg-purple-500/90 text-white'
                      }`}
                    >
                      {post.mode === 'GIVEAWAY' ? 'GIVEAWAY' : 'EXCHANGE'}
                    </span>
                    {post.status === 'Reserved' && (
                      <span className="rounded-full bg-amber-500/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md shadow-sm">
                        {FEED_COPY.reserved}
                      </span>
                    )}
                    {post.status === 'Given' && (
                      <span className="rounded-full bg-slate-800/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md shadow-sm">
                        {FEED_COPY.given}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-2 flex items-start justify-between">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter ${
                        categoryInfo?.color || 'bg-slate-100'
                      }`}
                    >
                      {categoryInfo?.label}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300">
                      {new Date(post.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>

                  <h2 className="mb-3 line-clamp-1 text-xl font-black text-slate-800 transition-colors group-hover:text-lime-600">
                    {post.title}
                  </h2>
                  {hasDistinctDescription && (
                    <p className="mb-6 line-clamp-2 flex-1 text-sm font-medium text-slate-500">{post.description}</p>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-xs font-black text-sky-600">
                        {post.profiles.display_name[0]}
                      </div>
                      <span className="text-sm font-bold text-slate-600">{post.profiles.display_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs font-black text-slate-700">{post.profiles.avg_rating}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          <div ref={sentinelRef} className="col-span-full py-2">
            {loadingMore && (
              <div className="flex items-center justify-center gap-3 py-6">
                <Loader2 className="animate-spin text-lime-500" size={24} />
                <span className="text-sm font-bold text-slate-400">{FEED_COPY.loadingMore}</span>
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <div className="py-8 text-center">
                <p className="text-sm font-bold text-slate-300">{FEED_COPY.loadedAll}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
