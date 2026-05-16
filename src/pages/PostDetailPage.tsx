import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit,
  Heart,
  Loader2,
  MessageCircle,
  Send,
  Star,
  Trash,
  Trash2,
  User,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Post, PostRequest } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ReviewModal } from '../components/ReviewModal';
import { StatusBadge } from '../components/StatusBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { MannerTempGauge } from '../components/MannerTempGauge';
import { ImageViewer } from '../components/ImageViewer';

type PostComment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    display_name?: string;
  };
};

const STATUS_COPY = {
  Available: {
    title: '現在、申請を受け付けています',
    ownerDescription: '気になる申請が届いたら承認して、チャットで受け渡しの相談を進めましょう。',
    visitorDescription: 'チャットで相談するか、譲渡申請を送って取引を始められます。',
  },
  Reserved: {
    title: '譲渡先が決まりました',
    ownerDescription: '承認した相手とチャットで日程や場所を決めて、取引完了まで進めてください。',
    visitorDescription: '現在は予約済みです。やり取り状況はチャットで確認できます。',
  },
  Given: {
    title: '取引は完了しました',
    ownerDescription: 'やり取りが完了したアイテムです。必要ならレビューを送って締めくくりましょう。',
    visitorDescription: 'このアイテムは譲渡済みです。取引後のレビューもここから行えます。',
  },
  Hidden: {
    title: 'この出品は非公開です',
    ownerDescription: '現在は公開されていないため、他のユーザーには表示されません。',
    visitorDescription: '現在は公開されていないため、取引を進めることはできません。',
  },
} as const;

const REQUEST_STATUS_COPY = {
  Pending: {
    label: '申請中',
    className: 'bg-sky-50 text-sky-600',
    description: '出品者の返答を待っています。',
  },
  Approved: {
    label: '承認済み',
    className: 'bg-lime-50 text-lime-600',
    description: 'チャットで日程や場所を相談しましょう。',
  },
  Rejected: {
    label: '見送り',
    className: 'bg-slate-100 text-slate-500',
    description: '今回は別の相手との取引が進んでいます。',
  },
} as const;

