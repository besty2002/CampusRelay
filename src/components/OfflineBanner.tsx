import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const OfflineBanner = () => {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold z-[9999] relative">
      <WifiOff size={16} className="animate-pulse" />
      <span>現在オフラインです。最新データは取得できません。</span>
    </div>
  );
};
