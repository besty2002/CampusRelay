import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Post } from '../types';
import { Search, Loader2 } from 'lucide-react';

export const HomePage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [search]);

  const fetchPosts = async () => {
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

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data } = await query;
    if (data) setPosts(data as any[]);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <header className="pt-8 mb-8 text-center">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
          Campus<span className="text-lime-500">Relay</span>
        </h1>
        <p className="text-slate-500 font-medium">아다치구 학교 간 무료 나눔 플랫폼</p>
      </header>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="어떤 아이템을 찾으시나요?"
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-sm border border-slate-100 font-bold focus:ring-2 focus:ring-lime-500 outline-none transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-lime-500" size={32} />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
          <p className="text-slate-400 font-bold">등록된 나눔 아이템이 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Link 
              key={post.id} 
              to={`/post/${post.id}`}
              className="group bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all flex gap-4"
            >
              <div className="w-24 h-24 shrink-0 rounded-2xl bg-slate-100 overflow-hidden">
                {post.post_images && post.post_images.length > 0 ? (
                  <img src={post.post_images[0].storage_path} alt={post.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-bold">No Image</div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                      post.mode === 'GIVEAWAY' ? 'bg-lime-50 text-lime-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                      {post.mode}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{post.schools?.name_ja}</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-800 truncate group-hover:text-lime-600 transition-colors">
                    {post.title}
                  </h2>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                  <span className="text-xs font-bold text-slate-600">{post.profiles.display_name}</span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <span className="text-amber-400">★</span> {post.profiles.avg_rating} ({post.profiles.rating_count})
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
