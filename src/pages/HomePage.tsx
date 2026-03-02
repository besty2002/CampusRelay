import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Post, PostCategory } from '../types';
import { Search, Loader2, Plus, School, ArrowRight, Star, Book, Shirt, PenTool, LayoutGrid, Layers, Heart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const CATEGORIES: { id: PostCategory | 'All', label: string, icon: any }[] = [
  { id: 'All', label: '전체', icon: LayoutGrid },
  { id: 'Uniform', label: '교복/의류', icon: Shirt },
  { id: 'Textbook', label: '교과서/도서', icon: Book },
  { id: 'Supplies', label: '학용품', icon: PenTool },
  { id: 'Other', label: '기타', icon: Layers },
];

export const HomePage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<PostCategory | 'All'>('All');
  const [mySchoolIds, setMySchoolIds] = useState<string[]>([]);
  const [fetchingSchools, setFetchingSchools] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMySchools();
      fetchWishlist();
    } else {
      fetchPosts([], activeCategory);
    }
  }, [user, search, activeCategory]);

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
    fetchPosts(ids, activeCategory);
    setFetchingSchools(false);
  };

  const fetchPosts = async (schoolIds: string[], category: PostCategory | 'All') => {
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
    if (!user) return alert('로그인이 필요합니다.');

    const isWishlisted = wishlistIds.includes(postId);
    if (isWishlisted) {
      const { error } = await supabase.from('wishlists').delete().eq('user_id', user.id).eq('post_id', postId);
      if (!error) setWishlistIds(prev => prev.filter(id => id !== postId));
    } else {
      const { error } = await supabase.from('wishlists').insert({ user_id: user.id, post_id: postId });
      if (!error) setWishlistIds(prev => [...prev, postId]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32">
      <header className="pt-8 mb-8 text-center">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
          Campus<span className="text-lime-500">Relay</span>
        </h1>
        <p className="text-slate-500 font-medium italic">우리 학교 소식과 나눔을 한눈에</p>
      </header>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="아이템이나 학교 이름을 검색해보세요"
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-sm border border-slate-100 font-bold focus:ring-4 focus:ring-lime-500/10 focus:border-lime-500 outline-none transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 mb-8 no-scrollbar -mx-2 px-2">
        {CATEGORIES.map((cat) => (
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
            <h3 className="text-xl font-black mb-2">등록된 학교가 없습니다!</h3>
            <p className="text-lime-50 font-medium mb-6 opacity-90">우리 학교를 추가하고 따끈따끈한 나눔 소식을 받아보세요.</p>
            <Link 
              to="/schools" 
              className="inline-flex items-center gap-2 bg-white text-lime-600 px-6 py-3 rounded-xl font-black text-sm hover:shadow-xl active:scale-95 transition-all"
            >
              학교 추가하러 가기 <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-2xl font-black text-slate-800">
          {user && mySchoolIds.length > 0 ? '우리 학교 나눔 소식' : '최신 나눔 피드'}
        </h2>
        {user && mySchoolIds.length > 0 && (
          <Link to="/schools" className="text-sm font-bold text-lime-600 flex items-center gap-1 hover:underline">
            <Plus size={16} /> 학교 추가
          </Link>
        )}
      </div>

      {loading || fetchingSchools ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-lime-500" size={40} />
          <p className="text-slate-400 font-bold">맞춤형 피드 준비 중...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-8">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
            <School size={40} />
          </div>
          <p className="text-slate-400 font-black text-lg">표시할 나눔이 없습니다.</p>
          <p className="text-slate-300 text-sm mt-1 font-medium">검색어를 바꾸거나 다른 카테고리를 선택해 보세요!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {posts.map((post) => {
            const thumbnail = post.post_images?.sort((a,b) => a.sort_order - b.sort_order)[0]?.storage_path;
            const isWishlisted = wishlistIds.includes(post.id);
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
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          post.mode === 'GIVEAWAY' ? 'bg-lime-50 text-lime-600' : 'bg-purple-50 text-purple-600'
                        }`}>
                          {post.mode}
                        </span>
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
