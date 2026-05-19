import { Calendar as CalendarIcon, MapPin, RotateCcw, XCircle } from 'lucide-react';
import type { ChatMessage } from '../../types';

interface AppointmentMessageCardProps {
  message: ChatMessage;
  isMe: boolean;
  onAccept: () => void;
  onCancel: () => void;
  onEdit: () => void;
}

const APPOINTMENT_STATUS_COPY = {
  proposed: {
    badge: '提案中',
    description: '返答を待っています',
  },
  accepted: {
    badge: '完了待ち',
    description: '受け渡しが終わったら取引を完了にしてください',
  },
  canceled: {
    badge: 'キャンセル済み',
    description: '必要なら内容を調整して再提案できます',
  },
} as const;

export const AppointmentMessageCard = ({
  message,
  isMe,
  onAccept,
  onCancel,
  onEdit,
}: AppointmentMessageCardProps) => {
  if (!message.appointment_data) return null;

  const { appointment_data } = message;
  const statusCopy = APPOINTMENT_STATUS_COPY[appointment_data.status];

  return (
    <div className={`p-4 ${isMe ? 'bg-[#05B54D]' : 'bg-lime-50'} rounded-2xl m-1 min-w-[220px]`}>
      <div className={`flex items-center gap-2 mb-3 border-b pb-2 ${isMe ? 'border-white/20' : 'border-lime-200/50'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMe ? 'bg-white/20 text-white' : 'bg-lime-200 text-lime-700'}`}>
          <CalendarIcon size={16} />
        </div>
        <div className="min-w-0">
          <h4 className={`text-xs font-black ${isMe ? 'text-white' : 'text-slate-800'}`}>取引予定</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ${
                isMe ? 'bg-white/15 text-white' : 'bg-lime-100 text-lime-700'
              }`}
            >
              {statusCopy.badge}
            </span>
            <span className={`text-[10px] font-medium ${isMe ? 'text-white/80' : 'text-slate-500'}`}>
              {statusCopy.description}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <CalendarIcon size={14} className={`mt-0.5 shrink-0 ${isMe ? 'text-white/70' : 'text-slate-400'}`} />
          <span className={`text-[13px] font-medium ${isMe ? 'text-white' : 'text-slate-700'}`}>
            {new Date(appointment_data.date).toLocaleString('ja-JP', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={14} className={`mt-0.5 shrink-0 ${isMe ? 'text-white/70' : 'text-slate-400'}`} />
          <span className={`text-[13px] font-medium break-all ${isMe ? 'text-white' : 'text-slate-700'}`}>
            {appointment_data.location}
          </span>
        </div>
      </div>

      {!isMe && appointment_data.status === 'proposed' && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={onAccept}
            className="flex-1 py-2 bg-lime-500 hover:bg-lime-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            承認する
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
          >
            取消
          </button>
        </div>
      )}

      {isMe && appointment_data.status === 'proposed' && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl transition-colors"
          >
            日程を編集する
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center"
            aria-label="予定を取り消す"
            title="予定を取り消す"
          >
            <XCircle size={14} />
          </button>
        </div>
      )}

      {appointment_data.status === 'canceled' && (
        <button
          onClick={onEdit}
          className={`mt-2 w-full py-2 text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 ${
            isMe
              ? 'bg-white/15 hover:bg-white/25 text-white'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <RotateCcw size={14} />
          再提案する
        </button>
      )}
    </div>
  );
};
