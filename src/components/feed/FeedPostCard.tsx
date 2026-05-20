import { Link } from 'react-router-dom';
import { ArrowRight, Package, Star } from 'lucide-react';
import type { Post, PostCategory } from '../../types';
import { MannerTempGauge } from '../MannerTempGauge';
import { StatusBadge } from '../StatusBadge';
import { VerifiedBadge } from '../VerifiedBadge';

type CategoryMeta = {
  label: string;
  color: string;
};

interface FeedPostCardProps {
  post: Post;
  categoryMeta: Record<PostCategory, CategoryMeta>;
  modeLabel: string;
  detailsLabel: string;
}

export const FeedPostCard = ({ post, categoryMeta, modeLabel, detailsLabel }: FeedPostCardProps) => {
  const thumbnail = post.post_images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path;
  const hasDistinctDescription = Boolean(post.description?.trim() && post.description.trim() !== post.title.trim());
  const categoryInfo = categoryMeta[post.category];
  const displayName = post.profiles?.display_name?.trim() || 'Campus Relay';
  const avatarInitial = displayName.charAt(0).toUpperCase() || 'C';
  const rating = Number.isFinite(post.profiles?.avg_rating) ? post.profiles.avg_rating : 0;

  return (
    <Link
      to={`/post/${post.id}`}
      className="group flex overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/60 active:scale-[0.99]"
    >
      <div className="relative h-full w-32 shrink-0 overflow-hidden bg-slate-100 sm:w-40">
        <StatusBadge status={post.status} className="absolute left-3 top-3 z-10 bg-white/90 shadow-sm backdrop-blur-md" />
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full min-h-40 w-full items-center justify-center text-slate-300">
            <Package size={42} strokeWidth={1.3} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-black tracking-wider ${
                post.mode === 'GIVEAWAY' ? 'bg-lime-50 text-lime-700' : 'bg-purple-50 text-purple-700'
              }`}
            >
              {modeLabel}
            </span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black tracking-wider ${categoryInfo?.color ?? 'bg-slate-100 text-slate-600'}`}>
              {categoryInfo?.label ?? post.category}
            </span>
            {post.item_size && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black tracking-wider text-slate-600">
                {post.item_size}
              </span>
            )}
          </div>
          <span className="shrink-0 text-[11px] font-bold text-slate-400">
            {new Date(post.created_at).toLocaleDateString('ja-JP')}
          </span>
        </div>

        <h2 className="mb-2 line-clamp-1 text-xl font-black text-slate-800 transition-colors group-hover:text-lime-600">
          {post.title}
        </h2>
        {hasDistinctDescription && <p className="mb-5 line-clamp-2 text-sm font-medium text-slate-500">{post.description}</p>}

        <div className="mt-auto flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sm font-black text-sky-600">
              {avatarInitial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-black text-slate-700">{displayName}</span>
                <VerifiedBadge verified={post.profiles?.email_verified} size="sm" showTooltip={false} />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs font-black text-slate-700">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span>{rating.toFixed(1)}</span>
                </div>
                <span className="text-xs font-medium text-slate-300">|</span>
                <MannerTempGauge temp={post.profiles?.manner_temp ?? 36.5} size="sm" />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 self-start rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-500 transition-colors group-hover:bg-lime-50 group-hover:text-lime-700 sm:self-center">
            <span>{detailsLabel}</span>
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </Link>
  );
};
