import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  trend?: number; // percentage change
  color?: 'lime' | 'sky' | 'amber' | 'red' | 'purple' | 'slate';
}

const colorMap = {
  lime: {
    bg: 'bg-lime-50',
    icon: 'bg-lime-500',
    shadow: 'shadow-lime-500/20',
    text: 'text-lime-700',
  },
  sky: {
    bg: 'bg-sky-50',
    icon: 'bg-sky-500',
    shadow: 'shadow-sky-500/20',
    text: 'text-sky-700',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-500',
    shadow: 'shadow-amber-500/20',
    text: 'text-amber-700',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-500',
    shadow: 'shadow-red-500/20',
    text: 'text-red-700',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-500',
    shadow: 'shadow-purple-500/20',
    text: 'text-purple-700',
  },
  slate: {
    bg: 'bg-slate-50',
    icon: 'bg-slate-600',
    shadow: 'shadow-slate-600/20',
    text: 'text-slate-700',
  },
};

export const StatCard = ({ icon, label, value, trend, color = 'lime' }: StatCardProps) => {
  const c = colorMap[color];

  return (
    <div className={`${c.bg} rounded-[2rem] p-6 border border-white/50 relative overflow-hidden group hover:shadow-lg transition-all`}>
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/30 rounded-full -mr-10 -mt-10 blur-2xl" />
      <div className="relative z-10">
        <div className={`w-10 h-10 ${c.icon} text-white rounded-xl flex items-center justify-center shadow-lg ${c.shadow} mb-4`}>
          {icon}
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-black text-slate-800">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {trend !== undefined && (
            <span className={`flex items-center gap-0.5 text-xs font-bold mb-1 ${
              trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-slate-400'
            }`}>
              {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
