import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package,
  Star,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Settings,
  Heart,
  Clock,
  ArrowLeft,
  Camera,
  Loader2,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Post, Profile } from '../types';
import { MannerTempGauge } from '../components/MannerTempGauge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { ProfileSkeleton } from '../components/skeletons/ProfileSkeleton';
import { UserAvatar } from '../components/UserAvatar';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/feedback/ToastProvider';

interface WishlistedPostRow {
  posts: Post | Post[] | null;
}

const COPY = {
  avatarUpdated: 'プロフィール画像を更新しました',
  avatarUpdateFailed: 'プロフィール画像の更新に失敗しました',
  avatarRetry: '時間をおいてもう一度お試しください。',
  profileFallbackName: 'ユーザー',
  member: 'メンバー',
  admin: '管理者',
  completedCount: '取引完了数',
  rating: '評価',
  reviews: 'レビュー',
  wishlist: 'お気に入り',
  activity: '取引履歴',
  settings: '設定',
  logout: 'ログアウト',
  backToProfile: 'プロフィールに戻る',
  wishlistTitle: 'お気に入り',
  wishlistEmpty: 'お気に入りに追加したアイテムはまだありません。',
  myPostsTitle: '出品したアイテム',
  myPostsEmpty: 'まだ出品したアイテムはありません。',
  createFirstPost: '最初の出品をしてみる',
  itemsSuffix: '件',
} as const;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

