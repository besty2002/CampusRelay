import { AlertCircle, ArrowLeft, Edit, Heart, Trash2 } from 'lucide-react';

interface PostDetailToolbarProps {
  backLabel: string;
  wishlistActive: boolean;
  wishlistAddLabel: string;
  wishlistRemoveLabel: string;
  isOwner: boolean;
  editLabel: string;
  deleteLabel: string;
  reportLabel: string;
  onBack: () => void;
  onToggleWishlist: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
}

export const PostDetailToolbar = ({
  backLabel,
  wishlistActive,
  wishlistAddLabel,
  wishlistRemoveLabel,
  isOwner,
  editLabel,
  deleteLabel,
  reportLabel,
  onBack,
  onToggleWishlist,
  onEdit,
  onDelete,
  onReport,
}: PostDetailToolbarProps) => {
  return (
    <div className="mb-8 flex items-center justify-between">
      <button
        onClick={onBack}
        className="flex items-center gap-1 font-bold text-slate-400 transition-colors hover:text-lime-600"
        aria-label={backLabel}
        title={backLabel}
      >
        <ArrowLeft size={20} />
        {backLabel}
      </button>

      <div className="flex gap-2">
        <button
          onClick={onToggleWishlist}
          className={`rounded-xl border p-2 shadow-sm transition-all ${
            wishlistActive ? 'border-pink-100 bg-pink-50 text-pink-500' : 'border-slate-100 bg-white text-slate-400 hover:text-pink-400'
          }`}
          aria-label={wishlistActive ? wishlistRemoveLabel : wishlistAddLabel}
          title={wishlistActive ? wishlistRemoveLabel : wishlistAddLabel}
        >
          <Heart size={20} fill={wishlistActive ? 'currentColor' : 'none'} />
        </button>

        {isOwner ? (
          <>
            <button
              onClick={onEdit}
              className="rounded-xl border border-slate-100 bg-white p-2 text-slate-400 shadow-sm transition-all hover:text-lime-600"
              aria-label={editLabel}
              title={editLabel}
            >
              <Edit size={20} />
            </button>
            <button
              onClick={onDelete}
              className="rounded-xl border border-slate-100 bg-white p-2 text-slate-400 shadow-sm transition-all hover:text-red-500"
              aria-label={deleteLabel}
              title={deleteLabel}
            >
              <Trash2 size={20} />
            </button>
          </>
        ) : (
          <button
            onClick={onReport}
            className="flex items-center gap-1 rounded-xl border border-slate-100 bg-white px-3 py-1.5 text-xs font-bold text-slate-400 shadow-sm transition-all hover:text-red-500"
            aria-label={reportLabel}
            title={reportLabel}
          >
            <AlertCircle size={14} />
            {reportLabel}
          </button>
        )}
      </div>
    </div>
  );
};
