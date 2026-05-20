import { Link } from 'react-router-dom';
import { Heart, School, Star } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { Post } from '../../types';
import { MannerTempGauge } from '../MannerTempGauge';
import { StatusBadge } from '../StatusBadge';
import { VerifiedBadge } from '../VerifiedBadge';

interface HomePostCardProps {
  post: Post;
  categoryColor: string;
  categoryLabel: string;
  modeLabel: string;
  isWishlisted: boolean;
  wishlistAddLabel: string;
  wishlistRemoveLabel: string;
  onOpenPost: () => void;
  onToggleWishlist: (event: MouseEvent, postId: string) => void;
}

export const HomePostCard = ({
  post,
  categoryColor,
  categoryLabel,
  modeLabel,
  isWishlisted,
  wishlistAddLabel,
  wishlistRemoveLabel,
  onOpenPost,
  onToggleWishlist,
}: HomePostCardProps) => {
  const thumbnail = post.post_images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path;
  const hasDistinctDescription = Boolean(post.description?.trim() && post.description.trim() !== post.title.trim());
  const wishlistLabel = isWishlisted ? `${post.title}${wishlistRemoveLabel}` : `${post.title}${wishlistAddLabel}`;

  return (
    <div className="relative">
      <div
        role="link"
        tabIndex={0}
        onClick={onOpenPost}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenPost();
          }
        }}
        className="group relative flex cursor-pointer gap-5 rounded-[2.5rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-2xl hover:shadow-slate-200/50 active:scale-[0.98]"
      >
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[1.5rem] border border-slate-50 bg-slate-50 shadow-inner">
          <StatusBadge status={post.status} className="absolute left-2 top-2 z-10 bg-white/90 shadow-sm backdrop-blur-md" />
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={post.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <School size={32} strokeWidth={1} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between py-1 text-left">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2 pr-8">
              <span
                className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                  post.mode === 'GIVEAWAY' ? 'bg-lime-50 text-lime-600' : 'bg-purple-50 text-purple-600'
                }`}
              >
                {modeLabel}
              </span>
              <span className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${categoryColor}`}>
                {categoryLabel}
              </span>
              {post.item_size && (
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                  Size: {post.item_size}
                </span>
              )}
              <span className="truncate text-[10px] font-bold text-slate-400">{post.schools?.name_ja}</span>
            </div>
            <h2 className="mb-1 truncate text-xl font-black text-slate-800 transition-colors group-hover:text-lime-600">
              {post.title}
            </h2>
            {hasDistinctDescription && <p className="line-clamp-1 text-xs font-medium text-slate-500">{post.description}</p>}
          </div>

          <div className="flex items-center justify-between border-t border-slate-50 pt-3">
            <Link
              to={`/user/${post.user_id}`}
              onClick={(event) => event.stopPropagation()}
              className="flex items-center gap-2 transition-colors hover:text-lime-600"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 text-[10px] font-black text-sky-600">
                {post.profiles.display_name[0]}
              </div>
              <span className="text-xs font-bold">{post.profiles.display_name}</span>
              <VerifiedBadge verified={post.profiles.email_verified} size="sm" showTooltip={false} />
            </Link>

            <div className="flex items-center gap-2">
              <MannerTempGauge temp={post.profiles.manner_temp ?? 36.5} size="sm" />
              <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span className="text-slate-700">{post.profiles.avg_rating}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={(event) => onToggleWishlist(event, post.id)}
        aria-label={wishlistLabel}
        title={isWishlisted ? wishlistRemoveLabel : wishlistAddLabel}
        className={`absolute right-4 top-4 z-10 rounded-xl p-2 transition-all ${
          isWishlisted ? 'bg-pink-50 text-pink-500' : 'bg-slate-50 text-slate-300 hover:text-pink-400'
        }`}
      >
        <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
};