export const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [wishlistedPosts, setWishlistedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'main' | 'wishlist'>('main');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchProfileAndPosts();
    }
  }, [user]);

  const fetchProfileAndPosts = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
      if (profileData) setProfile(profileData);

      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          post_images (storage_path),
          schools (name_ja)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (postsData) setMyPosts(postsData as Post[]);

      const { data: wishlistData } = await supabase
        .from('wishlists')
        .select(`
          posts (
            *,
            post_images (storage_path),
            schools (name_ja),
            profiles!user_id (display_name, completed_count, avg_rating)
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (wishlistData) {
        setWishlistedPosts(
          wishlistData
            .map((entry) => {
              const posts = (entry as WishlistedPostRow).posts;
              return Array.isArray(posts) ? posts[0] ?? null : posts;
            })
            .filter((post): post is Post => Boolean(post))
        );
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 400,
        useWebWorker: true,
      });

      const fileExt = compressed.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, compressed, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : null));
      showToast({ tone: 'success', title: COPY.avatarUpdated });
    } catch (error: unknown) {
      console.error('Avatar upload error:', error);
      showToast({
        tone: 'error',
        title: COPY.avatarUpdateFailed,
        description: getErrorMessage(error, COPY.avatarRetry),
      });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 pt-12 pb-32">
        <div className="bg-white rounded-[3rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 relative overflow-hidden">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  if (view === 'wishlist') {
    return (
      <div className="max-w-2xl mx-auto p-4 pt-12 pb-32">
        <button
          onClick={() => setView('main')}
          className="flex items-center gap-2 text-slate-400 font-bold mb-8 hover:text-lime-600 transition-colors"
        >
          <ArrowLeft size={20} /> {COPY.backToProfile}
        </button>

        <h2 className="text-3xl font-black text-slate-800 mb-8 px-2">{COPY.wishlistTitle}</h2>

        {wishlistedPosts.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
            <Heart className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-bold">{COPY.wishlistEmpty}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {wishlistedPosts.map((post) => {
              const thumbnail = post.post_images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path;
              return (
                <Link
                  key={post.id}
                  to={`/post/${post.id}`}
                  className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all flex gap-4 items-center group"
                >
                  <div className="w-20 h-20 shrink-0 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100 relative">
                    <StatusBadge
                      status={post.status}
                      className="absolute top-1 left-1 z-10 shadow-sm backdrop-blur-md bg-white/90 scale-90 origin-top-left"
                    />
                    {thumbnail ? (
                      <img src={thumbnail} alt={post.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-black text-lime-600 uppercase tracking-wider">{post.mode}</span>
                      <span className="text-[10px] font-bold text-slate-300">{post.schools?.name_ja}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 truncate group-hover:text-lime-600 transition-colors">{post.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{post.profiles?.display_name}</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-200 group-hover:text-lime-500 group-hover:translate-x-1 transition-all" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pt-12 pb-32">
      <div className="bg-white rounded-[3rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />

        <div className="flex flex-col items-center text-center relative">
          <label className="relative group cursor-pointer mb-4 z-10 block">
            <UserAvatar
              avatarUrl={profile?.avatar_url}
              displayName={profile?.display_name || ''}
              size="xl"
              className="border-4 !border-white shadow-lg"
            />
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center pointer-events-none">
              {uploadingAvatar ? (
                <Loader2 size={24} className="text-white animate-spin" />
              ) : (
                <Camera size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-lime-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white pointer-events-none">
              <Camera size={14} />
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={uploadingAvatar}
            />
          </label>

          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-3xl font-black text-slate-800">{profile?.display_name || COPY.profileFallbackName}</h1>
            <VerifiedBadge verified={profile?.email_verified || false} domain={profile?.verified_school_domain} size="lg" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sky-600 text-xs font-black rounded-full border border-sky-100">
              <ShieldCheck size={14} /> {profile?.role === 'user' ? COPY.member : COPY.admin}
            </span>
          </div>

          <div className="w-full mb-6">
            <MannerTempGauge temp={profile?.manner_temp ?? 36.5} size="md" />
          </div>

          <div className="grid grid-cols-3 gap-4 w-full pt-6 border-t border-slate-50">
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{COPY.completedCount}</p>
              <p className="text-xl font-black text-slate-800">{profile?.completed_count || 0}</p>
            </div>
            <div className="text-center border-x border-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{COPY.rating}</p>
              <div className="flex items-center justify-center gap-1">
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <p className="text-xl font-black text-slate-800">{profile?.avg_rating || 0}</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{COPY.reviews}</p>
              <p className="text-xl font-black text-slate-800">{profile?.rating_count || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 mb-8">
        <MenuButton icon={<Heart size={20} />} label={COPY.wishlist} onClick={() => setView('wishlist')} />
        <MenuButton icon={<Clock size={20} />} label={COPY.activity} onClick={() => navigate('/activity')} />
        <MenuButton icon={<Settings size={20} />} label={COPY.settings} onClick={() => navigate('/settings')} />
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-6 bg-white rounded-[2rem] shadow-sm border border-slate-100 text-red-500 font-bold hover:bg-red-50 transition-all"
        >
          <div className="flex items-center gap-4">
            <LogOut size={20} />
            <span>{COPY.logout}</span>
          </div>
          <ChevronRight size={20} className="text-slate-300" />
        </button>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-end mb-6 px-2">
          <h2 className="text-2xl font-black text-slate-800">{COPY.myPostsTitle}</h2>
          <span className="text-sm font-bold text-slate-400">
            {myPosts.length} {COPY.itemsSuffix}
          </span>
        </div>

        {myPosts.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
            <Package className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-bold">{COPY.myPostsEmpty}</p>
            <Link to="/schools" className="text-lime-600 font-black text-sm mt-2 inline-block">
              {COPY.createFirstPost} &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {myPosts.map((post) => (
              <Link
                key={post.id}
                to={`/post/${post.id}`}
                className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all flex gap-4 items-center group"
              >
                <div className="w-16 h-16 shrink-0 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100 relative">
                  <StatusBadge
                    status={post.status}
                    className="absolute top-1 left-1 z-10 shadow-sm backdrop-blur-md bg-white/90 scale-[0.8] origin-top-left"
                  />
                  {post.post_images && post.post_images.length > 0 ? (
                    <img src={post.post_images[0].storage_path} alt={post.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package size={20} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-slate-300">{post.schools?.name_ja}</span>
                  </div>
                  <h3 className="font-bold text-slate-800 truncate group-hover:text-lime-600 transition-colors">{post.title}</h3>
                </div>
                <ChevronRight size={20} className="text-slate-200 group-hover:text-lime-500 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const MenuButton = ({
  icon,
  label,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-6 bg-white rounded-[2rem] shadow-sm border border-slate-100 text-slate-600 font-bold hover:shadow-md hover:border-lime-100 transition-all group"
  >
    <div className="flex items-center gap-4 text-slate-400 group-hover:text-lime-500 transition-colors">
      {icon}
      <span className="text-slate-700">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {count !== undefined && (
        <span className="bg-slate-50 text-slate-400 px-3 py-1 rounded-full text-xs font-black">{count}</span>
      )}
      <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-all" />
    </div>
  </button>
);
