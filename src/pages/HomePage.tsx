import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Post, PostCategory, PostCondition } from '../types';
import { 
  Search, 
  Loader2, 
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
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const CATEGORY_MAP: Record<PostCategory, { label: string, icon: any, color: string }> = {
  Uniform: { label: '制服・衣類', icon: Shirt, color: 'bg-blue-50 text-blue-600' },
  Textbook: { label: '教科書・書籍', icon: Book, color: 'bg-amber-50 text-amber-600' },
  Digital: { label: 'IT・デジタル', icon: Cpu, color: 'bg-purple-50 text-purple-600' },
  ArtSport: { label: '芸術・体育', icon: Palette, color: 'bg-rose-50 text-rose-600' },
  Life: { label: '生活用品', icon: Coffee, color: 'bg-emerald-50 text-emerald-600' },
  Other: { label: 'その他', icon: Layers, color: 'bg-slate-50 text-slate-600' },
};

const CATEGORY_LIST: { id: PostCategory | 'All', label: string, icon: any }[] = [
  { id: 'All', label: 'すべて', icon: LayoutGrid },
  { id: 'Uniform', label: '制服・衣類', icon: Shirt },
  { id: 'Textbook', label: '教科書・書籍', icon: Book },
  { id: 'Digital', label: 'IT・デジタル', icon: Cpu },
  { id: 'ArtSport', label: '芸術・体育', icon: Palette },
  { id: 'Life', label: '生活用品', icon: Coffee },
  { id: 'Other', label: 'その他', icon: Layers },
];

const CONDITION_LIST: { id: PostCondition | 'All', label: string }[] = [
  { id: 'All', label: 'すべて' },
  { id: 'Like New', label: '未使用に近い' },
  { id: 'Good', label: '目立った傷なし' },
  { id: 'Used', label: '使用感あり' },
];

export const HomePage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<PostCategory | 'All'>('All');
  const [activeCondition, setActiveCondition] = useState<PostCondition | 'All'>('All');
  const [sizeFilter, setSizeFilter] = useState('');
  const [mySchoolIds, setMySchoolIds] = useState<string[]>([]);
  const [fetchingSchools, setFetchingSchools] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMySchools();
      fetchWishlist();
    } else {
      fetchPosts([], activeCategory, activeCondition, sizeFilter);
    }
  }, [user, search, activeCategory, activeCondition, sizeFilter]);

  const fetchWishlist = async () => {
    const { data } = await supabase.from('wishlists').select('post_id').eq('user_id', user?.id);
    if (data) setWishlistIds(data.map(d => d.post_id));
  };

  const fetchMySchools = async () => {
    setFetchingSchools(true);
    const { data } = await supabase
      .from('user_schools')
      .select('school_id')
      .eq('user_id', user?.id);
    
    const ids = data?.map(d => d.school_id) || [];
    setMySchoolIds(ids);
    fetchPosts(ids, activeCategory, activeCondition, sizeFilter);
    setFetchingSchools(false);
  };

  const fetchPosts = async (schoolIds: string[], category: PostCategory | 'All', condition: PostCondition | 'All', size: string) => {
    setLoading(true);
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles (display_name, completed_count, avg_rating),
        schools (name_ja),
        post_images (storage_path)
      `)
      .eq('status', 'Available')
      .order('created_at', { ascending: false });

    if (schoolIds.length > 0) {
      query = query.in('school_id', schoolIds);
    }

    if (category !== 'All') {
      query = query.eq('category', category);
    }

    if (condition !== 'All') {
      query = query.eq('condition', condition);
    }

    if (size.trim()) {
      query = query.ilike('item_size', `%${size}%`);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data } = await query;
    if (data) setPosts(data as any[]);
    setLoading(false);
  };

  const toggleWishlist = async (e: React.MouseEvent, postId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return alert('ログインが必要です。');

    const isWishlisted = wishlistIds.includes(postId);
    if (isWishlisted) {
      const { error } = await supabase.from('wishlists').delete().eq('user_id', user.id).eq('post_id', postId);
      if (!error) setWishlistIds(prev => prev.filter(id => id !== postId));
    } else {
      const { error } = await supabase.from('wishlists').insert({ user_id: user.id, post_id: postId });
      if (!error) setWishlistIds(prev => [...prev, postId]);
    }
  };

  const clearFilters = () => {
    setActiveCondition('All');
    setSizeFilter('');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32">
      <header className="pt-8 mb-8 text-center">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
          Campus<span className="text-lime-500">Relay</span>
        </h1>
        <p className="text-slate-500 font-medium italic">学校のニュースと出品をひと目で</p>
      </header>

      <div className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="アイテムや学校名を検索"
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-sm border border-slate-100 font-bold focus:ring-4 focus:ring-lime-500/10 focus:border-lime-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 rounded-2xl border transition-all flex items-center justify-center gap-2 font-bold ${
            showFilters || activeCondition !== 'All' || sizeFilter 
              ? 'bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-800/20' 
              : 'bg-white text-slate-400 border-slate-100'
          }`}
        >
          <Filter size={20} />
          <span className="hidden sm:inline">フィルタ</span>
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 mb-8 animate-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800">詳細検索</h3>
            <button onClick={clearFilters} className="text-xs font-black text-slate-400 hover:text-red-500 flex items-center gap-1">
              <X size={14} /> フィルタ解除
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">状態</label>
              <div className="flex flex-wrap gap-2">
                {CONDITION_LIST.map(cond => (
                  <button
                    key={cond.id}
                    onClick={() => setActiveCondition(cond.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeCondition === cond.id 
                        ? 'bg-lime-500 text-white shadow-md shadow-lime-500/20' 
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {cond.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">サイズ (例: 140, M, LL)</label>
              <input 
                type="text"
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                placeholder="サイズを入力..."
                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-lime-500 outline-none font-bold text-sm transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* Category Quick Menu */}
      <div className="flex gap-4 overflow-x-auto pb-4 mb-8 no-scrollbar -mx-2 px-2">
        {CATEGORY_LIST.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className="flex flex-col items-center gap-2 shrink-0 group"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              activeCategory === cat.id 
                ? 'bg-lime-500 text-white shadow-lg shadow-lime-500/30 scale-110' 
                : 'bg-white text-slate-400 border border-slate-100 hover:border-lime-200 hover:text-lime-500'
            }`}>
              <cat.icon size={24} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-tighter ${
              activeCategory === cat.id ? 'text-lime-600' : 'text-slate-400'
            }`}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      {user && !fetchingSchools && mySchoolIds.length === 0 && (
        <div className="bg-gradient-to-br from-lime-500 to-lime-600 rounded-[2.5rem] p-8 mb-8 text-white shadow-lg shadow-lime-500/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-2">登録された学校がありません！</h3>
            <p className="text-lime-50 font-medium mb-6 opacity-90">学校を追加して、最新の出品情報をチェックしましょう。</p>
            <Link 
              to="/schools" 
              className="inline-flex items-center gap-2 bg-white text-lime-600 px-6 py-3 rounded-xl font-black text-sm hover:shadow-xl active:scale-95 transition-all"
            >
              学校を追加する <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-2xl font-black text-slate-800">
          {user && mySchoolIds.length > 0 ? '学校の出品情報' : '最新の出品フィード'}
        </h2>
        {user && mySchoolIds.length > 0 && (
          <Link to="/schools" className="text-sm font-bold text-lime-600 flex items-center gap-1 hover:underline">
            <Plus size={16} /> 学校追加
          </Link>
        )}
      </div>

      {loading || fetchingSchools ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-lime-500" size={40} />
          <p className="text-slate-400 font-bold">フィードを準備중...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-8">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
            <School size={40} />
          </div>
          <p className="text-slate-400 font-black text-lg">表示するアイテムがありません。</p>
          <p className="text-slate-300 text-sm mt-1 font-medium">検索ワードを変えるか、別のカテゴリーを選択してみてください！</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {posts.map((post) => {
            const thumbnail = post.post_images?.sort((a,b) => a.sort_order - b.sort_order)[0]?.storage_path;
            const isWishlisted = wishlistIds.includes(post.id);
            const categoryInfo = CATEGORY_MAP[post.category];

            return (
              <div key={post.id} className="relative">
                <Link 
                  to={`/post/${post.id}`}
                  className="group bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all flex gap-5 active:scale-[0.98] relative"
                >
                  <div className="w-28 h-28 shrink-0 rounded-[1.5rem] bg-slate-50 overflow-hidden border border-slate-50 shadow-inner">
                    {thumbnail ? (
                      <img src={thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <School size={32} strokeWidth={1} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1 text-left">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          post.mode === 'GIVEAWAY' ? 'bg-lime-50 text-lime-600' : 'bg-purple-50 text-purple-600'
                        }`}>
                          {post.mode}
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
                      <h2 className="text-xl font-black text-slate-800 truncate group-hover:text-lime-600 transition-colors mb-1">
                        {post.title}
                      </h2>
                      <p className="text-slate-500 text-xs line-clamp-1 font-medium">{post.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <Link 
                        to={`/user/${post.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 hover:text-lime-600 transition-colors"
                      >
                        <div className="w-6 h-6 bg-sky-50 rounded-full flex items-center justify-center text-sky-600 font-black text-[10px]">
                          {post.profiles.display_name[0]}
                        </div>
                        <span className="text-xs font-bold">{post.profiles.display_name}</span>
                      </Link>
                      <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                        <Star size={12} className="fill-amber-400 text-amber-400" /> 
                        <span className="text-slate-700">{post.profiles.avg_rating}</span>
                      </div>
                    </div>
                  </div>
                </Link>
                {/* Wishlist Button */}
                <button 
                  onClick={(e) => toggleWishlist(e, post.id)}
                  className={`absolute top-4 right-4 p-2 rounded-xl transition-all z-10 ${
                    isWishlisted ? 'bg-pink-50 text-pink-500' : 'bg-slate-50 text-slate-300 hover:text-pink-400'
                  }`}
                >
                  <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
