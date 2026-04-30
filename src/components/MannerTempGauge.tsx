import { Thermometer } from 'lucide-react';

interface MannerTempGaugeProps {
  temp: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const getTempConfig = (temp: number) => {
  if (temp >= 70) return { emoji: '🌟', color: 'from-red-500 to-orange-400', text: 'text-red-500', bg: 'bg-red-500', label: '최고' };
  if (temp >= 50) return { emoji: '🔥', color: 'from-orange-500 to-amber-400', text: 'text-orange-500', bg: 'bg-orange-500', label: '훌륭' };
  if (temp >= 40) return { emoji: '😄', color: 'from-amber-500 to-yellow-400', text: 'text-amber-500', bg: 'bg-amber-500', label: '좋음' };
  if (temp >= 36.5) return { emoji: '😊', color: 'from-lime-500 to-green-400', text: 'text-lime-600', bg: 'bg-lime-500', label: '보통' };
  if (temp >= 30) return { emoji: '🙂', color: 'from-green-500 to-teal-400', text: 'text-green-500', bg: 'bg-green-500', label: '시작' };
  if (temp >= 20) return { emoji: '😐', color: 'from-yellow-500 to-amber-400', text: 'text-yellow-500', bg: 'bg-yellow-500', label: '주의' };
  return { emoji: '🥶', color: 'from-blue-500 to-cyan-400', text: 'text-blue-500', bg: 'bg-blue-500', label: '위험' };
};

export const MannerTempGauge = ({ temp, size = 'md', showLabel = true }: MannerTempGaugeProps) => {
  const config = getTempConfig(temp);
  const percentage = Math.min(100, Math.max(0, (temp / 99) * 100));

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{config.emoji}</span>
        <span className={`text-sm font-black ${config.text}`}>{temp.toFixed(1)}°C</span>
      </div>
    );
  }

  return (
    <div className={`${size === 'lg' ? 'p-6' : 'p-4'} bg-white rounded-[2rem] shadow-sm border border-slate-100`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Thermometer size={size === 'lg' ? 20 : 16} className={config.text} />
          {showLabel && (
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">マナー温度</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg">{config.emoji}</span>
          <span className={`${size === 'lg' ? 'text-2xl' : 'text-xl'} font-black ${config.text}`}>
            {temp.toFixed(1)}°C
          </span>
        </div>
      </div>

      {/* Gauge Bar */}
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${config.color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
        {/* 36.5°C marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-300/60"
          style={{ left: `${(36.5 / 99) * 100}%` }}
        />
      </div>

      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] font-bold text-slate-300">0°C</span>
        <span className="text-[9px] font-bold text-slate-300" style={{ marginLeft: `${(36.5 / 99) * 100 - 5}%` }}>
          初期 36.5°C
        </span>
        <span className="text-[9px] font-bold text-slate-300">99°C</span>
      </div>
    </div>
  );
};
