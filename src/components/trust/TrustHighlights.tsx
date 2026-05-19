import { MessageSquareMore, ShieldCheck, Star } from 'lucide-react';

interface TrustHighlightsProps {
  title: string;
  completedCount: number;
  avgRating: number;
  ratingCount: number;
  recentReviewCount: number;
  topTags: string[];
}

export const TrustHighlights = ({
  title,
  completedCount,
  avgRating,
  ratingCount,
  recentReviewCount,
  topTags,
}: TrustHighlightsProps) => {
  return (
    <section className="mb-8 rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <ShieldCheck className="text-lime-500" size={18} />
        <h2 className="text-lg font-black text-slate-800">{title}</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">完了取引</p>
          <p className="mt-2 text-2xl font-black text-slate-800">{completedCount}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">平均評価</p>
          <div className="mt-2 flex items-center gap-2">
            <Star size={18} className="fill-amber-400 text-amber-400" />
            <span className="text-2xl font-black text-slate-800">{avgRating.toFixed(1)}</span>
            <span className="text-xs font-bold text-slate-400">({ratingCount})</span>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">最近の声</p>
          <div className="mt-2 flex items-center gap-2">
            <MessageSquareMore size={18} className="text-sky-500" />
            <span className="text-2xl font-black text-slate-800">{recentReviewCount}</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">よく付くレビュータグ</p>
        {topTags.length === 0 ? (
          <p className="text-sm font-medium text-slate-400">まだレビュータグは集まっていません。</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {topTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-lime-100 bg-lime-50 px-3 py-1 text-xs font-black text-lime-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
