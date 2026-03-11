import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Post, Profile } from '../types';
import { 
  User, 
  Star, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  Package, 
  ChevronRight,
  MessageSquare
} from 'lucide-react';

export const UserPublicProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchPublicData();
    }
  }, [userId]);

  const fetchPublicData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileData) setProfile(profileData);

      // 2. Fetch Active Posts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          post_images (storage_path),
          schools (name_ja)
        `)
        .eq('user_id', userId)
        .eq('status', 'Available')
        .order('created_at', { ascending: false });

      if (postsData) setPosts(postsData as any[]);

      // 3. Fetch Reviews received by this user
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          *,
          from_profiles:profiles!reviews_from_user_id_fkey (display_name)
        `)
        .eq('to_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (reviewsData) setReviews(reviewsData);

    } catch (err) {
      console.error('Error fetching public profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-lime-500" />
    </div>
  );

  if (!profile) return <div className="p-8 text-center font-bold">ユーザーが見つかりません。</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pt-12 pb-32">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 font-bold mb-8 hover:text-lime-600 transition-colors">
        <ArrowLeft size={20} /> 戻る
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-[3rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 relative overflow-hidden text-center">
        <div className="absolute top-0 left-0 w-full h-2 bg-lime-500" />
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg text-lime-500">
          <User size={48} />
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-1">{profile.display_name}</h1>
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-sky-50 text-sky-600 text-xs font-black rounded-full border border-sky-100">
            <ShieldCheck size={14} /> Member
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full pt-6 border-t border-slate-50">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">お譲り完了</p>
            <p className="text-2xl font-black text-slate-800">{profile.completed_count}</p>
          </div>
          <div className="text-center border-l border-slate-50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">平均評価</p>
            <div className="flex items-center justify-center gap-1">
              <Star size={18} className="fill-amber-400 text-amber-400" />
              <p className="text-2xl font-black text-slate-800">{profile.avg_rating}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Posts */}
      <div className="mb-12">
        <h2 className="text-xl font-black text-slate-800 mb-6 px-2 flex items-center gap-2">
          <Package className="text-lime-500" size={20} />
          進行中のアイテム ({posts.length})
        </h2>
        {posts.length === 0 ? (
          <p className="text-slate-400 font-bold px-2">現在出品中のアイテムはありません。</p>
        ) : (
          <div className="grid gap-4">
            {posts.map((post) => (
              <Link 
                key={post.id} 
                to={`/post/${post.id}`}
                className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all flex gap-4 items-center group"
              >
                <div className="w-16 h-16 shrink-0 rounded-2xl bg-slate-50 overflow-hidden">
                  {post.post_images && post.post_images.length > 0 ? (
                    <img src={post.post_images[0].storage_path} alt={post.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={20} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-slate-300">{post.schools?.name_ja}</span>
                  <h3 className="font-bold text-slate-800 truncate group-hover:text-lime-600 transition-colors">{post.title}</h3>
                </div>
                <ChevronRight size={20} className="text-slate-200" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Reviews */}
      <div>
        <h2 className="text-xl font-black text-slate-800 mb-6 px-2 flex items-center gap-2">
          <MessageSquare className="text-sky-500" size={20} />
          最近のレビュー
        </h2>
        {reviews.length === 0 ? (
          <p className="text-slate-400 font-bold px-2">まだレビューがありません。</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={12} className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-100'} />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 uppercase">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-600 text-sm font-medium mb-3">"{review.comment}"</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  - {review.from_profiles?.display_name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
