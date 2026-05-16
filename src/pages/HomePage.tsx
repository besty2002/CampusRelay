import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Post, PostCategory, PostCondition } from '../types';
import {
  Search,
  Plus,
  School,
  ArrowRight,
  Star,
  Book,
  Shirt,
  LayoutGrid,
  Layers,
  Heart,
  Cpu,
  Palette,
  Coffee,
  Filter,
  X,
  Loader2,
  ArrowDownWideNarrow,
  History,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { MannerTempGauge } from '../components/MannerTempGauge';
import { PostCardSkeleton } from '../components/skeletons/PostCardSkeleton';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { StatusBadge } from '../components/StatusBadge';

export const CATEGORY_MAP: Record<PostCategory, { label: string; icon: any; color: string }> = {
  Uniform: { label: '制服・体操服', icon: Shirt, color: 'bg-blue-50 text-blue-600' },
  Textbook: { label: '教科書・書籍', icon: Book, color: 'bg-amber-50 text-amber-600' },
  Digital: { label: 'IT・デジタル', icon: Cpu, color: 'bg-purple-50 text-purple-600' },
  ArtSport: { label: '芸術・スポーツ', icon: Palette, color: 'bg-rose-50 text-rose-600' },
  Life: { label: '生活用品', icon: Coffee, color: 'bg-emerald-50 text-emerald-600' },
  Other: { label: 'その他', icon: Layers, color: 'bg-slate-50 text-slate-600' },
};

const CATEGORY_LIST: { id: PostCategory | 'All'; label: string; icon: any }[] = [
  { id: 'All', label: 'すべて', icon: LayoutGrid },
  { id: 'Uniform', label: '制服・体操服', icon: Shirt },
  { id: 'Textbook', label: '教科書・書籍', icon: Book },
  { id: 'Digital', label: 'IT・デジタル', icon: Cpu },
  { id: 'ArtSport', label: '芸術・スポーツ', icon: Palette },
  { id: 'Life', label: '生活用品', icon: Coffee },
  { id: 'Other', label: 'その他', icon: Layers },
];

const CONDITION_LIST: { id: PostCondition | 'All'; label: string }[] = [
  { id: 'All', label: 'すべて' },
  { id: 'Like New', label: '未使用に近い' },
  { id: 'Good', label: '目立った傷なし' },
  { id: 'Used', label: '使用感あり' },
];

const SORT_OPTIONS = [
  { id: 'newest', label: '新着順' },
  { id: 'oldest', label: '古い順' },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]['id'];

const PAGE_SIZE = 20;
const RECENT_SEARCHES_KEY = 'campusrelay:home-recent-searches';

export const HomePage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState<Post[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<PostCategory | 'All'>(() => {
    const category = searchParams.get('category');
    return CATEGORY_LIST.some((item) => item.id === category) ? (category as PostCategory | 'All') : 'All';
  });
  const [activeCondition, setActiveCondition] = useState<PostCondition | 'All'>(() => {
    const condition = searchParams.get('condition');
    return CONDITION_LIST.some((item) => item.id === condition) ? (condition as PostCondition | 'All') : 'All';
  });
  const [sizeFilter, setSizeFilter] = useState(() => searchParams.get('size') ?? '');
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const sort = searchParams.get('sort');
    return SORT_OPTIONS.some((option) => option.id === sort) ? (sort as SortOption) : 'newest';
  });
  const [mySchoolIds, setMySchoolIds] = useState<string[]>([]);
  const [fetchingSchools, setFetchingSchools] = useState(false);
  const [schoolsLoaded, setSchoolsLoaded] = useState(!user);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { page, hasMore, setHasMore, loadingMore, setLoadingMore, sentinelRef, reset } = useInfiniteScroll({
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((value): value is string => typeof value === 'string'));
      }
    } catch {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    }
  }, []);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (search.trim()) nextParams.set('q', search.trim());
    if (activeCategory !== 'All') nextParams.set('category', activeCategory);
    if (activeCondition !== 'All') nextParams.set('condition', activeCondition);
    if (sizeFilter.trim()) nextParams.set('size', sizeFilter.trim());
    if (sortBy !== 'newest') nextParams.set('sort', sortBy);
    setSearchParams(nextParams, { replace: true });
  }, [search, activeCategory, activeCondition, sizeFilter, sortBy, setSearchParams]);

  useEffect(() => {
    if (!debouncedSearch || typeof window === 'undefined') return;

    setRecentSearches((prev) => {
      const next = [debouncedSearch, ...prev.filter((item) => item !== debouncedSearch)].slice(0, 5);
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, [debouncedSearch]);

  const fetchWishlist = useCallback(async () => {
    const { data } = await supabase.from('wishlists').select('post_id').eq('user_id', user?.id);
    if (data) setWishlistIds(data.map((item) => item.post_id));
  }, [user?.id]);

  const fetchMySchools = useCallback(async () => {
    setFetchingSchools(true);
    setSchoolsLoaded(false);

    const { data } = await supabase.from('user_schools').select('school_id').eq('user_id', user?.id);
    setMySchoolIds(data?.map((item) => item.school_id) ?? []);

    setFetchingSchools(false);
    setSchoolsLoaded(true);
  }, [user?.id]);

  const fetchPosts = useCallback(
    async (schoolIds: string[], pageNum: number, isFirstPage: boolean) => {
      if (isFirstPage) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles!user_id (*),
          schools (name_ja),
          post_images (storage_path, sort_order)
        `)
        .eq('status', 'Available')
        .order('created_at', { ascending: sortBy === 'oldest' })
        .range(from, to);

      if (schoolIds.length > 0) {
        query = query.in('school_id', schoolIds);
      }

      if (activeCategory !== 'All') {
        query = query.eq('category', activeCategory);
      }

      if (activeCondition !== 'All') {
        query = query.eq('condition', activeCondition);
      }

      if (sizeFilter.trim()) {
        query = query.ilike('item_size', `%${sizeFilter.trim()}%`);
      }

      if (debouncedSearch) {
        query = query.or(
          `title.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%,schools.name_ja.ilike.%${debouncedSearch}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching posts:', error);
        setHasMore(false);
      } else if (data) {
        if (isFirstPage) {
          setPosts(data as Post[]);
        } else {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((post) => post.id));
            const newPosts = (data as Post[]).filter((post) => !existingIds.has(post.id));
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
    [activeCategory, activeCondition, sizeFilter, debouncedSearch, sortBy, setHasMore, setLoadingMore]
  );

  useEffect(() => {
    setPosts([]);
    reset();
  }, [debouncedSearch, activeCategory, activeCondition, sizeFilter, sortBy, mySchoolIds, reset]);

  useEffect(() => {
    if (user) {
      fetchMySchools();
      fetchWishlist();
    } else {
      setMySchoolIds([]);
      setSchoolsLoaded(true);
      fetchPosts([], 0, true);
    }
  }, [user, fetchMySchools, fetchWishlist, fetchPosts]);

  useEffect(() => {
    if (user && !schoolsLoaded) return;
    if (fetchingSchools) return;

    fetchPosts(mySchoolIds, page, page === 0);
  }, [page, mySchoolIds, fetchingSchools, schoolsLoaded, user, fetchPosts]);

  const toggleWishlist = async (event: React.MouseEvent, postId: string) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      alert('お気に入りを使うにはログインが必要です。');
      return;
    }

    const isWishlisted = wishlistIds.includes(postId);
    if (isWishlisted) {
      const { error } = await supabase.from('wishlists').delete().eq('user_id', user.id).eq('post_id', postId);
      if (!error) setWishlistIds((prev) => prev.filter((id) => id !== postId));
      return;
    }

    const { error } = await supabase.from('wishlists').insert({ user_id: user.id, post_id: postId });
    if (!error) setWishlistIds((prev) => [...prev, postId]);
  };

  const clearFilters = () => {
    setActiveCondition('All');
    setSizeFilter('');
    setSortBy('newest');
  };

  const removeRecentSearch = (value: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((item) => item !== value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const recentSearchChips = useMemo(
    () => recentSearches.filter((item) => item !== search.trim()).slice(0, 4),
    [recentSearches, search]
  );

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32">
      <header className="pt-8 mb-8 text-center">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
          Campus<span className="text-lime-500">Relay</span>
        </h1>
        <p className="text-slate-500 font-medium italic">学校のニーズと出品をひとつに</p>
      </header>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="アイテムや学校名を検索"
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-sm border border-slate-100 font-bold focus:ring-4 focus:ring-lime-500/10 focus:border-lime-500 outline-none transition-all"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 rounded-2xl border transition-all flex items-center justify-center gap-2 font-bold ${
            showFilters || activeCondition !== 'All' || sizeFilter || sortBy !== 'newest'
              ? 'bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-800/20'
              : 'bg-white text-slate-400 border-slate-100'
          }`}
        >
          <Filter size={20} />
          <span className="hidden sm:inline">フィルタ</span>
        </button>
      </div>

      {recentSearchChips.length > 0 && !search.trim() && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
            <History size={12} />
            最近の検索
          </span>
          {recentSearchChips.map((item) => (
            <button
              key={item}
              onClick={() => setSearch(item)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-100 text-xs font-bold text-slate-600 hover:border-lime-200 hover:text-lime-600 transition-all"
            >
              <span>{item}</span>
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  removeRecentSearch(item);
                }}
                className="text-slate-300 hover:text-red-400"
              >
                <X size={12} />
              </span>
            </button>
          ))}
        </div>
      )}

      {showFilters && (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 mb-8 animate-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800">詳細フィルタ</h3>
            <button
              onClick={clearFilters}
              className="text-xs font-black text-slate-400 hover:text-red-500 flex items-center gap-1"
            >
              <X size={14} />
              条件をリセット
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">状態</label>
              <div className="flex flex-wrap gap-2">
                {CONDITION_LIST.map((condition) => (
                  <button
                    key={condition.id}
                    onClick={() => setActiveCondition(condition.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeCondition === condition.id
                        ? 'bg-lime-500 text-white shadow-md shadow-lime-500/20'
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {condition.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                サイズ（例：140、M、LL）
              </label>
              <input
                type="text"
                value={sizeFilter}
                onChange={(event) => setSizeFilter(event.target.value)}
                placeholder="サイズを入力..."
                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-lime-500 outline-none font-bold text-sm transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">並び順</label>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSortBy(option.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      sortBy === option.id ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowDownWideNarrow size={14} />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 mb-8 no-scrollbar -mx-2 px-2">
        {CATEGORY_LIST.map((category) => (
          <button key={category.id} onClick={() => setActiveCategory(category.id)} className="flex flex-col items-center gap-2 shrink-0 group">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                activeCategory === category.id
                  ? 'bg-lime-500 text-white shadow-lg shadow-lime-500/30 scale-110'
                  : 'bg-white text-slate-400 border border-slate-100 hover:border-lime-200 hover:text-lime-500'
              }`}
            >
              <category.icon size={24} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-tighter ${activeCategory === category.id ? 'text-lime-600' : 'text-slate-400'}`}>
              {category.label}
            </span>
          </button>
        ))}
      </div>

      {user && !fetchingSchools && mySchoolIds.length === 0 && (
        <div className="bg-gradient-to-br from-lime-500 to-lime-600 rounded-[2.5rem] p-8 mb-8 text-white shadow-lg shadow-lime-500/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-2">登録された学校がありません</h3>
            <p className="text-lime-50 font-medium mb-6 opacity-90">
              学校を追加して、校内の最新出品や募集をチェックしましょう。
            </p>
            <Link
              to="/schools"
              className="inline-flex items-center gap-2 bg-white text-lime-600 px-6 py-3 rounded-xl font-black text-sm hover:shadow-xl active:scale-95 transition-all"
            >
              学校を追加する
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 px-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800">{user && mySchoolIds.length > 0 ? '学校の出品フィード' : '最新の出品フィード'}</h2>
          {(debouncedSearch || sortBy !== 'newest') && (
            <p className="mt-1 text-xs font-bold text-slate-400">
              {debouncedSearch ? `「${debouncedSearch}」の検索結果` : '並び替え中'} ・ {SORT_OPTIONS.find((option) => option.id === sortBy)?.label}
            </p>
          )}
        </div>
        {user && mySchoolIds.length > 0 && (
          <Link to="/schools" className="text-sm font-bold text-lime-600 flex items-center gap-1 hover:underline">
            <Plus size={16} />
            学校を追加
          </Link>
        )}
      </div>

      {loading || fetchingSchools ? (
        <div className="grid gap-6">
          {[1, 2, 3, 4].map((item) => (
            <PostCardSkeleton key={item} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-8">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
            <School size={40} />
          </div>
          <p className="text-slate-400 font-black text-lg">表示できるアイテムがありません。</p>
          <p className="text-slate-300 text-sm mt-1 font-medium">検索ワードや条件を変えて、もう一度探してみてください。</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {posts.map((post) => {
            const thumbnail = post.post_images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path;
            const isWishlisted = wishlistIds.includes(post.id);
            const categoryInfo = CATEGORY_MAP[post.category];

            return (
              <div key={post.id} className="relative">
                <Link
                  to={`/post/${post.id}`}
                  className="group bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all flex gap-5 active:scale-[0.98] relative"
                >
                  <div className="w-28 h-28 shrink-0 rounded-[1.5rem] bg-slate-50 overflow-hidden border border-slate-50 shadow-inner relative">
                    <StatusBadge status={post.status} className="absolute top-2 left-2 z-10 shadow-sm backdrop-blur-md bg-white/90" />
                    {thumbnail ? (
                      <img src={thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <School size={32} strokeWidth={1} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1 text-left">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5 pr-8">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            post.mode === 'GIVEAWAY' ? 'bg-lime-50 text-lime-600' : 'bg-purple-50 text-purple-600'
                          }`}
                        >
                          {post.mode === 'GIVEAWAY' ? '無料譲渡' : '交換'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${categoryInfo?.color || 'bg-slate-100'}`}>
                          {categoryInfo?.label}
                        </span>
                        {post.item_size && (
                          <span className="px-2 py-0.5 bg-slate-800 text-white rounded-md text-[9px] font-black uppercase tracking-wider">
                            Size: {post.item_size}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 truncate">{post.schools?.name_ja}</span>
                      </div>
                      <h2 className="text-xl font-black text-slate-800 truncate group-hover:text-lime-600 transition-colors mb-1">{post.title}</h2>
                      <p className="text-slate-500 text-xs line-clamp-1 font-medium">{post.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <Link
                        to={`/user/${post.user_id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="flex items-center gap-2 hover:text-lime-600 transition-colors"
                      >
                        <div className="w-6 h-6 bg-sky-50 rounded-full flex items-center justify-center text-sky-600 font-black text-[10px]">
                          {post.profiles.display_name[0]}
                        </div>
                        <span className="text-xs font-bold">{post.profiles.display_name}</span>
                        <VerifiedBadge verified={(post.profiles as any).email_verified} size="sm" showTooltip={false} />
                      </Link>

                      <div className="flex items-center gap-2">
                        <MannerTempGauge temp={(post.profiles as any).manner_temp ?? 36.5} size="sm" />
                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span className="text-slate-700">{post.profiles.avg_rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>

                <button
                  onClick={(event) => toggleWishlist(event, post.id)}
                  className={`absolute top-4 right-4 p-2 rounded-xl transition-all z-10 ${
                    isWishlisted ? 'bg-pink-50 text-pink-500' : 'bg-slate-50 text-slate-300 hover:text-pink-400'
                  }`}
                >
                  <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
                </button>
              </div>
            );
          })}

          <div ref={sentinelRef} className="py-2">
            {loadingMore && (
              <div className="flex items-center justify-center gap-3 py-6">
                <Loader2 className="animate-spin text-lime-500" size={24} />
                <span className="text-sm font-bold text-slate-400">読み込み中...</span>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8">
                <p className="text-slate-300 text-sm font-bold">すべてのアイテムを表示しました</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
