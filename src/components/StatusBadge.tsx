import React from 'react';
import { CheckCircle2, Clock, Package, Check } from 'lucide-react';
import type { PostStatus } from '../types';

interface StatusBadgeProps {
  status: PostStatus;
  className?: string;
  showText?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', showText = true }) => {
  const config = {
    Available: {
      label: '出品中',
      icon: Package,
      color: 'bg-lime-500 text-white',
      bgLight: 'bg-lime-50 text-lime-600',
      iconColor: 'text-lime-500'
    },
    Reserved: {
      label: '予約済み',
      icon: Clock,
      color: 'bg-amber-500 text-white',
      bgLight: 'bg-amber-50 text-amber-600',
      iconColor: 'text-amber-500'
    },
    Given: {
      label: '譲渡済み',
      icon: CheckCircle2,
      color: 'bg-slate-500 text-white',
      bgLight: 'bg-slate-50 text-slate-500',
      iconColor: 'text-slate-400'
    }
  };

  const { label, icon: Icon, bgLight, iconColor } = config[status] || config.Available;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${bgLight} ${className}`}>
      <Icon size={12} className={iconColor} strokeWidth={3} />
      {showText && <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>}
    </div>
  );
};
