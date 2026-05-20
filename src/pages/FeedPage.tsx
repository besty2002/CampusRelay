import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Plus, Loader2, ArrowLeft, Package, Search, Filter, Clock, ArrowDownWideNarrow, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Post, PostCategory } from '../types';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { PostCardSkeleton } from '../components/skeletons/PostCardSkeleton';
import { FeedPostCard } from '../components/feed/FeedPostCard';

const PAGE_SIZE = 20;

const CATEGORY_META: Record<PostCategory, { label: string; color: string }> = {
  Uniform: { label: '制服・通学用品', color: 'bg-blue-50 text-blue-700' },
  Textbook: { label: '教科書・書籍', color: 'bg-amber-50 text-amber-700' },
  Digital: { label: 'デジタル', color: 'bg-purple-50 text-purple-700' },
  Life: { label: '生活用品', color: 'bg-emerald-50 text-emerald-700' },
  ArtSport: { label: '文化・スポーツ', color: 'bg-rose-50 text-rose-700' },
  Other: { label: 'その他', color: 'bg-slate-100 text-slate-700' },
};

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

const MODE_LABELS = {
  GIVEAWAY: '無料で譲る',
  EXCHANGE: '交換',
} as const;

const FEED_COPY = {
  backToSchools: '学校一覧に戻る',
  subtitle: 'この学校のリアルタイム出品フィード',
  createPost: '出品する',
  searchPlaceholder: 'アイテムを検索...',
  filters: 'フィルター',
  filterHeading: '検索条件を調整',
  filterDescription: '状態と並び順をまとめて切り替えて、見たい出品をすばやく探せます。',
  clearFilters: '条件をクリア',
  statusLabel: '商品の状態',
  sortLabel: '並び順',
  searchSummaryPrefix: '「',
  searchSummarySuffix: '」の検索結果',
  summaryFallback: 'この学校の出品を表示中',
  loading: 'アイテムを読み込み中...',
  emptyTitle: 'アイテムがまだ見つかりません',
  emptyDescription: '検索語や条件を変えて、もう一度試してみてください。',
  emptyAction: '条件をリセット',
  resultCountSuffix: '件',
  resultCountLabel: '表示中',
  details: '詳細を見る',
  loadingMore: '読み込み中...',
  loadedAll: 'すべてのアイテムを表示しました',
  filterOpen: 'フィルターを開く',
  filterClose: 'フィルターを閉じる',
  activeFilters: '適用中の条件',
  searchTag: '検索',
  statusTag: '状態',
  sortTag: '並び順',
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
            profiles!user_id (display_name, completed_count, avg_rating, rating_count, email_verified, manner_temp),
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
            const existingIds = new Set(prev.map((post) => post.id));
            const newPosts = ((data as Post[]) ?? []).filter((post) => !existingIds.has(post.id));
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

  const clearFilters = useCallback(() => {
    setStatusFilter('Available');
    setSortBy('newest');
    setShowFilters(false);
  }, []);

  const resetAll = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('Available');
    setSortBy('newest');
    setShowFilters(false);
  }, []);

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (debouncedQuery) {
      chips.push({ key: 'search', label: `${FEED_COPY.searchTag}: ${debouncedQuery}` });
    }
    if (statusFilter !== 'Available') {
      chips.push({
        key: 'status',
        label: `${FEED_COPY.statusTag}: ${STATUS_OPTIONS.find((option) => option.id === statusFilter)?.label ?? statusFilter}`,
      });
    }
    if (sortBy !== 'newest') {
      chips.push({
        key: 'sort',
        label: `${FEED_COPY.sortTag}: ${SORT_OPTIONS.find((option) => option.id === sortBy)?.label ?? sortBy}`,
      });
    }
    return chips;
  }, [debouncedQuery, sortBy, statusFilter]);

  const sortSummary = SORT_OPTIONS.find((option) => option.id === sortBy)?.label ?? SORT_OPTIONS[0].label;

  return (
    <div className="mx-auto max-w-4xl p-4 pb-32">
      <header className="mb-6 pt-8">
        <Link
          to="/schools"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-lime-600"
        >
          <ArrowLeft size={16} /> {FEED_COPY.backToSchools}
        </Link>
        <div className="flex flex-col gap-4 rounded-[2.5rem] border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-lime-50 px-3 py-1 text-[11px] font-black tracking-widest text-lime-700">
              <Package size={12} />
              {posts.length}
              {FEED_COPY.resultCountSuffix}
              <span className="text-lime-500">{FEED_COPY.resultCountLabel}</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800">{schoolName}</h1>
            <p className="mt-1 font-medium text-slate-500">{FEED_COPY.subtitle}</p>
          </div>
          <Link
            to={`/post/new?schoolId=${schoolId}`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-lime-500 px-5 py-3 font-black text-white shadow-lg shadow-lime-500/30 transition-all hover:bg-lime-600 active:scale-95"
          >
            <Plus size={18} />
            {FEED_COPY.createPost}
          </Link>
        </div>
      </header>

      <section className="mb-6 rounded-[2.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <Search className="text-slate-400" size={20} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={FEED_COPY.searchPlaceholder}
              className="w-full rounded-2xl border-none bg-slate-50 py-3.5 pl-12 pr-4 font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-lime-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-label={showFilters ? FEED_COPY.filterClose : FEED_COPY.filterOpen}
            title={showFilters ? FEED_COPY.filterClose : FEED_COPY.filterOpen}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3.5 font-bold transition-all ${
              showFilters || statusFilter !== 'Available' || sortBy !== 'newest'
                ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/15'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Filter size={18} />
            <span className="hidden sm:inline">{FEED_COPY.filters}</span>
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid animate-in gap-6 rounded-[2rem] border border-slate-100 bg-slate-50/70 p-4 opacity-0 fade-in slide-in-from-top-2 duration-200 fill-mode-forwards md:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
                    <SlidersHorizontal size={16} />
                    {FEED_COPY.filterHeading}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{FEED_COPY.filterDescription}</p>
                </div>
                <button
                  onClick={clearFilters}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-500 transition-colors hover:text-red-500"
                >
                  <RotateCcw size={12} />
                  {FEED_COPY.clearFilters}
                </button>
              </div>

              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">{FEED_COPY.statusLabel}</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => setStatusFilter(status.id)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                      statusFilter === status.id
                        ? 'bg-lime-500 text-white shadow-md shadow-lime-500/20'
                        : 'bg-white text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">{FEED_COPY.sortLabel}</label>
              <div className="flex flex-col gap-2">
                {SORT_OPTIONS.map((sort) => (
                  <button
                    key={sort.id}
                    onClick={() => setSortBy(sort.id)}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                      sortBy === sort.id ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ArrowDownWideNarrow size={14} />
                      {sort.label}
                    </span>
                    {sort.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-[2rem] border border-slate-100 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-700">
              {debouncedQuery
                ? `${FEED_COPY.searchSummaryPrefix}${debouncedQuery}${FEED_COPY.searchSummarySuffix}`
                : FEED_COPY.summaryFallback}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              {posts.length}
              {FEED_COPY.resultCountSuffix}
              {' / '}
              {FEED_COPY.sortTag}: {sortSummary}
            </p>
          </div>
          {activeFilterChips.length > 0 && (
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <RotateCcw size={12} />
              {FEED_COPY.emptyAction}
            </button>
          )}
        </div>

        {activeFilterChips.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">{FEED_COPY.activeFilters}</p>
            <div className="flex flex-wrap gap-2">
              {activeFilterChips.map((chip) => (
                <span key={chip.key} className="rounded-full bg-lime-50 px-3 py-1.5 text-xs font-black text-lime-700">
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {loading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map((item) => (
            <PostCardSkeleton key={item} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-[3rem] border-2 border-dashed border-slate-100 bg-white py-20 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            <Package size={40} />
          </div>
          <p className="mb-2 text-lg font-bold text-slate-500">{FEED_COPY.emptyTitle}</p>
          <p className="mx-auto max-w-md text-sm text-slate-400">{FEED_COPY.emptyDescription}</p>
          <button
            onClick={resetAll}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 transition-colors hover:bg-lime-50 hover:text-lime-700"
          >
            <RotateCcw size={14} />
            {FEED_COPY.emptyAction}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              categoryMeta={CATEGORY_META}
              modeLabel={MODE_LABELS[post.mode]}
              detailsLabel={FEED_COPY.details}
            />
          ))}

          <div ref={sentinelRef} className="py-2">
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
