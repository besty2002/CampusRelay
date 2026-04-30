import { useState } from 'react';
import { Star, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MANNER_TAGS_POSITIVE, MANNER_TAGS_NEGATIVE } from '../types';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  fromUserId: string;
  toUserId: string;
  toUserName: string;
}

export const ReviewModal = ({ isOpen, onClose, postId, fromUserId, toUserId, toUserName }: ReviewModalProps) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
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
        if (error.code === '23505') alert('既にレビューを作成済みです。');
        else throw error;
      } else {
        alert('レビューが登録されました！');
        onClose();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative top gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-lime-400 via-amber-400 to-orange-400" />

        {/* Close button */}
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400">
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 mb-1">取引レビュー</h2>
          <p className="text-slate-400 text-sm font-medium">
            <span className="font-bold text-slate-600">{toUserName}</span>さんとの取引はいかがでしたか？
          </p>
        </div>

        {/* Star Rating */}
        <div className="flex justify-center gap-2 mb-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110 active:scale-90"
            >
              <Star
                size={40}
                className={`transition-colors ${star <= displayRating
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-200 hover:text-amber-200'
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-center text-sm font-bold text-amber-500 mb-8">
          {displayRating === 5 && '最高でした！'}
          {displayRating === 4 && 'よかったです'}
          {displayRating === 3 && '普通でした'}
          {displayRating === 2 && 'ちょっと残念'}
          {displayRating === 1 && '改善が必要'}
        </p>

        {/* Manner Tags */}
        <div className="mb-6">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">マナーキーワード（任意）</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {MANNER_TAGS_POSITIVE.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                  selectedTags.includes(tag)
                    ? 'bg-lime-500 text-white border-lime-500 shadow-md shadow-lime-500/20'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-lime-300 hover:text-lime-600'
                }`}
              >
                {selectedTags.includes(tag) ? '✓ ' : ''}{tag}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {MANNER_TAGS_NEGATIVE.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                  selectedTags.includes(tag)
                    ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20'
                    : 'bg-white text-slate-400 border-slate-200 hover:border-red-300 hover:text-red-500'
                }`}
              >
                {selectedTags.includes(tag) ? '✓ ' : ''}{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <textarea
          className="w-full p-5 bg-slate-50 rounded-2xl mb-6 border-none focus:ring-4 focus:ring-lime-500/10 focus:bg-white outline-none font-medium transition-all resize-none"
          placeholder="取引の感想を書いてください（任意、最大300文字）"
          rows={3}
          maxLength={300}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-lime-500 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-lime-500/20 hover:bg-lime-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send size={18} />
          {submitting ? '送信中...' : 'レビューを送信'}
        </button>
      </div>
    </div>
  );
};
