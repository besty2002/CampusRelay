import { type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, Trash, User } from 'lucide-react';

type PostComment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    display_name?: string;
  };
};

interface PostCommentsSectionProps {
  comments: PostComment[];
  userId?: string;
  isOwner: boolean;
  newComment: string;
  submittingComment: boolean;
  copy: {
    commentsTitle: string;
    commentsEmpty: string;
    anonymousUser: string;
    commentDelete: string;
    commentPlaceholder: string;
    loginForComment: string;
    goToLogin: string;
  };
  onCommentChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onDeleteComment: (commentId: string) => void;
}

export const PostCommentsSection = ({
  comments,
  userId,
  isOwner,
  newComment,
  submittingComment,
  copy,
  onCommentChange,
  onSubmit,
  onDeleteComment,
}: PostCommentsSectionProps) => {
  return (
    <div className="mb-8 rounded-[3rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 md:p-12">
      <h3 className="mb-8 flex items-center gap-3 text-2xl font-black text-slate-800">
        <MessageCircle className="text-lime-500" />
        {copy.commentsTitle}
      </h3>

      <div className="mb-10 space-y-6">
        {comments.length === 0 ? (
          <p className="py-4 text-center font-bold italic text-slate-400">{copy.commentsEmpty}</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="group flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-400">
                <User size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-700">
                    {comment.profiles?.display_name ?? copy.anonymousUser}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-300">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="rounded-2xl rounded-tl-none border border-slate-50 bg-slate-50/50 p-4 text-sm font-medium leading-relaxed text-slate-600">
                  {comment.content}
                </p>
                {(userId === comment.user_id || isOwner) && (
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className="mt-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                  >
                    <Trash size={10} />
                    {copy.commentDelete}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {userId ? (
        <form onSubmit={onSubmit} className="relative">
          <input
            type="text"
            placeholder={copy.commentPlaceholder}
            className="w-full rounded-2xl border-none bg-slate-50 py-4 pl-6 pr-14 font-medium outline-none transition-all focus:bg-white focus:ring-4 focus:ring-lime-500/10"
            value={newComment}
            onChange={(event) => onCommentChange(event.target.value)}
            disabled={submittingComment}
          />
          <button
            type="submit"
            disabled={submittingComment || !newComment.trim()}
            className="absolute right-2 top-1/2 rounded-xl bg-lime-500 p-2.5 text-white shadow-lg shadow-lime-500/30 transition-all hover:bg-lime-600 active:scale-90 disabled:opacity-50"
            aria-label="\u30b3\u30e1\u30f3\u30c8\u3092\u9001\u4fe1"
            title="\u30b3\u30e1\u30f3\u30c8\u3092\u9001\u4fe1"
          >
            <Send size={18} />
          </button>
        </form>
      ) : (
        <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm font-bold text-slate-400">{copy.loginForComment}</p>
          <Link to="/auth" className="mt-2 inline-block text-xs font-black uppercase tracking-widest text-lime-600">
            {copy.goToLogin} &rarr;
          </Link>
        </div>
      )}
    </div>
  );
};
