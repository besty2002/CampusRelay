import { User } from 'lucide-react';

interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: { container: 'w-6 h-6', icon: 10, text: 'text-[8px]' },
  sm: { container: 'w-8 h-8', icon: 14, text: 'text-[10px]' },
  md: { container: 'w-12 h-12', icon: 24, text: 'text-sm' },
  lg: { container: 'w-20 h-20', icon: 36, text: 'text-xl' },
  xl: { container: 'w-24 h-24', icon: 48, text: 'text-2xl' },
};

export const UserAvatar = ({ avatarUrl, displayName, size = 'md', className = '' }: UserAvatarProps) => {
  const s = sizeMap[size];
  const initial = displayName?.[0]?.toUpperCase() || '?';

  if (avatarUrl) {
    return (
      <div className={`${s.container} rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm ${className}`}>
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`${s.container} rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-lime-100 to-sky-100 text-lime-600 font-black ${s.text} border-2 border-white shadow-sm ${className}`}>
      {size === 'xl' || size === 'lg' ? <User size={s.icon} /> : initial}
    </div>
  );
};
