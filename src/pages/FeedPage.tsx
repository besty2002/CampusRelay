import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Post } from '../types';
import { Search, Plus, Filter, Loader2, ArrowLeft } from 'lucide-react';

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
      .select('*, profiles(display_name, completed_count)')
      .eq('school_id', schoolId)
      .eq('status', statusFilter)
      .order('created_at', { ascending: false });
    
    if (data) setPosts(data as any);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <header className="pt-8 mb-8">
        <Link to="/schools" className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-4 hover:text-lime-600 transition-colors">
          <ArrowLeft size={16} /> 학교 선택으로 돌아가기
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{schoolName}</h1>
            <p className="text-slate-400 font-medium mt-1">우리 학교 나눔 피드</p>
          </div>
          <Link 
            to={`/post/new?schoolId=${schoolId}`}
            className="bg-lime-500 text-white p-4 rounded-2xl shadow-lg shadow-lime-500/30 hover:bg-lime-600 active:scale-95 transition-all"
          >
            <Plus size={24} />
          </Link>
        </div>
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {['Available', 'Reserved', 'Given'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-6 py-2.5 rounded-full font-black text-sm transition-all whitespace-nowrap ${
              statusFilter === status 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300'
            }`}
          >
            {status === 'Available' ? '나눔 중' : status === 'Reserved' ? '예약됨' : '나눔 완료'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-lime-500 mb-4" size={32} />
          <p className="text-slate-400 font-bold">게시글을 불러오는 중...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
          <p className="text-slate-400 font-bold">등록된 아이템이 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map(post => (
            <Link 
              key={post.id} 
              to={`/post/${post.id}`}
              className="group bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all active:scale-[0.99]"
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                  post.mode === 'GIVEAWAY' ? 'bg-lime-50 text-lime-600' : 'bg-purple-50 text-purple-600'
                }`}>
                  {post.mode === 'GIVEAWAY' ? 'Free Giveaway' : 'Exchange'}
                </span>
                <span className="text-[10px] text-slate-300 font-bold">{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
              
              <h2 className="text-xl font-black text-slate-800 mb-2 group-hover:text-lime-600 transition-colors">{post.title}</h2>
              <p className="text-slate-500 text-sm mb-6 line-clamp-2 font-medium">{post.description}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 font-black text-xs">
                    {post.profiles.display_name[0]}
                  </div>
                  <span className="text-sm font-bold text-slate-600">{post.profiles.display_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Completed</span>
                  <span className="bg-sky-50 text-sky-600 px-2 py-0.5 rounded-md text-xs font-black">{post.profiles.completed_count}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
