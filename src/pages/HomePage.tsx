import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Post, ItemCategory, ItemStatus, ItemCondition } from '../types';
import { ItemCard } from '../components/ItemCard';
import { Search, Plus, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const CATEGORIES: ItemCategory[] = ['制服', '教科書', '学用品', 'その他'];
const STATUSES: ItemStatus[] = ['受付中', '予約済み', '譲渡済み'];
const CONDITIONS: ItemCondition[] = ['未使用に近い', '目立った傷なし', '使用感あり'];

export const HomePage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'All'>('All');
  const [activeStatus, setActiveStatus] = useState<ItemStatus | 'All'>('受付中');
  const [activeCondition, setActiveCondition] = useState<ItemCondition | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        // 1. Supabase에서 데이터 가져오기
        const { data: supabasePosts, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // 2. LocalStorage에서 데이터 가져오기 (테이블이 없거나 오프라인일 때 대비)
        const localPosts = JSON.parse(localStorage.getItem('local_posts') || '[]');
        
        // 3. 데이터 형식 통일 (Supabase snake_case 대응)
        const formattedSupabasePosts = (supabasePosts || []).map((p: any) => ({
          ...p,
          pickupMethod: p.pickup_method,
          giverId: p.giver_id,
          giverName: p.giver_name,
          schoolId: p.school_id,
          createdAt: p.created_at,
          exchangeFor: p.exchange_for
        }));

        setPosts([...formattedSupabasePosts, ...localPosts]);
      } catch (err) {
        console.error('Error fetching posts:', err);
        // 에러 시 로컬 데이터만이라도 표시
        const localPosts = JSON.parse(localStorage.getItem('local_posts') || '[]');
        setPosts(localPosts);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const filteredPosts = posts.filter(post => {
    const matchesCategory = activeCategory === 'All' || post.category === activeCategory;
    const matchesStatus = activeStatus === 'All' || post.status === activeStatus;
    const matchesCondition = activeCondition === 'All' || post.condition === activeCondition;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesCondition && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
             新田学園 <span className="text-primary">リレーシェア</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
             みんなでつなぐ、0円의 輪。学内の不用品を次に必要な人へ。
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="欲しいものを検索..."
              className="pl-10 pr-4 py-2.5 bg-white rounded-2xl border-none card-shadow focus:ring-4 focus:ring-primary/10 w-full md:w-64 text-sm font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-2xl card-shadow transition-all active:scale-95 ${showFilters ? 'bg-primary text-white' : 'bg-white text-slate-500'}`}
          >
            <SlidersHorizontal size={20} />
          </button>
          <Link 
            to="/post/new"
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-black card-shadow hover:bg-primary-dark transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">譲る</span>
          </Link>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white p-8 rounded-[2rem] card-shadow mb-8 border border-primary-light/30 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">絞り込み検索</h3>
            <button onClick={() => setShowFilters(false)} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={20}/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-widest">ステータス</span>
              <div className="flex flex-wrap gap-2">
                <FilterButton active={activeStatus === 'All'} onClick={() => setActiveStatus('All')}>すべて</FilterButton>
                {STATUSES.map(s => (
                  <FilterButton key={s} active={activeStatus === s} onClick={() => setActiveStatus(s)}>{s}</FilterButton>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-widest">商品の状態</span>
              <div className="flex flex-wrap gap-2">
                <FilterButton active={activeCondition === 'All'} onClick={() => setActiveCondition('All')}>すべて</FilterButton>
                {CONDITIONS.map(c => (
                  <FilterButton key={c} active={activeCondition === c} onClick={() => setActiveCondition(c)}>{c}</FilterButton>
                ))}
              </div>
            </div>
            <div className="flex items-end justify-end">
               <button 
                 onClick={() => { setActiveStatus('受付中'); setActiveCondition('All'); setActiveCategory('All'); setSearchQuery(''); }}
                 className="text-xs font-black text-primary hover:text-primary-dark transition-colors uppercase tracking-widest"
               >
                 条件をリセット
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex overflow-x-auto gap-3 pb-6 mb-6 no-scrollbar">
        <button 
          onClick={() => setActiveCategory('All')}
          className={`px-6 py-3 rounded-2xl text-sm font-black transition-all whitespace-nowrap active:scale-95 ${
            activeCategory === 'All' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105' : 'bg-white text-slate-500 hover:bg-slate-50 card-shadow border border-slate-50'
          }`}
        >
          すべてのアイテム
        </button>
        {CATEGORIES.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-3 rounded-2xl text-sm font-black transition-all whitespace-nowrap active:scale-95 ${
              activeCategory === cat ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105' : 'bg-white text-slate-500 hover:bg-slate-50 card-shadow border border-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-slate-400 font-bold">アイテムを読み込み中...</p>
        </div>
      ) : filteredPosts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {filteredPosts.map(post => (
            <ItemCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-[3rem] card-shadow border border-slate-50">
          <div className="bg-primary-light/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="text-primary" size={32} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">アイテムが見つかりません</h3>
          <p className="text-slate-400 font-bold">条件を変更して再度検索してみてください。</p>
        </div>
      )}
    </div>
  );
};

const FilterButton = ({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 ${
      active ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
    }`}
  >
    {children}
  </button>
);
