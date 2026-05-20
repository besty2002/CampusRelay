interface CreatePostDraftCardProps {
  draftRestored: boolean;
  draftSavedAt: string | null;
  onClearDraft: () => void;
}

export const CreatePostDraftCard = ({ draftRestored, draftSavedAt, onClearDraft }: CreatePostDraftCardProps) => (
  <div className="mb-6 rounded-[2rem] border border-slate-100 bg-white px-5 py-4 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-black text-slate-700">下書きを自動保存しています</p>
        <p className="mt-1 text-xs font-medium text-slate-400">
          {draftRestored ? '前回の入力内容を復元しました。' : '入力内容はこの端末に一時保存されます。'}
        </p>
        {draftSavedAt && (
          <p className="mt-1 text-[11px] font-bold text-slate-300">
            最終保存: {new Date(draftSavedAt).toLocaleString('ja-JP')}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClearDraft}
        className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-500 transition-colors hover:border-red-200 hover:text-red-500"
      >
        下書きを削除
      </button>
    </div>
  </div>
);