export const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [requests, setRequests] = useState<PostRequest[]>([]);
  const [myRequest, setMyRequest] = useState<PostRequest | null>(null);
  const [approvedRequest, setApprovedRequest] = useState<PostRequest | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTargetUserId, setReviewTargetUserId] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const isOwner = user?.id === post?.user_id;

  useEffect(() => {
    fetchDetail();
  }, [postId, user?.id]);

  useEffect(() => {
    if (!user || !postId) {
      setIsWishlisted(false);
      return;
    }

    checkWishlist();
  }, [postId, user?.id]);

  const tradeCopy = post ? STATUS_COPY[post.status] : null;
  const myRequestStatus = myRequest ? REQUEST_STATUS_COPY[myRequest.status] : null;

  const sortedImages = useMemo(
    () => (post?.post_images ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [post?.post_images]
  );

  const fetchDetail = async () => {
    if (!postId) return;

    setLoading(true);

    const { data: postData } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (*),
        post_images (id, storage_path, sort_order)
      `)
      .eq('id', postId)
      .single();

    if (!postData) {
      setPost(null);
      setRequests([]);
      setMyRequest(null);
      setApprovedRequest(null);
      setComments([]);
      setLoading(false);
      return;
    }

    setPost(postData as Post);

    const { data: commentsData } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (display_name)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setComments((commentsData as PostComment[] | null) ?? []);

    const { data: approvedData } = await supabase
      .from('post_requests')
      .select('*, profiles(*)')
      .eq('post_id', postId)
      .eq('status', 'Approved')
      .maybeSingle();
    setApprovedRequest((approvedData as PostRequest | null) ?? null);

    if (user?.id === postData.user_id) {
      const { data: requestData } = await supabase
        .from('post_requests')
        .select('*, profiles(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      setRequests((requestData as PostRequest[] | null) ?? []);
      setMyRequest(null);
    } else if (user?.id) {
      const { data: ownRequestData } = await supabase
        .from('post_requests')
        .select('*, profiles(*)')
        .eq('post_id', postId)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .maybeSingle();

      setRequests([]);
      setMyRequest((ownRequestData as PostRequest | null) ?? null);
    } else {
      setRequests([]);
      setMyRequest(null);
    }

    setLoading(false);
  };

  const checkWishlist = async () => {
    const { data } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user?.id)
      .eq('post_id', postId)
      .maybeSingle();

    setIsWishlisted(Boolean(data));
  };

  const toggleWishlist = async () => {
    if (!user) {
      alert('お気に入りに追加するにはログインが必要です。');
      return;
    }

    if (isWishlisted) {
      const { error } = await supabase.from('wishlists').delete().eq('user_id', user.id).eq('post_id', postId);
      if (!error) setIsWishlisted(false);
      return;
    }

    const { error } = await supabase.from('wishlists').insert({ user_id: user.id, post_id: postId });
    if (!error) setIsWishlisted(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('この出品を削除しますか？')) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;

      alert('出品を削除しました。');
      navigate('/');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRequest = async () => {
    if (!user) {
      alert('譲渡申請を送るにはログインが必要です。');
      return;
    }

    setRequesting(true);

    const { error } = await supabase.from('post_requests').insert({
      post_id: postId,
      requester_id: user.id,
      message: '譲っていただきたいです。よろしくお願いします。',
    });

    if (error) {
      if (error.code === '23505') {
        alert('この出品にはすでに申請済みです。');
      } else {
        alert(error.message);
      }
    } else {
      alert('譲渡申請を送りました。');
      fetchDetail();
    }

    setRequesting(false);
  };

  const handleApprove = async (reqId: string) => {
    await supabase.from('post_requests').update({ status: 'Approved' }).eq('id', reqId);
    await supabase
      .from('post_requests')
      .update({ status: 'Rejected' })
      .eq('post_id', postId)
      .neq('id', reqId)
      .eq('status', 'Pending');
    await supabase.from('posts').update({ status: 'Reserved' }).eq('id', postId);
    fetchDetail();
  };

  const handleComplete = async () => {
    await supabase.from('posts').update({ status: 'Given' }).eq('id', postId);
    fetchDetail();
  };

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      alert('コメントするにはログインが必要です。');
      return;
    }

    if (!newComment.trim()) return;

    setSubmittingComment(true);

    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (!error) {
      setNewComment('');
      fetchDetail();
    }

    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('このコメントを削除しますか？')) return;

    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) fetchDetail();
  };

  const handleReport = async () => {
    if (!user) {
      alert('通報するにはログインが必要です。');
      return;
    }

    if (!reportReason.trim()) {
      alert('通報理由を入力してください。');
      return;
    }

    const { error } = await supabase.from('reports').insert({
      post_id: postId,
      reporter_id: user.id,
      reason: reportReason.trim(),
      status: 'Pending',
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert('通報を受け付けました。');
    setReportReason('');
    setShowReportModal(false);
  };

  const handleStartChat = async () => {
    if (!user) {
      alert('チャットを始めるにはログインが必要です。');
      return;
    }

    if (!post) return;

    try {
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('post_id', post.id)
        .eq('buyer_id', user.id)
        .single();

      if (existingRoom) {
        navigate(`/chat/${existingRoom.id}`);
        return;
      }

      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({
          post_id: post.id,
          seller_id: post.user_id,
          buyer_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (newRoom) navigate(`/chat/${newRoom.id}`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openReview = async () => {
    if (!post || !user) return;

    const targetUserId = isOwner ? approvedRequest?.requester_id : post.user_id;
    if (!targetUserId) {
      alert('レビュー対象のユーザーをまだ特定できません。');
      return;
    }

    setReviewTargetUserId(targetUserId);
    setShowReviewModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-lime-500" />
      </div>
    );
  }

  if (!post) {
    return <div className="p-8 text-center font-bold text-slate-500">出品が見つかりませんでした。</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pt-12 pb-32 relative">
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-slate-400 font-bold hover:text-lime-600 transition-colors"
        >
          <ArrowLeft size={20} />
          戻る
        </button>

        <div className="flex gap-2">
          <button
            onClick={toggleWishlist}
            className={`p-2 rounded-xl shadow-sm border transition-all ${
              isWishlisted
                ? 'bg-pink-50 border-pink-100 text-pink-500'
                : 'bg-white border-slate-100 text-slate-400 hover:text-pink-400'
            }`}
            aria-label={isWishlisted ? 'お気に入りから外す' : 'お気に入りに追加する'}
          >
            <Heart size={20} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>

          {isOwner ? (
            <>
              <button
                onClick={() => navigate(`/post/edit/${post.id}`)}
                className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-lime-600 transition-all"
                aria-label="出品を編集する"
              >
                <Edit size={20} />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 transition-all"
                aria-label="出品を削除する"
              >
                <Trash2 size={20} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 transition-all text-xs font-bold"
            >
              <AlertCircle size={14} />
              通報
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-8">
        {sortedImages.length > 0 && (
          <>
            <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar bg-slate-100 h-64 md:h-96 relative">
              {sortedImages.map((image, index) => (
                <div
                  key={image.id}
                  className="min-w-full snap-center relative cursor-zoom-in"
                  onClick={() => {
                    setViewerIndex(index);
                    setViewerOpen(true);
                  }}
                >
                  <img src={image.storage_path} alt={`${post.title} の画像`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {sortedImages.length > 1 && (
              <div className="flex justify-center gap-1.5 py-3 bg-white">
                {sortedImages.map((_, index) => (
                  <div
                    key={index}
                    className={`rounded-full transition-all ${index === 0 ? 'w-5 h-1.5 bg-lime-500' : 'w-1.5 h-1.5 bg-slate-200'}`}
                  />
                ))}
              </div>
            )}
            <ImageViewer
              images={sortedImages.map((image) => image.storage_path)}
              initialIndex={viewerIndex}
              isOpen={viewerOpen}
              onClose={() => setViewerOpen(false)}
            />
          </>
        )}

        <div className="p-8 md:p-12">
          <div className="flex justify-between items-start mb-6">
            <StatusBadge status={post.status} className="!px-3 !py-1" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-4xl font-black text-slate-800 mb-4 leading-tight">{post.title}</h1>

          <div className="flex gap-2 mb-8 flex-wrap">
            <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{post.category}</span>
            <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{post.condition}</span>
            {post.mode === 'EXCHANGE' && (
              <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                交換
              </span>
            )}
          </div>

          <div className="mb-8 rounded-[2rem] border border-lime-100 bg-lime-50/70 p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-600 mb-2">取引ステータス</p>
            <h2 className="text-xl font-black text-slate-800 mb-2">{tradeCopy?.title}</h2>
            <p className="text-sm font-medium leading-relaxed text-slate-600">
              {isOwner ? tradeCopy?.ownerDescription : tradeCopy?.visitorDescription}
            </p>

            {myRequestStatus && !isOwner && (
              <div className="mt-4 rounded-2xl bg-white px-4 py-3 border border-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-slate-700">あなたの申請状況</span>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black ${myRequestStatus.className}`}>
                    {myRequestStatus.label}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{myRequestStatus.description}</p>
              </div>
            )}

            {approvedRequest && (post.status === 'Reserved' || post.status === 'Given') && (
              <div className="mt-4 rounded-2xl bg-white px-4 py-3 border border-slate-100">
                <p className="text-sm font-black text-slate-700 mb-1">現在の取引相手</p>
                <Link
                  to={`/user/${approvedRequest.requester_id}`}
                  className="text-sm font-bold text-lime-700 hover:text-lime-800"
                >
                  {approvedRequest.profiles?.display_name ?? '取引相手を見る'}
                </Link>
              </div>
            )}
          </div>

          <p className="text-slate-600 text-lg leading-relaxed mb-12 whitespace-pre-wrap font-medium">{post.description}</p>

          {post.mode === 'EXCHANGE' && post.exchange_wanted && (
            <div className="bg-purple-50 p-6 rounded-[2rem] mb-12 border-2 border-purple-100">
              <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2">交換でほしいもの</h3>
              <p className="text-purple-900 font-black text-xl">{post.exchange_wanted}</p>
            </div>
          )}

          <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-[2rem]">
            <Link
              to={`/user/${post.user_id}`}
              className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm text-lime-500 hover:scale-105 transition-transform"
            >
              <User size={28} />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Link to={`/user/${post.user_id}`} className="font-black text-slate-800 text-lg hover:text-lime-600 transition-colors">
                  {post.profiles.display_name}
                </Link>
                <VerifiedBadge
                  verified={(post.profiles as any).email_verified}
                  domain={(post.profiles as any).verified_school_domain}
                />
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="bg-lime-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                  取引完了 {post.profiles.completed_count}回
                </span>
                <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  {post.profiles.avg_rating} ({post.profiles.rating_count})
                </span>
              </div>
              <div className="mt-1">
                <MannerTempGauge temp={(post.profiles as any).manner_temp ?? 36.5} size="sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100">
          {!isOwner && post.status === 'Available' && (
            <div className="flex flex-col gap-3">
              <button
                onClick={handleStartChat}
                className="w-full bg-sky-500 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-sky-500/30 hover:bg-sky-600 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <MessageCircle size={24} />
                チャットで相談する
              </button>
              <button
                onClick={handleRequest}
                disabled={requesting || myRequest?.status === 'Pending' || myRequest?.status === 'Approved'}
                className="w-full bg-lime-500 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-lime-500/30 hover:bg-lime-600 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
              >
                <CheckCircle2 size={24} />
                {requesting ? '申請中...' : myRequest ? '申請済みです' : '譲渡を申請する'}
              </button>
            </div>
          )}

          {isOwner && post.status === 'Available' && (
            <div className="space-y-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="text-lime-500" size={20} />
                譲渡申請リスト
              </h3>
              {requests.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold">まだ申請は届いていません。</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {requests.map((request) => {
                    const requestStatus = REQUEST_STATUS_COPY[request.status];
                    return (
                      <div
                        key={request.id}
                        className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/user/${request.requester_id}`}
                            className="w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center text-sky-500 font-black"
                          >
                            {request.profiles.display_name[0]}
                          </Link>
                          <div>
                            <Link to={`/user/${request.requester_id}`} className="font-bold text-slate-700 hover:text-sky-600">
                              {request.profiles.display_name}
                            </Link>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                              取引完了 {request.profiles.completed_count}回
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${requestStatus.className}`}>
                            {requestStatus.label}
                          </span>
                          {request.status === 'Pending' && (
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="bg-slate-800 text-white px-6 py-2.5 rounded-2xl font-black text-sm hover:bg-slate-900 transition-all shadow-lg shadow-slate-800/20"
                            >
                              承認する
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {isOwner && post.status === 'Reserved' && (
            <div className="space-y-4">
              <div className="rounded-[2rem] bg-white p-5 border border-slate-100">
                <p className="text-sm font-black text-slate-700 mb-1">次のステップ</p>
                <p className="text-sm text-slate-500">
                  チャットで待ち合わせ日時と場所を確定したら、取引完了ボタンでステータスを更新してください。
                </p>
              </div>
              <button
                onClick={handleComplete}
                className="w-full bg-slate-800 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-slate-800/30 hover:bg-black active:scale-[0.98] transition-all"
              >
                取引を完了にする
              </button>
            </div>
          )}

          {post.status === 'Given' && (
            <div className="space-y-6">
              <div className="w-full bg-white py-5 px-5 rounded-[2rem] font-bold text-slate-500 text-center border-2 border-dashed border-slate-200">
                このアイテムは取引完了済みです。必要に応じてレビューを残しましょう。
              </div>

              {user && (
                <button
                  onClick={openReview}
                  className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-amber-500/20 hover:bg-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Star size={20} />
                  相手にレビューを送る
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 mb-8">
        <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
          <MessageCircle className="text-lime-500" />
          コメント欄
        </h3>

        <div className="space-y-6 mb-10">
          {comments.length === 0 ? (
            <p className="text-center text-slate-400 font-bold py-4 italic">
              まだコメントはありません。気になることがあれば書き込んでみましょう。
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-4 group">
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                  <User size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black text-slate-700 text-sm">{comment.profiles?.display_name ?? 'ユーザー'}</span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm font-medium leading-relaxed bg-slate-50/50 p-4 rounded-2xl rounded-tl-none border border-slate-50">
                    {comment.content}
                  </p>
                  {(user?.id === comment.user_id || isOwner) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="mt-2 text-[10px] font-black text-red-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:text-red-600"
                    >
                      <Trash size={10} />
                      削除する
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {user ? (
          <form onSubmit={handleAddComment} className="relative">
            <input
              type="text"
              placeholder="出品について気になることを書いてみましょう。"
              className="w-full pl-6 pr-14 py-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-lime-500/10 focus:bg-white outline-none font-medium transition-all"
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              disabled={submittingComment}
            />
            <button
              type="submit"
              disabled={submittingComment || !newComment.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-lime-500 text-white rounded-xl shadow-lg shadow-lime-500/30 hover:bg-lime-600 active:scale-90 transition-all disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        ) : (
          <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-bold text-sm">コメントするにはログインが必要です。</p>
            <Link to="/auth" className="text-lime-600 font-black text-xs mt-2 inline-block uppercase tracking-widest">
              ログインページへ &rarr;
            </Link>
          </div>
        )}
      </div>

      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2">出品を通報する</h2>
            <p className="text-slate-500 text-sm font-medium mb-6">
              危険な内容や不適切な利用がある場合は、理由を添えてお知らせください。
            </p>

            <textarea
              className="w-full p-4 bg-slate-50 rounded-2xl mb-6 border-none focus:ring-2 focus:ring-red-500 outline-none font-medium h-32"
              placeholder="通報理由を入力してください。"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                キャンセル
              </button>
              <button
                onClick={handleReport}
                className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                通報する
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && user && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          postId={post.id}
          fromUserId={user.id}
          toUserId={reviewTargetUserId}
          toUserName={isOwner ? approvedRequest?.profiles?.display_name ?? '取引相手' : post.profiles.display_name}
        />
      )}
    </div>
  );
};
