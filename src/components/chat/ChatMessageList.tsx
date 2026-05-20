import type { RefObject } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Clock, Package, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ChatMessage, ChatRoom, PostStatus, Profile } from '../../types';
import { AppointmentMessageCard } from './AppointmentMessageCard';
import { StatusBadge } from '../StatusBadge';

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

const formatDateLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
};

const isSameDay = (a: string, b: string) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

const getReadStateLabel = (message: ChatMessage, lastOutgoingMessageId?: string) => {
  if (message.client_state === 'failed') return '送信失敗';
  if (message.client_state === 'sending') return '送信中';
  if (message.is_read) return '既読';
  if (lastOutgoingMessageId === message.id) return '確認待ち';
  return '送信済み';
};

const TypingIndicator = () => (
  <div className="mb-3 flex justify-start">
    <div className="flex items-end gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-400 shadow-sm">
        ...
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-white px-5 py-3 shadow-sm">
        <div className="flex h-5 items-center gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  </div>
);

interface ChatMessageListProps {
  room: ChatRoom | null;
  currentUserId?: string;
  otherParty?: Profile;
  messages: ChatMessage[];
  isSeller: boolean;
  roomStatus: PostStatus;
  showStatusMenu: boolean;
  thumbnail?: string;
  showScrollDown: boolean;
  isPartnerTyping: boolean;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onToggleStatusMenu: () => void;
  onStatusChange: (newStatus: PostStatus) => void;
  onScrollToBottom: () => void;
  onRetryMessage: (message: ChatMessage) => Promise<void>;
  onOpenAppointmentEdit: (messageId: string, data: { date: string; location: string }) => void;
  onUpdateAppointment: (msgId: string, newStatus: 'accepted' | 'canceled') => void;
}

