import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PostRequest } from '../../types';

type RequestStatusCopy = Record<
  PostRequest['status'],
  {
    label: string;
    className: string;
  }
>;

interface PostRequestListProps {
  requests: PostRequest[];
  requestStatusCopy: RequestStatusCopy;
  emptyLabel: string;
  title: string;
  approveLabel: string;
  ownerCompleteCountPrefix: string;
  onApprove: (requestId: string) => void;
}

export const PostRequestList = ({
  requests,
  requestStatusCopy,
  emptyLabel,
  title,
  approveLabel,
  ownerCompleteCountPrefix,
  onApprove,
}: PostRequestListProps) => {
  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
        <CheckCircle2 className="text-lime-500" size={20} />
        {title}
      </h3>
      {requests.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="font-bold text-slate-400">{emptyLabel}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {requests.map((request) => {
            const requestStatus = requestStatusCopy[request.status];
            return (
              <div
                key={request.id}
                className="flex flex-col gap-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Link
                    to={`/user/${request.requester_id}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 font-black text-sky-500"
                  >
                    {request.profiles.display_name[0]}
                  </Link>
                  <div>
                    <Link to={`/user/${request.requester_id}`} className="font-bold text-slate-700 hover:text-sky-600">
                      {request.profiles.display_name}
                    </Link>
                    <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                      {ownerCompleteCountPrefix} {request.profiles.completed_count}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black ${requestStatus.className}`}>
                    {requestStatus.label}
                  </span>
                  {request.status === 'Pending' && (
                    <button
                      onClick={() => onApprove(request.id)}
                      className="rounded-2xl bg-slate-800 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-800/20 transition-all hover:bg-slate-900"
                    >
                      {approveLabel}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
