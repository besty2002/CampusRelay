import { Link } from 'react-router-dom';
import type { Post, PostRequest } from '../../types';

interface StatusCopy {
  title: string;
  ownerDescription: string;
  visitorDescription: string;
}

interface RequestStatusCopy {
  label: string;
  className: string;
  description: string;
}

interface PostTradeStatusCardProps {
  post: Post;
  isOwner: boolean;
  tradeCopy?: StatusCopy | null;
  myRequestStatus?: RequestStatusCopy | null;
  approvedRequest?: PostRequest | null;
  labels: {
    tradeStatus: string;
    yourRequest: string;
    currentPartner: string;
    partnerFallback: string;
  };
}

export const PostTradeStatusCard = ({
  post,
  isOwner,
  tradeCopy,
  myRequestStatus,
  approvedRequest,
  labels,
}: PostTradeStatusCardProps) => (
  <div className="mb-8 rounded-[2rem] border border-lime-100 bg-lime-50/70 p-6">
    <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-lime-600">{labels.tradeStatus}</p>
    <h2 className="mb-2 text-xl font-black text-slate-800">{tradeCopy?.title}</h2>
    <p className="text-sm font-medium leading-relaxed text-slate-600">
      {isOwner ? tradeCopy?.ownerDescription : tradeCopy?.visitorDescription}
    </p>

    {myRequestStatus && !isOwner && (
      <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-black text-slate-700">{labels.yourRequest}</span>
          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${myRequestStatus.className}`}>
            {myRequestStatus.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-500">{myRequestStatus.description}</p>
      </div>
    )}

    {approvedRequest && (post.status === 'Reserved' || post.status === 'Given') && (
      <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-3">
        <p className="mb-1 text-sm font-black text-slate-700">{labels.currentPartner}</p>
        <Link to={`/user/${approvedRequest.requester_id}`} className="text-sm font-bold text-lime-700 hover:text-lime-800">
          {approvedRequest.profiles?.display_name ?? labels.partnerFallback}
        </Link>
      </div>
    )}
  </div>
);
