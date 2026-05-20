import { CheckCircle2, MessageCircle, Star } from 'lucide-react';
import type { PostRequest } from '../../types';
import { PostRequestList } from './PostRequestList';

type RequestStatusCopy = Record<
  PostRequest['status'],
  {
    label: string;
    className: string;
  }
>;

interface PostDetailActionPanelProps {
  isOwner: boolean;
  postStatus: 'Available' | 'Reserved' | 'Given' | 'Hidden';
  canOpenReservedChat: boolean;
  canRequest: boolean;
  requesting: boolean;
  requestButtonLabel: string;
  requests: PostRequest[];
  requestStatusCopy: RequestStatusCopy;
  copy: {
    startChat: string;
    requestList: string;
    noRequests: string;
    approveButton: string;
    ownerCompleteCountPrefix: string;
    nextStep: string;
    nextStepDescription: string;
    completeButton: string;
    givenNotice: string;
    reviewButton: string;
  };
  onStartChat: () => void;
  onRequest: () => void;
  onApprove: (requestId: string) => void;
  onComplete: () => void;
  onReview: () => void;
}

export const PostDetailActionPanel = ({
  isOwner,
  postStatus,
  canOpenReservedChat,
  canRequest,
  requesting,
  requestButtonLabel,
  requests,
  requestStatusCopy,
  copy,
  onStartChat,
  onRequest,
  onApprove,
  onComplete,
  onReview,
}: PostDetailActionPanelProps) => {
  return (
    <div className="border-t border-slate-100 bg-slate-50 p-8">
      {!isOwner && postStatus === 'Available' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={onStartChat}
            className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-sky-500 py-5 text-xl font-black text-white shadow-xl shadow-sky-500/30 transition-all hover:bg-sky-600 active:scale-[0.98]"
          >
            <MessageCircle size={24} />
            {copy.startChat}
          </button>
          <button
            onClick={onRequest}
            disabled={!canRequest || requesting}
            className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-lime-500 py-5 text-xl font-black text-white shadow-xl shadow-lime-500/30 transition-all hover:bg-lime-600 active:scale-[0.98] disabled:opacity-60"
          >
            <CheckCircle2 size={24} />
            {requestButtonLabel}
          </button>
        </div>
      )}

      {isOwner && postStatus === 'Available' && (
        <PostRequestList
          requests={requests}
          requestStatusCopy={requestStatusCopy}
          emptyLabel={copy.noRequests}
          title={copy.requestList}
          approveLabel={copy.approveButton}
          ownerCompleteCountPrefix={copy.ownerCompleteCountPrefix}
          onApprove={onApprove}
        />
      )}

      {isOwner && postStatus === 'Reserved' && (
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
            <p className="mb-1 text-sm font-black text-slate-700">{copy.nextStep}</p>
            <p className="text-sm text-slate-500">{copy.nextStepDescription}</p>
          </div>
          <button
            onClick={onStartChat}
            className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-sky-500 py-5 text-xl font-black text-white shadow-xl shadow-sky-500/30 transition-all hover:bg-sky-600 active:scale-[0.98]"
          >
            <MessageCircle size={24} />
            {copy.startChat}
          </button>
          <button
            onClick={onComplete}
            className="w-full rounded-[2rem] bg-slate-800 py-5 text-xl font-black text-white shadow-xl shadow-slate-800/30 transition-all hover:bg-black active:scale-[0.98]"
          >
            {copy.completeButton}
          </button>
        </div>
      )}

      {canOpenReservedChat && !isOwner && (
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
            <p className="mb-1 text-sm font-black text-slate-700">{copy.nextStep}</p>
            <p className="text-sm text-slate-500">{copy.nextStepDescription}</p>
          </div>
          <button
            onClick={onStartChat}
            className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-sky-500 py-5 text-xl font-black text-white shadow-xl shadow-sky-500/30 transition-all hover:bg-sky-600 active:scale-[0.98]"
          >
            <MessageCircle size={24} />
            {copy.startChat}
          </button>
        </div>
      )}

      {postStatus === 'Given' && (
        <div className="space-y-6">
          <div className="w-full rounded-[2rem] border-2 border-dashed border-slate-200 bg-white px-5 py-5 text-center font-bold text-slate-500">
            {copy.givenNotice}
          </div>

          <button
            onClick={onReview}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-lg font-black text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-[0.98]"
          >
            <Star size={20} />
            {copy.reviewButton}
          </button>
        </div>
      )}
    </div>
  );
};
