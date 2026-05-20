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
    description: '内容を確認して返答してください。',
  },
  accepted: {
    badge: '完了待ち',
    description: '予定が確定しました。取引後に完了へ進めます。',
  },
  canceled: {
    badge: '再調整中',
    description: '必要なら日時を調整して再提案できます。',
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
    <div className={`m-1 min-w-[220px] rounded-2xl p-4 ${isMe ? 'bg-[#05B54D]' : 'bg-lime-50'}`}>
      <div className={`mb-3 flex items-center gap-2 border-b pb-2 ${isMe ? 'border-white/20' : 'border-lime-200/50'}`}>
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isMe ? 'bg-white/20 text-white' : 'bg-lime-200 text-lime-700'}`}>
          <CalendarIcon size={16} />
        </div>
        <div className="min-w-0">
          <h4 className={`text-xs font-black ${isMe ? 'text-white' : 'text-slate-800'}`}>取引予定</h4>
          <div className="mt-0.5 flex items-center gap-2">
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

      <div className="mb-3 space-y-2">
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
          <span className={`break-all text-[13px] font-medium ${isMe ? 'text-white' : 'text-slate-700'}`}>
            {appointment_data.location}
          </span>
        </div>
      </div>

      {!isMe && appointment_data.status === 'proposed' && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 rounded-xl bg-lime-500 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-lime-600"
          >
            承認する
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            キャンセル
          </button>
        </div>
      )}

      {isMe && appointment_data.status === 'proposed' && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 rounded-xl bg-white/15 py-2 text-xs font-bold text-white transition-colors hover:bg-white/25"
          >
            日時を調整する
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
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
          className={`mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-colors ${
            isMe
              ? 'bg-white/15 text-white hover:bg-white/25'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <RotateCcw size={14} />
          再提案する
        </button>
      )}
    </div>
  );
};
