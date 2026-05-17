import { useState } from 'react';
import { Send, Star, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MANNER_TAGS_NEGATIVE, MANNER_TAGS_POSITIVE } from '../types';
import { useToast } from './feedback/ToastProvider';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  fromUserId: string;
  toUserId: string;
  toUserName: string;
}

const RATING_COPY = {
  1: '改善が必要でした',
  2: '少し気になりました',
  3: '普通でした',
  4: 'よかったです',
  5: 'とてもよかったです',
} as const;

const COPY = {
  title: '取引レビュー',
  subtitle: 'との取引はいかがでしたか？',
  duplicate: 'すでにレビューを投稿しています',
  success: 'レビューを投稿しました',
  error: 'レビューの投稿に失敗しました',
  retry: '時間をおいてもう一度お試しください。',
  tagsLabel: 'マナータグを選ぶ（任意）',
  textareaPlaceholder: '取引の感想を書いてください。（任意・最大300文字）',
  submit: 'レビューを送信',
  submitting: '送信中...',
  selectedMark: '✓ ',
} as const;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

export const ReviewModal = ({ isOpen, onClose, postId, fromUserId, toUserId, toUserName }: ReviewModalProps) => {
  const { showToast } = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  };

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        post_id: postId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        rating,
        comment: comment.trim() || null,
        manner_tags: selectedTags,
      });

      if (error) {
        if (error.code === '23505') {
          showToast({ tone: 'info', title: COPY.duplicate });
        } else {
          throw error;
        }
      } else {
        showToast({ tone: 'success', title: COPY.success });
        onClose();
      }
    } catch (error: unknown) {
      showToast({
        tone: 'error',
        title: COPY.error,
        description: getErrorMessage(error, COPY.retry),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute left-0 right-0 top-0 h-1.5 bg-gradient-to-r from-lime-400 via-amber-400 to-orange-400" />

        <button onClick={onClose} className="absolute right-6 top-6 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100">
          <X size={20} />
        </button>

        <div className="mb-8 text-center">
          <h2 className="mb-1 text-2xl font-black text-slate-800">{COPY.title}</h2>
          <p className="text-sm font-medium text-slate-400">
            <span className="font-bold text-slate-600">{toUserName}</span>
            {COPY.subtitle}
          </p>
        </div>

        <div className="mb-2 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110 active:scale-90"
            >
              <Star
                size={40}
                className={`transition-colors ${
                  star <= displayRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-200'
                }`}
              />
            </button>
          ))}
        </div>
        <p className="mb-8 text-center text-sm font-bold text-amber-500">{RATING_COPY[displayRating as keyof typeof RATING_COPY]}</p>

        <div className="mb-6">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">{COPY.tagsLabel}</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {MANNER_TAGS_POSITIVE.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                  selectedTags.includes(tag)
                    ? 'border-lime-500 bg-lime-500 text-white shadow-md shadow-lime-500/20'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-lime-300 hover:text-lime-600'
                }`}
              >
                {selectedTags.includes(tag) ? COPY.selectedMark : ''}
                {tag}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {MANNER_TAGS_NEGATIVE.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                  selectedTags.includes(tag)
                    ? 'border-red-500 bg-red-500 text-white shadow-md shadow-red-500/20'
                    : 'border-slate-200 bg-white text-slate-400 hover:border-red-300 hover:text-red-500'
                }`}
              >
                {selectedTags.includes(tag) ? COPY.selectedMark : ''}
                {tag}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className="mb-6 w-full resize-none rounded-2xl border-none bg-slate-50 p-5 font-medium outline-none transition-all focus:bg-white focus:ring-4 focus:ring-lime-500/10"
          placeholder={COPY.textareaPlaceholder}
          rows={3}
          maxLength={300}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-500 py-4 text-lg font-black text-white shadow-lg shadow-lime-500/20 transition-all hover:bg-lime-600 active:scale-[0.98] disabled:opacity-50"
        >
          <Send size={18} />
          {submitting ? COPY.submitting : COPY.submit}
        </button>
      </div>
    </div>
  );
};
