import { Link } from 'react-router-dom';
import { Star, User } from 'lucide-react';
import type { Post, PostCondition } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { VerifiedBadge } from '../VerifiedBadge';
import { MannerTempGauge } from '../MannerTempGauge';
import { PostTradeStatusCard } from './PostTradeStatusCard';

interface RequestStatusCopy {
  label: string;
  className: string;
  description: string;
}

interface PostDetailHeroProps {
  post: Post;
  isOwner: boolean;
  tradeCopy: {
    title: string;
    ownerDescription: string;
    visitorDescription: string;
  } | null;
  myRequestStatus: RequestStatusCopy | null;
  approvedRequest: any;
  hasDistinctDescription: boolean;
  categoryLabels: Record<Post['category'], string>;
  conditionLabels: Record<PostCondition, string>;
  copy: {
    tradeStatus: string;
    yourRequest: string;
    currentPartner: string;
    partnerFallback: string;
    exchangeWanted: string;
    ownerCompleteCountPrefix: string;
  };
}

export const PostDetailHero = ({
  post,
  isOwner,
  tradeCopy,
  myRequestStatus,
  approvedRequest,
  hasDistinctDescription,
  categoryLabels,
  conditionLabels,
  copy,
}: PostDetailHeroProps) => {
  const sellerProfile = post.profiles as Post['profiles'] & {
    verified_school_domain?: string;
    email_verified?: boolean;
    manner_temp?: number;
  };

  return (
    <div className="p-8 md:p-12">
      <div className="mb-6 flex items-start justify-between">
        <StatusBadge status={post.status} className="!px-3 !py-1" />
        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-300">
          {new Date(post.created_at).toLocaleDateString()}
        </span>
      </div>

      <h1 className="mb-4 text-4xl font-black leading-tight text-slate-800">{post.title}</h1>

      <div className="mb-8 flex flex-wrap gap-2">
        <span className="rounded-lg bg-slate-50 px-3 py-1 text-[10px] font-black uppercase text-slate-500">
          {categoryLabels[post.category] ?? post.category}
        </span>
        <span className="rounded-lg bg-slate-50 px-3 py-1 text-[10px] font-black uppercase text-slate-500">
          {conditionLabels[post.condition] ?? post.condition}
        </span>
        {post.mode === 'EXCHANGE' && (
          <span className="rounded-lg bg-purple-50 px-3 py-1 text-[10px] font-black uppercase text-purple-600">交換</span>
        )}
      </div>

      <PostTradeStatusCard
        post={post}
        isOwner={isOwner}
        tradeCopy={tradeCopy}
        myRequestStatus={myRequestStatus}
        approvedRequest={approvedRequest}
        labels={{
          tradeStatus: copy.tradeStatus,
          yourRequest: copy.yourRequest,
          currentPartner: copy.currentPartner,
          partnerFallback: copy.partnerFallback,
        }}
      />

      {hasDistinctDescription && (
        <p className="mb-12 whitespace-pre-wrap text-lg font-medium leading-relaxed text-slate-600">{post.description}</p>
      )}

      {post.mode === 'EXCHANGE' && post.exchange_wanted && (
        <div className="mb-12 rounded-[2rem] border-2 border-purple-100 bg-purple-50 p-6">
          <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-purple-400">{copy.exchangeWanted}</h3>
          <p className="text-xl font-black text-purple-900">{post.exchange_wanted}</p>
        </div>
      )}

      <div className="flex items-center gap-4 rounded-[2rem] bg-slate-50 p-6">
        <Link
          to={`/user/${post.user_id}`}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-lime-500 shadow-sm transition-transform hover:scale-105"
        >
          <User size={28} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Link to={`/user/${post.user_id}`} className="text-lg font-black text-slate-800 transition-colors hover:text-lime-600">
              {post.profiles.display_name}
            </Link>
            <VerifiedBadge verified={sellerProfile.email_verified} domain={sellerProfile.verified_school_domain} />
          </div>
          <div className="mt-0.5 flex items-center gap-3">
            <span className="rounded-md bg-lime-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">
              {copy.ownerCompleteCountPrefix} {post.profiles.completed_count}件
            </span>
            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              {post.profiles.avg_rating} ({post.profiles.rating_count})
            </span>
          </div>
          <div className="mt-1">
            <MannerTempGauge temp={sellerProfile.manner_temp ?? 36.5} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
};
