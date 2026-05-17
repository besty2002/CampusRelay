import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  verified: boolean;
  domain?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export const VerifiedBadge = ({
  verified,
  domain,
  size = 'md',
  showTooltip = true,
}: VerifiedBadgeProps) => {
  if (!verified) return null;

  const iconSize = size === 'sm' ? 14 : size === 'md' ? 16 : 20;
  const tooltip = `学校認証済み${domain ? ` (${domain})` : ''}`;

  return (
    <span className="group relative inline-flex items-center" title={showTooltip ? tooltip : undefined}>
      <BadgeCheck size={iconSize} className="shrink-0 fill-sky-50 text-sky-500" />
      {showTooltip && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          学校認証済み
          {domain && <span className="mt-0.5 block text-[9px] text-slate-400">{domain}</span>}
          <span className="absolute left-1/2 top-full -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800" />
        </span>
      )}
    </span>
  );
};
