import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Post } from '../types';
import { Plus, Loader2, ArrowLeft, Package, Star, Search, Filter, Clock } from 'lucide-react';
import { CATEGORY_MAP } from './HomePage';

export const FeedPage = () => {
  const { schoolId } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState('');
  
  // --- Search & Filter States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Available' | 'Reserved' | 'Given'>('Available');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchSchoolInfo();
  }, [schoolId]);

  useEffect(() => {
    fetchPosts();
  }, [schoolId, statusFilter, debouncedQuery, sortBy]);

  const fetchSchoolInfo = async () => {
    const { data } = await supabase.from('schools').select('name_ja').eq('id', schoolId).single();
    if (data) setSchoolName(data.name_ja);
  };

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles (display_name, completed_count, avg_rating, rating_count),
        post_images (storage_path, sort_order)
      `)
      .eq('school_id', schoolId);

    // Apply Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'Available') {
        query = query.or(`status.eq.Available,status.is.null`);
      } else {
        query = query.eq('status', statusFilter);
      }
    }

    // Apply Search
    if (debouncedQuery) {
      query = query.ilike('title', `%${debouncedQuery}%`);
    }

    // Apply Sorting
    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true });
    }

    const { data } = await query;
    if (data) setPosts(data as any[]);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32">
      <header className="pt-8 mb-6">
        <Link to="/schools" className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-4 hover:text-lime-600 transition-colors">
          <ArrowLeft size={16} /> 学校選択に戻る
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{schoolName}</h1>
            <p className="text-slate-500 font-medium mt-1 italic">学校のリアルタイム出品フィード</p>
          </div>
          <Link 
            to={`/post/new?schoolId=${schoolId}`}
            className="bg-lime-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-lime-500/30 hover:bg-lime-600 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            出品する
          </Link>
        </div>
      </header>

      {/* ─── Search & Filters Bar ─── */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mb-8 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="text-slate-400" size={20} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="アイテムを検索..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none transition-all font-medium text-slate-700"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all ${
              showFilters ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Filter size={18} />
            <span className="hidden sm:inline">フィルター</span>
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 opacity-0 fade-in duration-200 fill-mode-forwards">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">取引ステータス</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'ALL', label: 'すべて' },
                  { id: 'Available', label: '受付中' },
                  { id: 'Reserved', label: '予約済み' },
                  { id: 'Given', label: '譲渡済み' }
                ].map(status => (
                  <button
                    key={status.id}
                    onClick={() => setStatusFilter(status.id as any)}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
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
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">並び替え</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'newest', label: '新着順', icon: <Clock size={14} /> },
                  { id: 'oldest', label: '古い順', icon: <Clock size={14} /> }
                ].map(sort => (
                  <button
                    key={sort.id}
                    onClick={() => setSortBy(sort.id as any)}
                    className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all ${
                      sortBy === sort.id 
                        ? 'bg-slate-800 text-white shadow-md' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {sort.icon}
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Feed Content ─── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="animate-spin text-lime-500 mb-4" size={40} />
          <p className="text-slate-400 font-bold">アイテムを検索中...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="text-slate-200" size={40} />
          </div>
          <p className="text-slate-400 font-bold text-lg mb-2">アイテムが見つかりませんでした。</p>
          <p className="text-slate-400 text-sm">検索条件を変更して再度お試しください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {posts.map(post => {
            const thumbnail = post.post_images?.sort((a,b) => a.sort_order - b.sort_order)[0]?.storage_path;
            const categoryInfo = CATEGORY_MAP[post.category];
            const isCompleted = post.status === 'Given';
            
            return (
              <Link 
                key={post.id} 
                to={`/post/${post.id}`}
                className={`group bg-white rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl transition-all overflow-hidden flex flex-col ${
                  isCompleted ? 'opacity-60 grayscale-[30%]' : ''
                }`}
              >
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                  {thumbnail ? (
                    <img src={thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package size={48} strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm ${
                      post.mode === 'GIVEAWAY' ? 'bg-lime-500/90 text-white' : 'bg-purple-500/90 text-white'
                    }`}>
                      {post.mode}
                    </span>
                    {post.status === 'Reserved' && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/90 text-white backdrop-blur-md shadow-sm">
                        予約済み
                      </span>
                    )}
                    {post.status === 'Given' && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-800/90 text-white backdrop-blur-md shadow-sm">
                        譲渡済み
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${categoryInfo?.color || 'bg-slate-100'}`}>
                      {categoryInfo?.label}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300">{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <h2 className="text-xl font-black text-slate-800 mb-3 group-hover:text-lime-600 transition-colors line-clamp-1">{post.title}</h2>
                  <p className="text-slate-500 text-sm mb-6 line-clamp-2 font-medium flex-1">{post.description}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-sky-50 rounded-full flex items-center justify-center text-sky-600 font-black text-xs">
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
        </div>
      )}
    </div>
  );
};
