import type { ChangeEvent, FormEvent, RefObject } from 'react';
import { Calendar as CalendarIcon, Image as ImageIcon, Loader2, Send } from 'lucide-react';

interface ChatComposerProps {
  newMessage: string;
  uploadingImage: boolean;
  connected: boolean;
  isOnline: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSubmit: (event: FormEvent) => void;
  onMessageChange: (value: string) => void;
  onOpenAppointment: () => void;
  onOpenImagePicker: () => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const ChatComposer = ({
  newMessage,
  uploadingImage,
  connected,
  isOnline,
  fileInputRef,
  onSubmit,
  onMessageChange,
  onOpenAppointment,
  onOpenImagePicker,
  onImageChange,
}: ChatComposerProps) => {
  return (
    <footer className="shrink-0 border-t border-slate-200 bg-[#F7F8FA] px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={onImageChange}
        />
        <button
          type="button"
          onClick={onOpenAppointment}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-100 text-lime-600 transition-all hover:bg-lime-200 active:scale-90"
          title="取引の約束"
        >
          <CalendarIcon size={18} />
        </button>

        <button
          type="button"
          onClick={onOpenImagePicker}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition-all hover:bg-slate-300 active:scale-90"
          disabled={uploadingImage}
        >
          {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={20} />}
        </button>

        <div className="relative flex-1">
          <input
            type="text"
            value={newMessage}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder="メッセージを入力..."
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#06C755] focus:ring-2 focus:ring-[#06C755]/20"
          />
        </div>

        <button
          type="submit"
          disabled={!newMessage.trim() && !uploadingImage}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#06C755] text-white shadow-md shadow-[#06C755]/30 transition-all hover:bg-[#05B54D] active:scale-90 disabled:opacity-30 disabled:shadow-none"
        >
          <Send size={16} />
        </button>
      </form>
      <div className="mt-1.5 px-1 text-[11px] font-medium text-slate-400">
        {!isOnline
          ? 'オフラインです。接続が戻ると自動で再接続します。'
          : connected
            ? 'メッセージはリアルタイムで同期されています。'
            : '再接続中です。いまはポーリングでメッセージを確認しています。'}
      </div>
    </footer>
  );
};
