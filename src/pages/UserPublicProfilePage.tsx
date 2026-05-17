import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Package,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PostStatus, Profile } from '../types';
import { MannerTempGauge } from '../components/MannerTempGauge';
import { StatusBadge } from '../components/StatusBadge';
import { UserAvatar } from '../components/UserAvatar';
import { VerifiedBadge } from '../components/VerifiedBadge';

interface PublicPost {
  id: string;
  title: string;
  status: PostStatus;
  post_images: { storage_path: string }[] | null;
  schools: { name_ja: string } | null;
}

interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  manner_tags: string[] | null;
  created_at: string;
  from_profiles: { display_name: string }[] | { display_name: string } | null;
}

const getReviewerName = (reviewer: PublicReview['from_profiles']): string => {
  if (Array.isArray(reviewer)) {
    return reviewer[0]?.display_name ?? '匿名ユーザー';
  }
  return reviewer?.display_name ?? '匿名ユーザー';
};

export const UserPublicProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchPublicData = async () => {
      setLoading(true);
      try {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (profileData) {
          setProfile(profileData as Profile);
        }

        const { data: postsData } = await supabase
          .from('posts')
          .select(
            `
            id,
            title,
            status,
            post_images (storage_path),
            schools (name_ja)
          `
          )
          .eq('user_id', userId)
          .eq('status', 'Available')
          .order('created_at', { ascending: false });

        setPosts((((postsData as unknown) as PublicPost[]) || []));

        const { data: reviewsData } = await supabase
          .from('reviews')
          .select(
            `
            id,
            rating,
            comment,
            manner_tags,
            created_at,
            from_profiles:profiles!reviews_from_user_id_fkey (display_name)
          `
          )
          .eq('to_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        setReviews((((reviewsData as unknown) as PublicReview[]) || []));
      } catch (error) {
        console.error('Error fetching public profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-lime-500" />
      </div>
    );
  }

  if (!profile) {
    return <div className="p-8 text-center font-bold text-slate-500">ユーザーが見つかりませんでした。</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-4 pb-32 pt-12">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 font-bold text-slate-400 transition-colors hover:text-lime-600"
      >
        <ArrowLeft size={20} /> 戻る
      </button>

      <div className="relative mb-8 overflow-hidden rounded-[3rem] border border-slate-100 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
        <div className="absolute left-0 top-0 h-2 w-full bg-lime-500" />
        <UserAvatar
          avatarUrl={profile.avatar_url}
          displayName={profile.display_name}
          size="xl"
          className="mx-auto mb-4 border-4 !border-white shadow-lg"
        />
        <div className="mb-1 flex items-center justify-center gap-1.5">
          <h1 className="text-3xl font-black text-slate-800">{profile.display_name}</h1>
          <VerifiedBadge verified={profile.email_verified} domain={profile.verified_school_domain} size="lg" />
        </div>
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-black text-sky-600">
            <ShieldCheck size={14} /> Campus Relay メンバー
          </span>
        </div>

        <div className="mb-6 w-full">
          <MannerTempGauge temp={profile.manner_temp ?? 36.5} size="md" />
        </div>

        <div className="grid w-full grid-cols-2 gap-4 border-t border-slate-50 pt-6">
          <div className="text-center">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">取引完了数</p>
            <p className="text-2xl font-black text-slate-800">{profile.completed_count}</p>
          </div>
          <div className="border-l border-slate-50 text-center">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">平均評価</p>
            <div className="flex items-center justify-center gap-1">
              <Star size={18} className="fill-amber-400 text-amber-400" />
              <p className="text-2xl font-black text-slate-800">{profile.avg_rating}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="mb-6 flex items-center gap-2 px-2 text-xl font-black text-slate-800">
          <Package className="text-lime-500" size={20} />
          出品中のアイテム ({posts.length})
        </h2>
        {posts.length === 0 ? (
          <p className="px-2 font-bold text-slate-400">現在出品中のアイテムはありません。</p>
        ) : (
          <div className="grid gap-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/post/${post.id}`}
                className="group flex items-center gap-4 rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-lg"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-50">
                  <StatusBadge
                    status={post.status}
                    className="absolute left-1 top-1 z-10 origin-top-left scale-[0.8] bg-white/90 shadow-sm backdrop-blur-md"
                  />
                  {post.post_images && post.post_images.length > 0 ? (
                    <img src={post.post_images[0].storage_path} alt={post.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <Package size={20} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-300">{post.schools?.name_ja}</span>
                  <h3 className="truncate font-bold text-slate-800 transition-colors group-hover:text-lime-600">
                    {post.title}
                  </h3>
                </div>
                <ChevronRight size={20} className="text-slate-200" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-6 flex items-center gap-2 px-2 text-xl font-black text-slate-800">
          <MessageSquare className="text-sky-500" size={20} />
          最新のレビュー
        </h2>
        {reviews.length === 0 ? (
          <p className="px-2 font-bold text-slate-400">まだレビューはありません。</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <Star
                        key={score}
                        size={12}
                        className={score <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-100'}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-300">
                    {new Date(review.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>

                {review.manner_tags && review.manner_tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {review.manner_tags.map((tag) => (
                      <span
                        key={`${review.id}-${tag}`}
                        className="rounded-full border border-lime-100 bg-lime-50 px-2 py-0.5 text-[10px] font-bold text-lime-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mb-3 text-sm font-medium text-slate-600">"{review.comment}"</p>
                <p className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                  - {getReviewerName(review.from_profiles)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
