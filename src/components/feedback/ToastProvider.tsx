import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastRecord = ToastInput & {
  id: number;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_STYLES: Record<
  ToastTone,
  { icon: React.ReactNode; card: string; title: string; description: string }
> = {
  success: {
    icon: <CheckCircle2 size={18} className="text-lime-600" />,
    card: 'border-lime-200 bg-lime-50/95',
    title: 'text-lime-900',
    description: 'text-lime-700',
  },
  error: {
    icon: <AlertCircle size={18} className="text-red-600" />,
    card: 'border-red-200 bg-red-50/95',
    title: 'text-red-900',
    description: 'text-red-700',
  },
  info: {
    icon: <Info size={18} className="text-sky-600" />,
    card: 'border-sky-200 bg-sky-50/95',
    title: 'text-sky-900',
    description: 'text-sky-700',
  },
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (input: ToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const nextToast: ToastRecord = {
        id,
        tone: input.tone ?? 'info',
        title: input.title,
        description: input.description,
      };

      setToasts((prev) => [...prev, nextToast].slice(-4));
      window.setTimeout(() => dismissToast(id), 3600);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] mx-auto flex w-full max-w-md flex-col gap-3 px-4">
        {toasts.map((toast) => {
          const tone = toast.tone ?? 'info';
          const style = TOAST_STYLES[tone];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-xl backdrop-blur ${style.card}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{style.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-black ${style.title}`}>{toast.title}</p>
                  {toast.description && (
                    <p className={`mt-1 text-xs font-medium leading-5 ${style.description}`}>
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-full p-1 text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-700"
                  aria-label="通知を閉じる"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
