import { BellRing, X } from 'lucide-react';
import type { Announcement } from '../../types';

type AnnouncementPopupProps = {
  announcement: Announcement | null;
  onClose: () => void;
  onDismissForNow: () => void;
};

const formatDisplayWindow = (announcement: Announcement) => {
  if (!announcement.starts_at && !announcement.ends_at) return null;

  const start = announcement.starts_at
    ? new Date(announcement.starts_at).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' })
    : null;
  const end = announcement.ends_at
    ? new Date(announcement.ends_at).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  if (start && end) return `${start} - ${end}`;
  return start ?? end;
};

export const AnnouncementPopup = ({ announcement, onClose, onDismissForNow }: AnnouncementPopupProps) => {
  if (!announcement) return null;

  const displayWindow = formatDisplayWindow(announcement);

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="お知らせを閉じる"
          className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-slate-400 transition-colors hover:text-slate-700"
        >
          <X size={18} />
        </button>

        <div className="border-b border-slate-100 bg-gradient-to-r from-lime-50 to-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-lime-100 p-3 text-lime-600">
              <BellRing size={22} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-600">Notice</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">{announcement.title}</h2>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{announcement.body}</div>
          {displayWindow && (
            <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
              掲載期間: {displayWindow}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onDismissForNow}
              className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
            >
              今回は閉じる
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-black"
            >
              確認しました
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
