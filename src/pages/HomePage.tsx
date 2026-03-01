import { useEffect, useState } from 'react';
import type { Post, ItemCategory, ItemStatus, ItemCondition } from '../types';
import { mockApi } from '../services/mockApi';
import { ItemCard } from '../components/ItemCard';
import { Search, Plus, SlidersHorizontal, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const CATEGORIES: ItemCategory[] = ['制服', '教科書', '学用品', 'その他'];
const STATUSES: ItemStatus[] = ['受付中', '予約済み', '譲渡済み'];
const CONDITIONS: ItemCondition[] = ['未使用に近い', '目立った傷なし', '사용감 있음'];

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
      const data = await mockApi.getPosts('s1');
      setPosts(data);
      setLoading(false);
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
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
             みんなでつなぐ、0円の輪。学内の不用品を次に必要な人へ。
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="欲しいものを検索..."
              className="pl-10 pr-4 py-2 bg-white rounded-2xl border-none card-shadow focus:ring-2 focus:ring-primary w-full md:w-64 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl card-shadow transition-colors ${showFilters ? 'bg-primary text-white' : 'bg-white text-slate-500'}`}
          >
            <SlidersHorizontal size={20} />
          </button>
          <Link 
            to="/post/new"
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-2xl font-bold card-shadow hover:bg-primary-dark transition-all hover:scale-[1.02]"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">譲る</span>
          </Link>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white p-6 rounded-3xl card-shadow mb-8 border border-primary-light/30">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800">絞り込み検索</h3>
            <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">ステータス</span>
              <div className="flex flex-wrap gap-2">
                <FilterButton active={activeStatus === 'All'} onClick={() => setActiveStatus('All')}>すべて</FilterButton>
                {STATUSES.map(s => (
                  <FilterButton key={s} active={activeStatus === s} onClick={() => setActiveStatus(s)}>{s}</FilterButton>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">商品の状態</span>
              <div className="flex flex-wrap gap-2">
                <FilterButton active={activeCondition === 'All'} onClick={() => setActiveCondition('All')}>すべて</FilterButton>
                {CONDITIONS.map(c => (
                  <FilterButton key={c} active={activeCondition === c} onClick={() => setActiveCondition(c)}>{c}</FilterButton>
                ))}
              </div>
            </div>
            <div className="flex items-end">
               <button 
                 onClick={() => { setActiveStatus('受付中'); setActiveCondition('All'); setActiveCategory('All'); setSearchQuery(''); }}
                 className="text-xs font-bold text-primary hover:underline"
               >
                 条件をリセット
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-4 mb-6 no-scrollbar">
        <button 
          onClick={() => setActiveCategory('All')}
          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
            activeCategory === 'All' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          すべてのアイテム
        </button>
        {CATEGORIES.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
              activeCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-3xl h-72 card-shadow border border-slate-50"></div>
          ))}
        </div>
      ) : filteredPosts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPosts.map(post => (
            <ItemCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-[3rem] card-shadow border border-slate-50">
          <div className="bg-primary-light w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-primary" size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-1">アイテムが見つかりません</h3>
          <p className="text-slate-400 font-medium">条件を変更して再度検索してみてください。</p>
        </div>
      )}
    </div>
  );
};

const FilterButton = ({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
      active ? 'bg-secondary text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
    }`}
  >
    {children}
  </button>
);
