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
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[min(82vh,42rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-lime-50 to-white px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl bg-lime-100 p-3 text-lime-600">
              <BellRing size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-600">Notice</p>
              <h2 className="mt-1 break-words text-lg font-black text-slate-900 sm:text-xl">{announcement.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="お知らせを閉じる"
            className="shrink-0 rounded-full bg-white/90 p-2 text-slate-400 transition-colors hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{announcement.body}</div>
          {displayWindow && (
            <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
              掲載期間: {displayWindow}
            </p>
          )}
        </div>

        <div className="border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row">
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
