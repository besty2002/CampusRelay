import React from 'react';
import { CheckCircle2, Clock, EyeOff, Package } from 'lucide-react';
import type { PostStatus } from '../types';

interface StatusBadgeProps {
  status: PostStatus;
  className?: string;
  showText?: boolean;
  onClick?: (event: React.MouseEvent) => void;
}

const STATUS_CONFIG: Record<
  PostStatus,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    bgLight: string;
    iconColor: string;
  }
> = {
  Available: {
    label: '受付中',
    icon: Package,
    bgLight: 'bg-lime-50 text-lime-600',
    iconColor: 'text-lime-500',
  },
  Reserved: {
    label: '予約済み',
    icon: Clock,
    bgLight: 'bg-amber-50 text-amber-600',
    iconColor: 'text-amber-500',
  },
  Given: {
    label: '譲渡済み',
    icon: CheckCircle2,
    bgLight: 'bg-slate-50 text-slate-500',
    iconColor: 'text-slate-400',
  },
  Hidden: {
    label: '非公開',
    icon: EyeOff,
    bgLight: 'bg-slate-100 text-slate-500',
    iconColor: 'text-slate-400',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  showText = true,
  onClick,
}) => {
  const { label, icon: Icon, bgLight, iconColor } = STATUS_CONFIG[status] ?? STATUS_CONFIG.Available;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 ${bgLight} ${
        onClick ? 'cursor-pointer transition-all hover:brightness-95 active:scale-95' : ''
      } ${className}`}
    >
      <Icon size={12} className={iconColor} strokeWidth={3} />
      {showText && <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>}
    </div>
  );
};
