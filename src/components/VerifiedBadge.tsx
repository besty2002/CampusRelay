import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  verified: boolean;
  domain?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export const VerifiedBadge = ({ verified, domain, size = 'md', showTooltip = true }: VerifiedBadgeProps) => {
  if (!verified) return null;

  const iconSize = size === 'sm' ? 14 : size === 'md' ? 16 : 20;

  return (
    <span className="relative inline-flex items-center group" title={showTooltip ? `学校認証済み${domain ? ` (${domain})` : ''}` : undefined}>
      <BadgeCheck
        size={iconSize}
        className="text-sky-500 fill-sky-50 shrink-0"
      />
      {/* Tooltip */}
      {showTooltip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
          学校認証済み ✅
          {domain && <span className="block text-[9px] text-slate-400 mt-0.5">{domain}</span>}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 rotate-45" />
        </span>
      )}
    </span>
  );
};
