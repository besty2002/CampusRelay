import { ArrowLeft, Menu, WifiOff } from 'lucide-react';

interface ChatRoomHeaderProps {
  partnerName?: string;
  realtimeConnected: boolean;
  showHeaderMenu: boolean;
  onBack: () => void;
  onToggleMenu: () => void;
  onOpenPost: () => void;
  onOpenProfile: () => void;
  onCreateAppointment: () => void;
}

export const ChatRoomHeader = ({
  partnerName,
  realtimeConnected,
  showHeaderMenu,
  onBack,
  onToggleMenu,
  onOpenPost,
  onOpenProfile,
  onCreateAppointment,
}: ChatRoomHeaderProps) => {
  return (
    <header className="bg-[#06C755] text-white px-4 py-3 flex items-center gap-3 shrink-0 shadow-md z-20">
      <button
        onClick={onBack}
        className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
      >
        <ArrowLeft size={22} />
      </button>
      <div className="flex-1 min-w-0 text-center">
        <h2 className="font-bold text-base truncate">{partnerName}</h2>
        {!realtimeConnected && (
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <WifiOff size={10} className="text-white/60" />
            <span className="text-[9px] text-white/60 font-medium">接続を確認中</span>
          </div>
        )}
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
