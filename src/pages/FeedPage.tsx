import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Post } from '../types';
import { Plus, Loader2, ArrowLeft, Package, Star } from 'lucide-react';

export const FeedPage = () => {
  const { schoolId } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState('');
  const [statusFilter, setStatusFilter] = useState('Available');

  useEffect(() => {
    fetchSchoolInfo();
    fetchPosts();
  }, [schoolId, statusFilter]);

  const fetchSchoolInfo = async () => {
    const { data } = await supabase.from('schools').select('name_ja').eq('id', schoolId).single();
    if (data) setSchoolName(data.name_ja);
  };

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (display_name, completed_count, avg_rating, rating_count),
        post_images (storage_path, sort_order)
      `)
      .eq('school_id', schoolId)
      .eq('status', statusFilter)
      .order('created_at', { ascending: false });
    
    if (data) setPosts(data as any[]);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <header className="pt-8 mb-8">
        <Link to="/schools" className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-4 hover:text-lime-600 transition-colors">
          <ArrowLeft size={16} /> 학교 선택으로 돌아가기
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{schoolName}</h1>
            <p className="text-slate-500 font-medium mt-1 italic">우리 학교 실시간 나눔 피드</p>
          </div>
          <Link 
            to={`/post/new?schoolId=${schoolId}`}
            className="bg-lime-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-lime-500/30 hover:bg-lime-600 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            나눔하기
          </Link>
        </div>
      </header>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'Available', label: '나눔 중' },
          { id: 'Reserved', label: '예약됨' },
          { id: 'Given', label: '완료된 나눔' }
        ].map(status => (
          <button
            key={status.id}
            onClick={() => setStatusFilter(status.id)}
            className={`px-6 py-2.5 rounded-full font-black text-sm transition-all whitespace-nowrap ${
              statusFilter === status.id 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300'
            }`}
          >
            {status.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="animate-spin text-lime-500 mb-4" size={40} />
          <p className="text-slate-400 font-bold">아이템을 불러오는 중...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="text-slate-200" size={40} />
          </div>
          <p className="text-slate-400 font-bold text-lg">아직 등록된 아이템이 없습니다.</p>
          <p className="text-slate-300 text-sm mt-1">학교의 첫 번째 나눔 주인공이 되어보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {posts.map(post => {
            const thumbnail = post.post_images?.sort((a,b) => a.sort_order - b.sort_order)[0]?.storage_path;
            
            return (
              <Link 
                key={post.id} 
                to={`/post/${post.id}`}
                className="group bg-white rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all overflow-hidden flex flex-col"
              >
                {/* Thumbnail Container */}
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                  {thumbnail ? (
                    <img 
                      src={thumbnail} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
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
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{post.category}</span>
                    <span className="text-[10px] font-bold text-slate-300">{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <h2 className="text-xl font-black text-slate-800 mb-3 group-hover:text-lime-600 transition-colors line-clamp-1">{post.title}</h2>
                  <p className="text-slate-500 text-sm mb-6 line-clamp-2 font-medium flex-1">{post.description}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-sky-50 rounded-full flex items-center justify-center text-sky-600 font-black text-xs border border-sky-100">
                        {post.profiles.display_name[0]}
                      </div>
                      <span className="text-sm font-bold text-slate-600">{post.profiles.display_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs font-black text-slate-700">{post.profiles.avg_rating}</span>
                      <span className="text-[10px] font-bold text-slate-300">({post.profiles.rating_count})</span>
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
