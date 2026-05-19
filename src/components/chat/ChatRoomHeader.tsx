import { ArrowLeft, Menu, Wifi, WifiOff, RefreshCcw } from 'lucide-react';

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
}

const CONNECTION_COPY: Record<
  ConnectionState,
  { label: string; icon: typeof Wifi; className: string }
> = {
  connecting: {
    label: '接続中',
    icon: RefreshCcw,
    className: 'text-white/80',
  },
  connected: {
    label: '接続中',
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
}: ChatRoomHeaderProps) => {
  const { label, icon: StatusIcon, className } = CONNECTION_COPY[connectionState];

  return (
    <header className="bg-[#06C755] text-white px-4 py-3 flex items-center gap-3 shrink-0 shadow-md z-20">
      <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" aria-label="戻る">
        <ArrowLeft size={22} />
      </button>
      <div className="flex-1 min-w-0 text-center">
        <h2 className="font-bold text-base truncate">{partnerName}</h2>
        <div className="flex items-center justify-center gap-1.5 mt-0.5">
          <StatusIcon size={10} className={`${className} ${connectionState === 'connecting' || connectionState === 'reconnecting' ? 'animate-spin' : ''}`} />
          <span className={`text-[10px] font-medium ${className}`}>{label}</span>
          {lastActiveLabel && <span className="text-[10px] text-white/65">• {lastActiveLabel}</span>}
        </div>
      </div>
      <button
        onClick={onToggleMenu}
        className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
        aria-label="チャットメニュー"
      >
        <Menu size={20} />
      </button>
      {showHeaderMenu && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-1 z-50 animate-in slide-in-from-top-1 fade-in duration-100">
          <button
            onClick={onOpenPost}
            className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            商品詳細を見る
          </button>
          <button
            onClick={onOpenProfile}
            className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            相手のプロフィールを見る
          </button>
          <button
            onClick={onCreateAppointment}
            className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
          >
            取引予定を作成
          </button>
        </div>
      )}
    </header>
  );
};
