import { type FormEvent, useEffect, useMemo, useState } from 'react';
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
import type { Post, PostCondition, PostRequest } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ReviewModal } from '../components/ReviewModal';
import { StatusBadge } from '../components/StatusBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { MannerTempGauge } from '../components/MannerTempGauge';
import { ImageViewer } from '../components/ImageViewer';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { useToast } from '../components/feedback/ToastProvider';

type PostComment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    display_name?: string;
  };
};

/*
const LEGACY_STATUS_COPY = {
  Available: {
    title: 'まだ譲り先を募集しています',
    ownerDescription: '気になる相手が現れたら、チャットで話してから譲渡申請を承認できます。',
    visitorDescription: 'チャットで相談したあと、譲渡申請を送ってやり取りを始められます。',
  },
  Reserved: {
    title: '譲渡先が決まりました',
    ownerDescription: '選んだ相手とチャットで日時や受け渡し方法を決めて、完了したら取引を締めてください。',
    visitorDescription: '現在は選ばれた相手との取引準備中です。内容が変わるまで少しお待ちください。',
  },
  Given: {
    title: '譲渡は完了しました',
    ownerDescription: '受け渡しは完了しています。必要に応じて相手へのレビューを残してください。',
    visitorDescription: 'このアイテムの譲渡は完了済みです。取引相手へのレビューもここから行えます。',
  },
  Hidden: {
    title: 'この投稿は公開停止中です',
    ownerDescription: '現在は公開されていないため、他のユーザーには表示されません。',
    visitorDescription: '現在この投稿は公開されていないため、取引を進めることはできません。',
  },
} as const;

const LEGACY_REQUEST_STATUS_COPY = {
  Pending: {
    label: '申請中',
    className: 'bg-sky-50 text-sky-600',
    description: '出品者からの確認を待っています。',
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

const LEGACY_CATEGORY_LABELS: Record<Post['category'], string> = {
  Uniform: '制服',
  Textbook: '教科書・書籍',
  Digital: 'デジタル機器',
  Life: '生活用品',
  ArtSport: '部活・アート',
  Other: 'その他',
};

const LEGACY_CONDITION_LABELS: Record<PostCondition, string> = {
  'Like New': '未使用に近い',
  Good: '目立った傷なし',
  Used: '使用感あり',
};

const LEGACY_COPY = {
  back: '戻る',
  wishlistAdd: 'お気に入りに追加する',
  wishlistRemove: 'お気に入りから外す',
  loginRequired: 'ログインが必要です',
  wishlistLoginDescription: 'お気に入りに追加するにはログインしてください。',
  requestLoginDescription: '譲渡申請を送るにはログインしてください。',
  commentLoginDescription: 'コメントするにはログインしてください。',
  reportLoginDescription: '通報するにはログインしてください。',
  chatLoginDescription: 'チャットを始めるにはログインしてください。',
  editPost: '投稿を編集する',
  deletePost: '投稿を削除する',
  report: '通報',
  deleteSuccess: '投稿を削除しました',
  deleteError: '投稿の削除に失敗しました',
  requestMessage: 'ぜひ譲っていただきたいです。よろしくお願いします。',
  requestDuplicate: 'すでに譲渡申請を送っています',
  requestSuccess: '譲渡申請を送りました',
  requestError: '譲渡申請に失敗しました',
  approveSuccess: '譲渡申請を承認しました',
  approveError: '譲渡申請の承認に失敗しました',
  completeSuccess: '取引を完了にしました',
  completeError: '取引完了の更新に失敗しました',
  commentAddSuccess: 'コメントを投稿しました',
  commentAddError: 'コメントの投稿に失敗しました',
  commentDeleteSuccess: 'コメントを削除しました',
  commentDeleteError: 'コメントの削除に失敗しました',
  reportReasonRequired: '通報理由を入力してください',
  reportSuccess: '通報を受け付けました',
  reportError: '通報に失敗しました',
  chatError: 'チャットを開始できませんでした',
  reviewTargetMissing: 'レビュー相手が見つかりません',
  notFound: '投稿が見つかりませんでした。',
  tradeStatus: '取引ステータス',
  yourRequest: 'あなたの申請状況',
  currentPartner: '現在の取引相手',
  partnerFallback: '取引相手を見る',
  exchangeWanted: '交換でほしいもの',
  requestList: '譲渡申請リスト',
  noRequests: 'まだ申請は届いていません。',
  ownerCompleteCountPrefix: '取引完了',
  approveButton: '承認する',
  nextStep: '次のステップ',
  nextStepDescription: 'チャットで日程と場所を決めたら、受け渡し完了後に取引を締めてください。',
  completeButton: '取引を完了にする',
  givenNotice: 'このアイテムは譲渡完了済みです。必要に応じてレビューを残せます。',
  reviewButton: '相手にレビューを書く',
  startChat: 'チャットで相談する',
  requestButton: '譲渡を希望する',
  requestingButton: '申請中...',
  requestDoneButton: '申請済みです',
  commentsTitle: 'コメント',
  commentsEmpty: 'まだコメントはありません。気になることがあれば気軽に聞いてみましょう。',
  anonymousUser: 'ユーザー',
  commentDelete: '削除する',
  commentPlaceholder: '投稿について気になることを書いてみましょう。',
  loginForComment: 'コメントするにはログインが必要です。',
  goToLogin: 'ログインページへ',
  reportTitle: '投稿を通報する',
  reportDescription: '利用規約に反する内容や不快な投稿を見つけた場合は、理由を添えてお知らせください。',
  reportPlaceholder: '通報理由を入力してください。',
  cancel: 'キャンセル',
  submitReport: '通報する',
  reviewFallbackName: '取引相手',
  deletePostConfirmTitle: 'この投稿を削除しますか？',
  deletePostConfirmDescription: '削除すると、投稿内容や進行中のやり取りは元に戻せません。',
  deleteCommentConfirmTitle: 'このコメントを削除しますか？',
  deleteCommentConfirmDescription: '削除したコメントは元に戻せません。',
} as const;

*/
const STATUS_COPY = {
  Available: {
    title: 'まだ譲り先を募集しています',
    ownerDescription:
      '気になる申請が届いたら、チャットで相談してから譲渡申請を承認できます。',
    visitorDescription:
      'チャットで相談したあと、譲渡申請を送ってやり取りを始められます。',
  },
  Reserved: {
    title: '譲渡先が決まりました',
    ownerDescription:
      '選んだ相手とチャットで日時や受け渡し方法を決めて、完了したら取引を進めてください。',
    visitorDescription:
      '現在は選ばれた相手との取引調整中です。次の案内が届くまで少しお待ちください。',
  },
  Given: {
    title: '譲渡は完了しました',
    ownerDescription:
      '受け渡しは完了しています。必要に応じて相手へのレビューを残してください。',
    visitorDescription:
      'このアイテムの譲渡は完了済みです。取引相手へのレビューもここから行えます。',
  },
  Hidden: {
    title: 'この投稿は非公開です',
    ownerDescription:
      '現在は公開を停止しているため、ほかのユーザーには表示されません。',
    visitorDescription:
      '現在この投稿は非公開のため、詳細を確認することはできません。',
  },
} as const;

