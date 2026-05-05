import React from 'react';
import { CheckCircle2, Clock, Package, EyeOff } from 'lucide-react';
import type { PostStatus } from '../types';

interface StatusBadgeProps {
  status: PostStatus;
  className?: string;
  showText?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', showText = true, onClick }) => {
  const config: Record<PostStatus, { label: string, icon: any, bgLight: string, iconColor: string }> = {
    Available: {
      label: '出品中',
      icon: Package,
      bgLight: 'bg-lime-50 text-lime-600',
      iconColor: 'text-lime-500'
    },
    Reserved: {
      label: '予約済み',
      icon: Clock,
      bgLight: 'bg-amber-50 text-amber-600',
      iconColor: 'text-amber-500'
    },
    Given: {
      label: '譲渡済み',
      icon: CheckCircle2,
      bgLight: 'bg-slate-50 text-slate-500',
      iconColor: 'text-slate-400'
    },
    Hidden: {
      label: '非公開',
      icon: EyeOff,
      bgLight: 'bg-slate-100 text-slate-500',
      iconColor: 'text-slate-400'
    }
  };

  const { label, icon: Icon, bgLight, iconColor } = config[status] || config.Available;

  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${bgLight} ${onClick ? 'cursor-pointer hover:brightness-95 active:scale-95 transition-all' : ''} ${className}`}
    >
      <Icon size={12} className={iconColor} strokeWidth={3} />
      {showText && <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>}
    </div>
  );
};
