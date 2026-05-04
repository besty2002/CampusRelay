import { useState } from 'react';
import { X, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { date: string; location: string }) => void;
}

export const AppointmentModal = ({ isOpen, onClose, onSubmit }: AppointmentModalProps) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !location) return;
    
    // Combine date and time
    const dateTime = `${date}T${time}:00`;
    onSubmit({ date: dateTime, location });
    
    // Reset
    setDate('');
    setTime('');
    setLocation('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-lime-100 text-lime-600 flex items-center justify-center">
              <CalendarIcon size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-800">取引の約束をする</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <CalendarIcon size={14} /> 日付
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none font-bold text-slate-700 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock size={14} /> 時間
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none font-bold text-slate-700 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <MapPin size={14} /> 待ち合わせ場所
              </label>
              <input
                type="text"
                required
                placeholder="例: 正門前、図書館1階"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none font-bold text-slate-700 transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-lime-500 text-white font-black text-lg shadow-lg shadow-lime-500/30 hover:bg-lime-600 active:scale-[0.98] transition-all"
            >
              約束を提案する
            </button>
            <p className="text-center text-xs text-slate-400 mt-4 font-medium">
              提案後、相手が「承諾」すると約束が確定します。
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