const REQUEST_STATUS_COPY = {
  Pending: {
    label: '申請中',
    className: 'bg-sky-50 text-sky-600',
    description: '出品者からの返事を待っています。',
  },
  Approved: {
    label: '承認済み',
    className: 'bg-lime-50 text-lime-600',
    description: 'チャットで日時や場所の調整を進めましょう。',
  },
  Rejected: {
    label: '見送り',
    className: 'bg-slate-100 text-slate-500',
    description: '今回はほかの相手との取引が進んでいます。',
  },
} as const;

const CATEGORY_LABELS: Record<Post['category'], string> = {
  Uniform: '制服・通学用品',
  Textbook: '教科書・書籍',
  Digital: 'IT・デジタル',
  Life: '生活用品',
  ArtSport: '文化・スポーツ',
  Other: 'その他',
};

const CONDITION_LABELS: Record<PostCondition, string> = {
  'Like New': '未使用に近い',
  Good: '目立った傷なし',
  Used: '使用感あり',
};

const COPY = {
  back: '戻る',
  wishlistAdd: 'お気に入りに追加する',
  wishlistRemove: 'お気に入りから外す',
  loginRequired: 'ログインが必要です',
  wishlistLoginDescription: 'お気に入りに追加するにはログインしてください。',
  requestLoginDescription: '譲渡申請を送るにはログインしてください。',
  commentLoginDescription: 'コメントするにはログインしてください。',
  reportLoginDescription: '通報するにはログインしてください。',
  chatLoginDescription: 'チャットを始めるにはログインしてください。',
  editPost: '投稿を編集する',
  deletePost: '投稿を削除する',
  report: '通報',
  deleteSuccess: '投稿を削除しました',
  deleteError: '投稿の削除に失敗しました',
  requestMessage: 'もしよければ譲っていただきたいです。よろしくお願いします。',
  requestDuplicate: 'すでに譲渡申請を送っています',
  requestSuccess: '譲渡申請を送りました',
  requestError: '譲渡申請に失敗しました',
  approveSuccess: '譲渡申請を承認しました',
  approveError: '譲渡申請の承認に失敗しました',
  completeSuccess: '取引を完了にしました',
  completeError: '取引状態の更新に失敗しました',
  commentAddSuccess: 'コメントを投稿しました',
  commentAddError: 'コメントの投稿に失敗しました',
  commentDeleteSuccess: 'コメントを削除しました',
  commentDeleteError: 'コメントの削除に失敗しました',
  reportReasonRequired: '通報理由を入力してください',
  reportSuccess: '通報を受け付けました',
  reportError: '通報に失敗しました',
  chatError: 'チャットを開始できませんでした',
  reviewTargetMissing: 'レビュー対象の相手が見つかりません',
  notFound: '投稿が見つかりませんでした。',
  tradeStatus: '取引ステータス',
  yourRequest: 'あなたの申請状況',
  currentPartner: '現在の取引相手',
  partnerFallback: '取引相手を見る',
  exchangeWanted: '交換でもほしい',
  requestList: '譲渡申請リスト',
  noRequests: 'まだ申請は届いていません。',
  ownerCompleteCountPrefix: '取引完了',
  approveButton: '承認する',
  nextStep: '次のステップ',
  nextStepDescription:
    'チャットで日時と場所を決めたら、受け渡し後に取引を完了にしてください。',
  completeButton: '取引を完了にする',
  givenNotice:
    'このアイテムは譲渡完了済みです。必要に応じてレビューを残せます。',
  reviewButton: '相手にレビューを書く',
  startChat: 'チャットで相談する',
  requestButton: '譲渡を希望する',
  requestingButton: '申請中...',
  requestDoneButton: '申請済みです',
  commentsTitle: 'コメント',
  commentsEmpty:
    'まだコメントはありません。気になることがあれば気軽に聞いてみましょう。',
  anonymousUser: 'ユーザー',
  commentDelete: '削除する',
  commentPlaceholder: '投稿について気になることを入力してみましょう。',
  loginForComment: 'コメントするにはログインが必要です。',
  goToLogin: 'ログインページへ',
  reportTitle: '投稿を通報する',
  reportDescription:
    '不適切な内容や不安な投稿を見つけた場合は、理由を添えてお知らせください。',
  reportPlaceholder: '通報理由を入力してください。',
  cancel: 'キャンセル',
  submitReport: '通報する',
  reviewFallbackName: '取引相手',
  deletePostConfirmTitle: 'この投稿を削除しますか？',
  deletePostConfirmDescription:
    '削除すると、関連するやり取りは元に戻せません。',
  deleteCommentConfirmTitle: 'このコメントを削除しますか？',
  deleteCommentConfirmDescription: '削除したコメントは元に戻せません。',
} as const;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