export const ChatMessageList = ({
  room,
  currentUserId,
  otherParty,
  messages,
  isSeller,
  roomStatus,
  showStatusMenu,
  thumbnail,
  showScrollDown,
  isPartnerTyping,
  messagesContainerRef,
  messagesEndRef,
  onScroll,
  onToggleStatusMenu,
  onStatusChange,
  onScrollToBottom,
  onRetryMessage,
  onOpenAppointmentEdit,
  onUpdateAppointment,
}: ChatMessageListProps) => {
  const otherInitial = otherParty?.display_name?.[0] || '?';
  const lastOutgoingMessage = [...messages].reverse().find((msg) => msg.sender_id === currentUserId);

  return (
    <>
      <div className="relative z-10 mx-3 mb-1 mt-2 flex items-center gap-3 rounded-xl bg-white/90 p-2.5 shadow-sm backdrop-blur-md">
        <Link to={`/post/${room?.post_id}`} className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
            {thumbnail ? (
              <img src={thumbnail} className="h-full w-full object-cover" alt="" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <Package size={16} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-700 transition-colors group-hover:text-[#06C755]">
              {room?.posts?.title}
            </p>
            <p className="text-[10px] font-bold text-[#06C755]">商品詳細を見る →</p>
          </div>
        </Link>

        {isSeller && (
          <div className="relative shrink-0">
            <StatusBadge status={roomStatus} className="!px-2 !py-1" onClick={onToggleStatusMenu} />
          </div>
        )}
      </div>

      {isSeller && showStatusMenu && (
        <div className="relative z-20 -mt-1 mb-2 mr-3 flex justify-end">
          <div className="w-32 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
            <button
              onClick={() => onStatusChange('Available')}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Package size={14} className="text-lime-500" /> 受付中
            </button>
            <button
              onClick={() => onStatusChange('Reserved')}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-bold text-amber-600 transition-colors hover:bg-amber-50"
            >
              <Clock size={14} className="text-amber-500" /> 予約済み
            </button>
            <button
              onClick={() => onStatusChange('Given')}
              className="flex w-full items-center gap-2 border-t border-slate-50 px-3 py-2.5 text-xs font-bold text-slate-400 transition-colors hover:bg-slate-50"
            >
              <CheckCircle2 size={14} className="text-slate-400" /> 譲渡済み
            </button>
          </div>
        </div>
      )}

      <div
        ref={messagesContainerRef}
        onScroll={onScroll}
        className="relative flex-1 space-y-1 overflow-y-auto px-4 py-3"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === currentUserId;
          const showDate = idx === 0 || !isSameDay(messages[idx - 1].created_at, msg.created_at);
          const time = formatTime(msg.created_at);
          const prevMsg = messages[idx - 1];
          const nextMsg = messages[idx + 1];
          const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id || showDate;
          const isLastInGroup =
            !nextMsg || nextMsg.sender_id !== msg.sender_id || (nextMsg && !isSameDay(msg.created_at, nextMsg.created_at));

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="my-4 flex justify-center">
                  <span className="rounded-full bg-black/20 px-4 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                    {formatDateLabel(msg.created_at)}
                  </span>
                </div>
              )}

              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-3' : 'mb-0.5'}`}>
                {!isMe && (
                  <div className="mr-2 w-9 shrink-0">
                    {isFirstInGroup ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-[#06C755] shadow-sm">
                        {otherInitial}
                      </div>
                    ) : null}
                  </div>
                )}

                <div className={`flex max-w-[75%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && isFirstInGroup && (
                    <span className="mb-1 ml-1 text-[11px] font-medium text-white/80">{otherParty?.display_name}</span>
                  )}

                  <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div
                      className={`relative flex flex-col shadow-sm ${
                        isMe
                          ? `bg-[#06C755] text-white ${isFirstInGroup ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl'}`
                          : `bg-white text-slate-800 ${isFirstInGroup ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl'}`
                      } ${msg.client_state === 'sending' ? 'opacity-70' : ''} ${msg.client_state === 'failed' ? 'ring-2 ring-rose-300' : ''}`}
                    >
                      {msg.image_url && (
                        <div className="cursor-pointer p-1" onClick={() => window.open(msg.image_url, '_blank')}>
                          <img
                            src={msg.image_url}
                            alt="送信画像"
                            className="max-h-[250px] max-w-[200px] rounded-xl object-cover sm:max-w-[240px]"
                          />
                        </div>
                      )}

                      {msg.appointment_data && (
                        <AppointmentMessageCard
                          message={msg}
                          isMe={isMe}
                          onAccept={() => onUpdateAppointment(msg.id, 'accepted')}
                          onCancel={() => onUpdateAppointment(msg.id, 'canceled')}
                          onEdit={() =>
                            onOpenAppointmentEdit(msg.id, {
                              date: msg.appointment_data!.date,
                              location: msg.appointment_data!.location,
                            })
                          }
                        />
                      )}

                      {msg.text && !msg.appointment_data && (
                        <p className={`whitespace-pre-wrap break-words text-[14px] leading-relaxed ${msg.image_url ? 'px-3 pb-2 pt-1' : 'px-4 py-2.5'}`}>
                          {msg.text}
                        </p>
                      )}
                    </div>

                    {isLastInGroup && (
                      <div className={`flex shrink-0 flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {isMe && (
                          <span className="text-[10px] font-medium leading-none text-white/80">
                            {getReadStateLabel(msg, lastOutgoingMessage?.id)}
                          </span>
                        )}
                        <span className="text-[10px] leading-tight text-white/60">{time}</span>
                        {isMe && msg.client_state === 'failed' && (
                          <button
                            type="button"
                            onClick={() => void onRetryMessage(msg)}
                            className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-rose-500"
                          >
                            <RefreshCcw size={10} />
                            再送
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {isMe && msg.client_state === 'failed' && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-100/90">
                      <AlertCircle size={12} />
                      送信に失敗しました。再送できます。
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isPartnerTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {showScrollDown && (
        <button
          onClick={onScrollToBottom}
          className="absolute bottom-24 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-lg transition-colors hover:text-[#06C755]"
          aria-label="最新メッセージへ移動"
        >
          <ChevronDown size={20} />
        </button>
      )}
    </>
  );
};
