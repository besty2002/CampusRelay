import { AlertTriangle, ArrowLeft, LogOut, Menu, RefreshCcw, Wifi, WifiOff } from 'lucide-react';

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline';

interface ChatRoomHeaderProps {
  partnerName?: string;
  connectionState: ConnectionState;
  lastActiveLabel?: string;
  showHeaderMenu: boolean;
  onBack: () => void;
  onToggleMenu: () => void;
  onOpenPost: () => void;
  onOpenProfile: () => void;
  onCreateAppointment: () => void;
  onReportChat: () => void;
  onCloseChat: () => void;
}

const CONNECTION_COPY: Record<ConnectionState, { label: string; icon: typeof Wifi; className: string }> = {
  connecting: {
    label: '接続中',
    icon: RefreshCcw,
    className: 'text-white/80',
  },
  connected: {
    label: '接続安定',
    icon: Wifi,
    className: 'text-white/85',
  },
  reconnecting: {
    label: '再接続中',
    icon: RefreshCcw,
    className: 'text-white/75',
  },
  offline: {
    label: 'オフライン',
    icon: WifiOff,
    className: 'text-white/70',
  },
};

export const ChatRoomHeader = ({
  partnerName,
  connectionState,
  lastActiveLabel,
  showHeaderMenu,
  onBack,
  onToggleMenu,
  onOpenPost,
  onOpenProfile,
  onCreateAppointment,
  onReportChat,
  onCloseChat,
}: ChatRoomHeaderProps) => {
  const { label, icon: StatusIcon, className } = CONNECTION_COPY[connectionState];

  return (
    <header className="flex items-center gap-3 bg-[#06C755] px-4 py-3 text-white shadow-md">
      <button onClick={onBack} className="rounded-full p-1.5 transition-colors hover:bg-white/10" aria-label="前の画面へ戻る">
        <ArrowLeft size={22} />
      </button>
      <div className="min-w-0 flex-1 text-center">
        <h2 className="truncate text-base font-bold">{partnerName}</h2>
        <div className="mt-0.5 flex items-center justify-center gap-1.5">
          <StatusIcon
            size={10}
            className={`${className} ${connectionState === 'connecting' || connectionState === 'reconnecting' ? 'animate-spin' : ''}`}
          />
          <span className={`text-[10px] font-medium ${className}`}>{label}</span>
          {lastActiveLabel && <span className="text-[10px] text-white/65">・ {lastActiveLabel}</span>}
        </div>
      </div>
      <button
        onClick={onToggleMenu}
        className="rounded-full p-1.5 transition-colors hover:bg-white/10"
        aria-label="チャットメニュー"
      >
        <Menu size={20} />
      </button>
      {showHeaderMenu && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 shadow-xl animate-in fade-in slide-in-from-top-1 duration-100">
          <button
            onClick={onOpenPost}
            className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            商品詳細を見る
          </button>
          <button
            onClick={onOpenProfile}
            className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            相手のプロフィールを見る
          </button>
          <button
            onClick={onCreateAppointment}
            className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            取引予定を作成
          </button>
          <button
            onClick={onReportChat}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm font-bold text-amber-600 transition-colors hover:bg-amber-50"
          >
            <AlertTriangle size={15} />
            通報する
          </button>
          <button
            onClick={onCloseChat}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50"
          >
            <LogOut size={15} />
            チャットを閉じる
          </button>
        </div>
      )}
    </header>
  );
};