export const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

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
  const [deleteTargetCommentId, setDeleteTargetCommentId] = useState<string | null>(null);
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const [busyAction, setBusyAction] = useState<'post' | 'comment' | null>(null);

  const isOwner = user?.id === post?.user_id;
  const tradeCopy = post ? STATUS_COPY[post.status] : null;
  const myRequestStatus = myRequest ? REQUEST_STATUS_COPY[myRequest.status] : null;
  const approvedBuyerId = approvedRequest?.requester_id ?? null;
  const canOpenReservedChat = Boolean(
    post &&
      user &&
      post.status === 'Reserved' &&
      ((isOwner && approvedBuyerId) || approvedBuyerId === user.id)
  );
  const hasDistinctDescription = Boolean(
    post?.description?.trim() && post.description.trim() !== post.title.trim()
  );

  const sortedImages = useMemo(
    () => (post?.post_images ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [post?.post_images]
  );

  useEffect(() => {
    void fetchDetail();
  }, [postId, user?.id]);

  useEffect(() => {
    if (!user || !postId) {
      setIsWishlisted(false);
      return;
    }

    void checkWishlist();
  }, [postId, user?.id]);

  const fetchDetail = async () => {
    if (!postId) return;

    setLoading(true);

    const { data: postData } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!user_id (*),
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
        profiles!user_id (display_name)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setComments((commentsData as PostComment[] | null) ?? []);

    const { data: approvedData } = await supabase
      .from('post_requests')
      .select('*, profiles!requester_id(*)')
      .eq('post_id', postId)
      .eq('status', 'Approved')
      .maybeSingle();
    setApprovedRequest((approvedData as PostRequest | null) ?? null);

    if (user?.id === postData.user_id) {
      const { data: requestData } = await supabase
        .from('post_requests')
        .select('*, profiles!requester_id(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      setRequests((requestData as PostRequest[] | null) ?? []);
      setMyRequest(null);
    } else if (user?.id) {
      const { data: ownRequestData } = await supabase
        .from('post_requests')
        .select('*, profiles!requester_id(*)')
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
    if (!user || !postId) return;

    const { data } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .maybeSingle();

    setIsWishlisted(Boolean(data));
  };

  const toggleWishlist = async () => {
    if (!user) {
      showToast({ tone: 'info', title: COPY.loginRequired, description: COPY.wishlistLoginDescription });
      return;
    }

    if (isWishlisted) {
      const { error } = await supabase.from('wishlists').delete().eq('user_id', user.id).eq('post_id', postId);
      if (!error) {
        setIsWishlisted(false);
        showToast({ tone: 'success', title: 'お気に入りから外しました' });
      }
      return;
    }

    const { error } = await supabase.from('wishlists').insert({ user_id: user.id, post_id: postId });
    if (!error) {
      setIsWishlisted(true);
      showToast({ tone: 'success', title: 'お気に入りに追加しました' });
    }
  };

  const confirmDeleteCurrentPost = async () => {
    if (!postId) return;

    setBusyAction('post');
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;

      showToast({ tone: 'success', title: COPY.deleteSuccess });
      navigate('/');
    } catch (error: unknown) {
      showToast({
        tone: 'error',
        title: COPY.deleteError,
        description: getErrorMessage(error, 'もう一度お試しください。'),
      });
    } finally {
      setBusyAction(null);
      setConfirmDeletePost(false);
    }
  };

  const handleRequest = async () => {
    if (!user) {
      showToast({ tone: 'info', title: COPY.loginRequired, description: COPY.requestLoginDescription });
      return;
    }

    setRequesting(true);
    const { error } = await supabase.from('post_requests').insert({
      post_id: postId,
      requester_id: user.id,
      message: COPY.requestMessage,
    });

    if (error) {
      if (error.code === '23505') {
        showToast({ tone: 'info', title: COPY.requestDuplicate });
      } else {
        showToast({ tone: 'error', title: COPY.requestError, description: error.message });
      }
    } else {
      showToast({ tone: 'success', title: COPY.requestSuccess });
      void fetchDetail();
    }

    setRequesting(false);
  };

  const handleApprove = async (requestId: string) => {
    try {
      const { error: approveError } = await supabase.from('post_requests').update({ status: 'Approved' }).eq('id', requestId);
      if (approveError) throw approveError;

      const { error: rejectError } = await supabase
        .from('post_requests')
        .update({ status: 'Rejected' })
        .eq('post_id', postId)
        .neq('id', requestId)
        .eq('status', 'Pending');
      if (rejectError) throw rejectError;

      const { error: postError } = await supabase.from('posts').update({ status: 'Reserved' }).eq('id', postId);
      if (postError) throw postError;

      showToast({ tone: 'success', title: COPY.approveSuccess });
      void fetchDetail();
    } catch (error: unknown) {
      showToast({
        tone: 'error',
        title: COPY.approveError,
        description: getErrorMessage(error, 'もう一度お試しください。'),
      });
    }
  };

  const handleComplete = async () => {
    try {
      const { error } = await supabase.from('posts').update({ status: 'Given' }).eq('id', postId);
      if (error) throw error;

      showToast({ tone: 'success', title: COPY.completeSuccess });
      void fetchDetail();
    } catch (error: unknown) {
      showToast({
        tone: 'error',
        title: COPY.completeError,
        description: getErrorMessage(error, 'もう一度お試しください。'),
      });
    }
  };

  const handleAddComment = async (event: FormEvent) => {
    event.preventDefault();

    if (!user) {
      showToast({ tone: 'info', title: COPY.loginRequired, description: COPY.commentLoginDescription });
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
      showToast({ tone: 'success', title: COPY.commentAddSuccess });
      void fetchDetail();
    } else {
      showToast({ tone: 'error', title: COPY.commentAddError, description: error.message });
    }

    setSubmittingComment(false);
  };

  const confirmDeleteComment = async () => {
    if (!deleteTargetCommentId) return;

    setBusyAction('comment');
    const { error } = await supabase.from('comments').delete().eq('id', deleteTargetCommentId);
    if (!error) {
      showToast({ tone: 'success', title: COPY.commentDeleteSuccess });
      void fetchDetail();
    } else {
      showToast({ tone: 'error', title: COPY.commentDeleteError, description: error.message });
    }
    setBusyAction(null);
    setDeleteTargetCommentId(null);
  };

  const handleReport = async () => {
    if (!user) {
      showToast({ tone: 'info', title: COPY.loginRequired, description: COPY.reportLoginDescription });
      return;
    }

    if (!reportReason.trim()) {
      showToast({ tone: 'info', title: COPY.reportReasonRequired });
      return;
    }

    const { error } = await supabase.from('reports').insert({
      post_id: postId,
      reporter_id: user.id,
      reason: reportReason.trim(),
      status: 'Pending',
    });

    if (error) {
      showToast({ tone: 'error', title: COPY.reportError, description: error.message });
      return;
    }

    showToast({ tone: 'success', title: COPY.reportSuccess });
    setReportReason('');
    setShowReportModal(false);
  };

  const handleStartChat = async () => {
    if (!user) {
      showToast({ tone: 'info', title: COPY.loginRequired, description: COPY.chatLoginDescription });
      return;
    }

    if (!post) return;

    const chatBuyerId = isOwner ? approvedBuyerId : user.id;
    if (!chatBuyerId) {
      showToast({ tone: 'info', title: COPY.reviewTargetMissing });
      return;
    }

    try {
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('post_id', post.id)
        .eq('buyer_id', chatBuyerId)
        .maybeSingle();

      if (existingRoom) {
        navigate(`/chat/${existingRoom.id}`);
        return;
      }

      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({
          post_id: post.id,
          seller_id: post.user_id,
          buyer_id: chatBuyerId,
        })
        .select()
        .single();

      if (error) throw error;
      if (newRoom) navigate(`/chat/${newRoom.id}`);
    } catch (error: unknown) {
      showToast({
        tone: 'error',
        title: COPY.chatError,
        description: getErrorMessage(error, 'もう一度お試しください。'),
      });
    }
  };

  const openReview = () => {
    if (!post || !user) return;

    const targetUserId = isOwner ? approvedRequest?.requester_id : post.user_id;
    if (!targetUserId) {
      showToast({ tone: 'info', title: COPY.reviewTargetMissing });
      return;
    }

    setReviewTargetUserId(targetUserId);
    setShowReviewModal(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-lime-500" />
      </div>
    );
  }

  if (!post) {
    return <div className="p-8 text-center font-bold text-slate-500">{COPY.notFound}</div>;
  }

  const sellerProfile = post.profiles as Post['profiles'] & {
    verified_school_domain?: string;
    email_verified?: boolean;
    manner_temp?: number;
  };

  const canRequest = !requesting && myRequest?.status !== 'Pending' && myRequest?.status !== 'Approved';
  const requestButtonLabel = requesting
    ? COPY.requestingButton
    : myRequest
      ? COPY.requestDoneButton
      : COPY.requestButton;

  return (
    <>
      <div className="relative mx-auto max-w-2xl p-4 pb-32 pt-12">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 font-bold text-slate-400 transition-colors hover:text-lime-600"
            aria-label={COPY.back}
            title={COPY.back}
          >
            <ArrowLeft size={20} />
            {COPY.back}
          </button>

          <div className="flex gap-2">
            <button
              onClick={toggleWishlist}
              className={`rounded-xl border p-2 shadow-sm transition-all ${
                isWishlisted ? 'border-pink-100 bg-pink-50 text-pink-500' : 'border-slate-100 bg-white text-slate-400 hover:text-pink-400'
              }`}
              aria-label={isWishlisted ? COPY.wishlistRemove : COPY.wishlistAdd}
              title={isWishlisted ? COPY.wishlistRemove : COPY.wishlistAdd}
            >
              <Heart size={20} fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>

            {isOwner ? (
              <>
                <button
                  onClick={() => navigate(`/post/edit/${post.id}`)}
                  className="rounded-xl border border-slate-100 bg-white p-2 text-slate-400 shadow-sm transition-all hover:text-lime-600"
                  aria-label={COPY.editPost}
                  title={COPY.editPost}
                >
                  <Edit size={20} />
                </button>
                <button
                  onClick={() => setConfirmDeletePost(true)}
                  className="rounded-xl border border-slate-100 bg-white p-2 text-slate-400 shadow-sm transition-all hover:text-red-500"
                  aria-label={COPY.deletePost}
                  title={COPY.deletePost}
                >
                  <Trash2 size={20} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1 rounded-xl border border-slate-100 bg-white px-3 py-1.5 text-xs font-bold text-slate-400 shadow-sm transition-all hover:text-red-500"
                aria-label={COPY.report}
                title={COPY.report}
              >
                <AlertCircle size={14} />
                {COPY.report}
              </button>
            )}
          </div>
        </div>

        <div className="mb-8 overflow-hidden rounded-[3rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/50">
          {sortedImages.length > 0 && (
            <>
              <div className="relative flex h-64 snap-x snap-mandatory overflow-x-auto bg-slate-100 md:h-96">
                {sortedImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative min-w-full cursor-zoom-in snap-center"
                    onClick={() => {
                      setViewerIndex(index);
                      setViewerOpen(true);
                    }}
                  >
                    <img src={image.storage_path} alt={`${post.title}の画像 ${index + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
              {sortedImages.length > 1 && (
                <div className="bg-white py-3 text-center text-xs font-bold text-slate-400">
                  {sortedImages.length}枚の画像
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
            <div className="mb-6 flex items-start justify-between">
              <StatusBadge status={post.status} className="!px-3 !py-1" />
              <span className="text-[10px] font-black uppercase tracking-tighter text-slate-300">
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 className="mb-4 text-4xl font-black leading-tight text-slate-800">{post.title}</h1>

            <div className="mb-8 flex flex-wrap gap-2">
              <span className="rounded-lg bg-slate-50 px-3 py-1 text-[10px] font-black uppercase text-slate-500">
                {CATEGORY_LABELS[post.category] ?? post.category}
              </span>
              <span className="rounded-lg bg-slate-50 px-3 py-1 text-[10px] font-black uppercase text-slate-500">
                {CONDITION_LABELS[post.condition] ?? post.condition}
              </span>
              {post.mode === 'EXCHANGE' && (
                <span className="rounded-lg bg-purple-50 px-3 py-1 text-[10px] font-black uppercase text-purple-600">交換</span>
              )}
            </div>

            <div className="mb-8 rounded-[2rem] border border-lime-100 bg-lime-50/70 p-6">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-lime-600">{COPY.tradeStatus}</p>
              <h2 className="mb-2 text-xl font-black text-slate-800">{tradeCopy?.title}</h2>
              <p className="text-sm font-medium leading-relaxed text-slate-600">
                {isOwner ? tradeCopy?.ownerDescription : tradeCopy?.visitorDescription}
              </p>

              {myRequestStatus && !isOwner && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-slate-700">{COPY.yourRequest}</span>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${myRequestStatus.className}`}>
                      {myRequestStatus.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{myRequestStatus.description}</p>
                </div>
              )}

              {approvedRequest && (post.status === 'Reserved' || post.status === 'Given') && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                  <p className="mb-1 text-sm font-black text-slate-700">{COPY.currentPartner}</p>
                  <Link to={`/user/${approvedRequest.requester_id}`} className="text-sm font-bold text-lime-700 hover:text-lime-800">
                    {approvedRequest.profiles?.display_name ?? COPY.partnerFallback}
                  </Link>
                </div>
              )}
            </div>

            {hasDistinctDescription && (
              <p className="mb-12 whitespace-pre-wrap text-lg font-medium leading-relaxed text-slate-600">
                {post.description}
              </p>
            )}

            {post.mode === 'EXCHANGE' && post.exchange_wanted && (
              <div className="mb-12 rounded-[2rem] border-2 border-purple-100 bg-purple-50 p-6">
                <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-purple-400">{COPY.exchangeWanted}</h3>
                <p className="text-xl font-black text-purple-900">{post.exchange_wanted}</p>
              </div>
            )}

            <div className="flex items-center gap-4 rounded-[2rem] bg-slate-50 p-6">
              <Link
                to={`/user/${post.user_id}`}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-lime-500 shadow-sm transition-transform hover:scale-105"
              >
                <User size={28} />
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Link to={`/user/${post.user_id}`} className="text-lg font-black text-slate-800 transition-colors hover:text-lime-600">
                    {post.profiles.display_name}
                  </Link>
                  <VerifiedBadge verified={sellerProfile.email_verified} domain={sellerProfile.verified_school_domain} />
                </div>
                <div className="mt-0.5 flex items-center gap-3">
                  <span className="rounded-md bg-lime-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                    {COPY.ownerCompleteCountPrefix} {post.profiles.completed_count}件
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {post.profiles.avg_rating} ({post.profiles.rating_count})
                  </span>
                </div>
                <div className="mt-1">
                  <MannerTempGauge temp={sellerProfile.manner_temp ?? 36.5} size="sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 p-8">
            {!isOwner && post.status === 'Available' && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleStartChat}
                  className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-sky-500 py-5 text-xl font-black text-white shadow-xl shadow-sky-500/30 transition-all hover:bg-sky-600 active:scale-[0.98]"
                >
                  <MessageCircle size={24} />
                  {COPY.startChat}
                </button>
                <button
                  onClick={handleRequest}
                  disabled={!canRequest}
                  className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-lime-500 py-5 text-xl font-black text-white shadow-xl shadow-lime-500/30 transition-all hover:bg-lime-600 active:scale-[0.98] disabled:opacity-60"
                >
                  <CheckCircle2 size={24} />
                  {requestButtonLabel}
                </button>
              </div>
            )}

            {isOwner && post.status === 'Available' && (
              <div className="space-y-6">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
                  <CheckCircle2 className="text-lime-500" size={20} />
                  {COPY.requestList}
                </h3>
                {requests.length === 0 ? (
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
                    <p className="font-bold text-slate-400">{COPY.noRequests}</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {requests.map((request) => {
                      const requestStatus = REQUEST_STATUS_COPY[request.status];
                      return (
                        <div
                          key={request.id}
                          className="flex flex-col gap-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <Link
                              to={`/user/${request.requester_id}`}
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 font-black text-sky-500"
                            >
                              {request.profiles.display_name[0]}
                            </Link>
                            <div>
                              <Link to={`/user/${request.requester_id}`} className="font-bold text-slate-700 hover:text-sky-600">
                                {request.profiles.display_name}
                              </Link>
                              <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                                {COPY.ownerCompleteCountPrefix} {request.profiles.completed_count}件
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
                                className="rounded-2xl bg-slate-800 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-800/20 transition-all hover:bg-slate-900"
                              >
                                {COPY.approveButton}
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
                <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
                  <p className="mb-1 text-sm font-black text-slate-700">{COPY.nextStep}</p>
                  <p className="text-sm text-slate-500">{COPY.nextStepDescription}</p>
                </div>
                <button
                  onClick={handleStartChat}
                  className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-sky-500 py-5 text-xl font-black text-white shadow-xl shadow-sky-500/30 transition-all hover:bg-sky-600 active:scale-[0.98]"
                >
                  <MessageCircle size={24} />
                  {COPY.startChat}
                </button>
                <button
                  onClick={handleComplete}
                  className="w-full rounded-[2rem] bg-slate-800 py-5 text-xl font-black text-white shadow-xl shadow-slate-800/30 transition-all hover:bg-black active:scale-[0.98]"
                >
                  {COPY.completeButton}
                </button>
              </div>
            )}

            {canOpenReservedChat && !isOwner && (
              <div className="space-y-4">
                <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
                  <p className="mb-1 text-sm font-black text-slate-700">{COPY.nextStep}</p>
                  <p className="text-sm text-slate-500">{COPY.nextStepDescription}</p>
                </div>
                <button
                  onClick={handleStartChat}
                  className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-sky-500 py-5 text-xl font-black text-white shadow-xl shadow-sky-500/30 transition-all hover:bg-sky-600 active:scale-[0.98]"
                >
                  <MessageCircle size={24} />
                  {COPY.startChat}
                </button>
              </div>
            )}

            {post.status === 'Given' && (
              <div className="space-y-6">
                <div className="w-full rounded-[2rem] border-2 border-dashed border-slate-200 bg-white px-5 py-5 text-center font-bold text-slate-500">
                  {COPY.givenNotice}
                </div>

                {user && (
                  <button
                    onClick={openReview}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-lg font-black text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-[0.98]"
                  >
                    <Star size={20} />
                    {COPY.reviewButton}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 rounded-[3rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 md:p-12">
          <h3 className="mb-8 flex items-center gap-3 text-2xl font-black text-slate-800">
            <MessageCircle className="text-lime-500" />
            {COPY.commentsTitle}
          </h3>

          <div className="mb-10 space-y-6">
            {comments.length === 0 ? (
              <p className="py-4 text-center font-bold italic text-slate-400">{COPY.commentsEmpty}</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="group flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-400">
                    <User size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-700">{comment.profiles?.display_name ?? COPY.anonymousUser}</span>
                      <span className="text-[10px] font-bold uppercase text-slate-300">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="rounded-2xl rounded-tl-none border border-slate-50 bg-slate-50/50 p-4 text-sm font-medium leading-relaxed text-slate-600">
                      {comment.content}
                    </p>
                    {(user?.id === comment.user_id || isOwner) && (
                      <button
                        onClick={() => setDeleteTargetCommentId(comment.id)}
                        className="mt-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                      >
                        <Trash size={10} />
                        {COPY.commentDelete}
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
                placeholder={COPY.commentPlaceholder}
                className="w-full rounded-2xl border-none bg-slate-50 py-4 pl-6 pr-14 font-medium outline-none transition-all focus:bg-white focus:ring-4 focus:ring-lime-500/10"
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                disabled={submittingComment}
              />
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="absolute right-2 top-1/2 rounded-xl bg-lime-500 p-2.5 text-white shadow-lg shadow-lime-500/30 transition-all hover:bg-lime-600 active:scale-90 disabled:opacity-50"
                aria-label="コメントを送信する"
                title="コメントを送信する"
              >
                <Send size={18} />
              </button>
            </form>
          ) : (
            <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-bold text-slate-400">{COPY.loginForComment}</p>
              <Link to="/auth" className="mt-2 inline-block text-xs font-black uppercase tracking-widest text-lime-600">
                {COPY.goToLogin} &rarr;
              </Link>
            </div>
          )}
        </div>

        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <h2 className="mb-2 text-2xl font-black text-slate-800">{COPY.reportTitle}</h2>
              <p className="mb-6 text-sm font-medium text-slate-500">{COPY.reportDescription}</p>

              <textarea
                className="mb-6 h-32 w-full rounded-2xl border-none bg-slate-50 p-4 font-medium outline-none focus:ring-2 focus:ring-red-500"
                placeholder={COPY.reportPlaceholder}
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 rounded-2xl bg-slate-100 py-4 font-bold text-slate-600 transition-all hover:bg-slate-200"
                >
                  {COPY.cancel}
                </button>
                <button
                  onClick={handleReport}
                  className="flex-1 rounded-2xl bg-red-500 py-4 font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600"
                >
                  {COPY.submitReport}
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
            toUserName={isOwner ? approvedRequest?.profiles?.display_name ?? COPY.reviewFallbackName : post.profiles.display_name}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDeletePost}
        title={COPY.deletePostConfirmTitle}
        description={COPY.deletePostConfirmDescription}
        confirmLabel={COPY.deletePost}
        cancelLabel={COPY.cancel}
        tone="danger"
        busy={busyAction === 'post'}
        onCancel={() => setConfirmDeletePost(false)}
        onConfirm={confirmDeleteCurrentPost}
      />

      <ConfirmDialog
        isOpen={deleteTargetCommentId !== null}
        title={COPY.deleteCommentConfirmTitle}
        description={COPY.deleteCommentConfirmDescription}
        confirmLabel={COPY.commentDelete}
        cancelLabel={COPY.cancel}
        tone="danger"
        busy={busyAction === 'comment'}
        onCancel={() => setDeleteTargetCommentId(null)}
        onConfirm={confirmDeleteComment}
      />
    </>
  );
};
