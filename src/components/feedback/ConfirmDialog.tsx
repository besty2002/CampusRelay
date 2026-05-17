import { AlertTriangle } from 'lucide-react';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
};

export const ConfirmDialog = ({
  isOpen,
  title,
  description,
  confirmLabel = '確認する',
  cancelLabel = 'キャンセル',
  tone = 'default',
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  const confirmButtonClass =
    tone === 'danger'
      ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
      : 'bg-slate-800 text-white hover:bg-black shadow-slate-800/20';

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[2rem] bg-white p-7 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className={`rounded-2xl p-2 ${tone === 'danger' ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
            <AlertTriangle size={20} />
          </div>
          <h2 className="text-lg font-black text-slate-800">{title}</h2>
        </div>

        <p className="text-sm font-medium leading-6 text-slate-500">{description}</p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 rounded-2xl py-3 text-sm font-bold shadow-lg transition-all disabled:opacity-60 ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
