import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Post, PostCondition, PostRequest } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ReviewModal } from '../components/ReviewModal';
import { ImageViewer } from '../components/ImageViewer';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { useToast } from '../components/feedback/ToastProvider';
import { PostCommentsSection } from '../components/post/PostCommentsSection';
import { PostDetailToolbar } from '../components/post/PostDetailToolbar';
import { PostDetailHero } from '../components/post/PostDetailHero';
import { PostDetailActionPanel } from '../components/post/PostDetailActionPanel';

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
    title: '\u307e\u3060\u8b72\u308a\u5148\u3092\u52df\u96c6\u3057\u3066\u3044\u307e\u3059',
    ownerDescription:
      '\u6c17\u306b\u306a\u308b\u76f8\u624b\u304c\u3044\u308c\u3070\u3001\u30c1\u30e3\u30c3\u30c8\u3067\u76f8\u8ac7\u3057\u3066\u304b\u3089\u8b72\u6e21\u5148\u3092\u6c7a\u3081\u3089\u308c\u307e\u3059\u3002',
    visitorDescription:
      '\u30c1\u30e3\u30c3\u30c8\u3067\u76f8\u8ac7\u3059\u308b\u524d\u306b\u3001\u307e\u305a\u306f\u8b72\u6e21\u3092\u5e0c\u671b\u3057\u3066\u7533\u8acb\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  },
  Reserved: {
    title: '\u8b72\u6e21\u5148\u304c\u6c7a\u307e\u308a\u307e\u3057\u305f',
    ownerDescription:
      '\u53d6\u5f15\u76f8\u624b\u3068\u30c1\u30e3\u30c3\u30c8\u3067\u76f8\u8ac7\u3057\u306a\u304c\u3089\u3001\u53d7\u3051\u6e21\u3057\u306e\u4e88\u5b9a\u3092\u9032\u3081\u3066\u3044\u304d\u307e\u3057\u3087\u3046\u3002',
    visitorDescription:
      '\u3042\u306a\u305f\u306f\u9078\u3070\u308c\u305f\u53d6\u5f15\u76f8\u624b\u3067\u3059\u3002\u30c1\u30e3\u30c3\u30c8\u3067\u53d7\u3051\u6e21\u3057\u306e\u4e88\u5b9a\u3092\u9032\u3081\u3066\u3044\u304d\u307e\u3057\u3087\u3046\u3002',
  },
  Given: {
    title: '\u8b72\u6e21\u306f\u5b8c\u4e86\u3057\u307e\u3057\u305f',
    ownerDescription:
      '\u53d7\u3051\u6e21\u3057\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002\u5fc5\u8981\u3067\u3042\u308c\u3070\u3001\u53d6\u5f15\u76f8\u624b\u3078\u30ec\u30d3\u30e5\u30fc\u3092\u66f8\u304d\u307e\u3057\u3087\u3046\u3002',
    visitorDescription:
      '\u3053\u306e\u30a2\u30a4\u30c6\u30e0\u306e\u8b72\u6e21\u306f\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002\u5fc5\u8981\u3067\u3042\u308c\u3070\u3001\u53d6\u5f15\u76f8\u624b\u3078\u30ec\u30d3\u30e5\u30fc\u3092\u66f8\u304d\u307e\u3057\u3087\u3046\u3002',
  },
  Hidden: {
    title: '\u3053\u306e\u6295\u7a3f\u306f\u516c\u958b\u505c\u6b62\u4e2d\u3067\u3059',
    ownerDescription:
      '\u3053\u306e\u6295\u7a3f\u306f\u73fe\u5728\u975e\u516c\u958b\u3067\u3059\u3002\u5fc5\u8981\u3067\u3042\u308c\u3070\u3001\u518d\u5ea6\u516c\u958b\u72b6\u614b\u3078\u623b\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
    visitorDescription:
      '\u3053\u306e\u6295\u7a3f\u306f\u73fe\u5728\u975e\u516c\u958b\u306e\u305f\u3081\u3001\u8a73\u7d30\u3092\u78ba\u8a8d\u3059\u308b\u3053\u3068\u306f\u3067\u304d\u307e\u305b\u3093\u3002',
  },
} as const;

const REQUEST_STATUS_COPY = {
  Pending: {
    label: '\u7533\u8acb\u4e2d',
    className: 'bg-sky-50 text-sky-600',
    description: '\u51fa\u54c1\u8005\u304b\u3089\u306e\u8fd4\u7b54\u3092\u5f85\u3063\u3066\u3044\u307e\u3059\u3002',
  },
  Approved: {
    label: '\u627f\u8a8d\u6e08\u307f',
    className: 'bg-lime-50 text-lime-600',
    description: '\u30c1\u30e3\u30c3\u30c8\u3067\u53d7\u3051\u6e21\u3057\u306e\u4e88\u5b9a\u3092\u9032\u3081\u3089\u308c\u307e\u3059\u3002',
  },
  Rejected: {
    label: '\u898b\u9001\u308a',
    className: 'bg-slate-100 text-slate-500',
    description: '\u4eca\u56de\u306f\u5225\u306e\u76f8\u624b\u3068\u306e\u53d6\u5f15\u306b\u9032\u307f\u307e\u3057\u305f\u3002',
  },
} as const;

const CATEGORY_LABELS: Record<Post['category'], string> = {
  Uniform: '\u5236\u670d\u30fb\u901a\u5b66\u7528\u54c1',
  Textbook: '\u6559\u79d1\u66f8\u30fb\u66f8\u7c4d',
  Digital: 'IT\u30fb\u30c7\u30b8\u30bf\u30eb',
  Life: '\u751f\u6d3b\u7528\u54c1',
  ArtSport: '\u6587\u5316\u30fb\u30b9\u30dd\u30fc\u30c4',
  Other: '\u305d\u306e\u4ed6',
};

const CONDITION_LABELS: Record<PostCondition, string> = {
  'Like New': '\u672a\u4f7f\u7528\u306b\u8fd1\u3044',
  Good: '\u76ee\u7acb\u3063\u305f\u50b7\u306a\u3057',
  Used: '\u4f7f\u7528\u611f\u3042\u308a',
};

const COPY = {
  back: '\u623b\u308b',
  wishlistAdd: '\u304a\u6c17\u306b\u5165\u308a\u306b\u8ffd\u52a0\u3059\u308b',
  wishlistRemove: '\u304a\u6c17\u306b\u5165\u308a\u304b\u3089\u5916\u3059',
  loginRequired: '\u30ed\u30b0\u30a4\u30f3\u304c\u5fc5\u8981\u3067\u3059',
  wishlistLoginDescription: '\u304a\u6c17\u306b\u5165\u308a\u306b\u8ffd\u52a0\u3059\u308b\u306b\u306f\u30ed\u30b0\u30a4\u30f3\u304c\u5fc5\u8981\u3067\u3059\u3002',
  requestLoginDescription: '\u8b72\u6e21\u3092\u5e0c\u671b\u3059\u308b\u306b\u306f\u30ed\u30b0\u30a4\u30f3\u304c\u5fc5\u8981\u3067\u3059\u3002',
  commentLoginDescription: '\u30b3\u30e1\u30f3\u30c8\u3092\u6295\u7a3f\u3059\u308b\u306b\u306f\u30ed\u30b0\u30a4\u30f3\u304c\u5fc5\u8981\u3067\u3059\u3002',
  reportLoginDescription: '\u901a\u5831\u3059\u308b\u306b\u306f\u30ed\u30b0\u30a4\u30f3\u304c\u5fc5\u8981\u3067\u3059\u3002',
  chatLoginDescription: '\u30c1\u30e3\u30c3\u30c8\u3092\u59cb\u3081\u308b\u306b\u306f\u30ed\u30b0\u30a4\u30f3\u304c\u5fc5\u8981\u3067\u3059\u3002',
  editPost: '\u6295\u7a3f\u3092\u7de8\u96c6\u3059\u308b',
  deletePost: '\u6295\u7a3f\u3092\u524a\u9664\u3059\u308b',
  report: '\u901a\u5831',
  deleteSuccess: '\u6295\u7a3f\u3092\u524a\u9664\u3057\u307e\u3057\u305f',
  deleteError: '\u6295\u7a3f\u3092\u524a\u9664\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f',
  requestMessage: '\u8b72\u6e21\u3092\u5e0c\u671b\u3057\u3066\u3044\u307e\u3059\u3002\u3088\u308d\u3057\u304f\u304a\u9858\u3044\u3057\u307e\u3059\u3002',
  requestDuplicate: '\u3059\u3067\u306b\u8b72\u6e21\u3092\u5e0c\u671b\u3057\u3066\u3044\u307e\u3059',
  requestSuccess: '\u8b72\u6e21\u5e0c\u671b\u3092\u9001\u4fe1\u3057\u307e\u3057\u305f',
  requestError: '\u8b72\u6e21\u5e0c\u671b\u3092\u9001\u4fe1\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f',
  approveSuccess: '\u7533\u8acb\u3092\u627f\u8a8d\u3057\u307e\u3057\u305f',
  approveError: '\u7533\u8acb\u3092\u627f\u8a8d\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f',
  completeSuccess: '\u53d6\u5f15\u3092\u5b8c\u4e86\u306b\u3057\u307e\u3057\u305f',
  completeError: '\u53d6\u5f15\u306e\u72b6\u614b\u3092\u66f4\u65b0\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f',
  commentAddSuccess: '\u30b3\u30e1\u30f3\u30c8\u3092\u6295\u7a3f\u3057\u307e\u3057\u305f',
  commentAddError: '\u30b3\u30e1\u30f3\u30c8\u3092\u6295\u7a3f\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f',
  commentDeleteSuccess: '\u30b3\u30e1\u30f3\u30c8\u3092\u524a\u9664\u3057\u307e\u3057\u305f',
  commentDeleteError: '\u30b3\u30e1\u30f3\u30c8\u3092\u524a\u9664\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f',
  reportReasonRequired: '\u901a\u5831\u7406\u7531\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044',
  reportSuccess: '\u901a\u5831\u3092\u53d7\u3051\u4ed8\u3051\u307e\u3057\u305f',
  reportError: '\u901a\u5831\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f',
  chatError: '\u30c1\u30e3\u30c3\u30c8\u3092\u958b\u59cb\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f',
  reviewTargetMissing: '\u30ec\u30d3\u30e5\u30fc\u5bfe\u8c61\u306e\u76f8\u624b\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f',
  notFound: '\u6295\u7a3f\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f\u3002',
  tradeStatus: '\u53d6\u5f15\u30b9\u30c6\u30fc\u30bf\u30b9',
  yourRequest: '\u3042\u306a\u305f\u306e\u7533\u8acb\u72b6\u6cc1',
  currentPartner: '\u73fe\u5728\u306e\u53d6\u5f15\u76f8\u624b',
  partnerFallback: '\u53d6\u5f15\u76f8\u624b',
  exchangeWanted: '\u4ea4\u63db\u3067\u307b\u3057\u3044\u3082\u306e',
  requestList: '\u7533\u8acb\u4e00\u89a7',
  noRequests: '\u307e\u3060\u7533\u8acb\u306f\u5c4a\u3044\u3066\u3044\u307e\u305b\u3093\u3002',
  ownerCompleteCountPrefix: '\u5b8c\u4e86\u3057\u305f\u53d6\u5f15',
  approveButton: '\u627f\u8a8d\u3059\u308b',
  nextStep: '\u6b21\u306e\u30b9\u30c6\u30c3\u30d7',
  nextStepDescription:
    '\u30c1\u30e3\u30c3\u30c8\u3067\u53d7\u3051\u6e21\u3057\u306e\u65e5\u6642\u3084\u5834\u6240\u3092\u76f8\u8ac7\u3057\u3066\u3001\u53d6\u5f15\u3092\u5b8c\u4e86\u307e\u3067\u9032\u3081\u3066\u3044\u304d\u307e\u3057\u3087\u3046\u3002',
  completeButton: '\u53d6\u5f15\u3092\u5b8c\u4e86\u306b\u3059\u308b',
  givenNotice:
    '\u3053\u306e\u30a2\u30a4\u30c6\u30e0\u306e\u8b72\u6e21\u306f\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002\u5fc5\u8981\u3067\u3042\u308c\u3070\u3001\u53d6\u5f15\u76f8\u624b\u306b\u30ec\u30d3\u30e5\u30fc\u3092\u66f8\u304d\u307e\u3057\u3087\u3046\u3002',
  reviewButton: '\u76f8\u624b\u306b\u30ec\u30d3\u30e5\u30fc\u3092\u66f8\u304f',
  startChat: '\u30c1\u30e3\u30c3\u30c8\u3067\u76f8\u8ac7\u3059\u308b',
  requestButton: '\u8b72\u6e21\u3092\u5e0c\u671b\u3059\u308b',
  requestingButton: '\u7533\u8acb\u4e2d...',
  requestDoneButton: '\u7533\u8acb\u6e08\u307f\u3067\u3059',
  commentsTitle: '\u30b3\u30e1\u30f3\u30c8',
  commentsEmpty:
    '\u307e\u3060\u30b3\u30e1\u30f3\u30c8\u306f\u3042\u308a\u307e\u305b\u3093\u3002\u6c17\u306b\u306a\u308b\u3053\u3068\u304c\u3042\u308c\u3070\u6c17\u8efd\u306b\u6295\u7a3f\u3057\u3066\u307f\u307e\u3057\u3087\u3046\u3002',
  anonymousUser: '\u30e6\u30fc\u30b6\u30fc',
  commentDelete: '\u524a\u9664\u3059\u308b',
  commentPlaceholder: '\u4f7f\u3044\u65b9\u3084\u53d7\u3051\u6e21\u3057\u306b\u3064\u3044\u3066\u3001\u6c17\u306b\u306a\u308b\u3053\u3068\u3092\u805e\u3044\u3066\u307f\u307e\u3057\u3087\u3046\u3002',
  loginForComment: '\u30b3\u30e1\u30f3\u30c8\u3092\u6295\u7a3f\u3059\u308b\u306b\u306f\u30ed\u30b0\u30a4\u30f3\u304c\u5fc5\u8981\u3067\u3059\u3002',
  goToLogin: '\u30ed\u30b0\u30a4\u30f3\u30da\u30fc\u30b8\u3078',
  reportTitle: '\u6295\u7a3f\u3092\u901a\u5831\u3059\u308b',
  reportDescription:
    '\u4e0d\u9069\u5207\u306a\u5185\u5bb9\u3084\u5371\u967a\u3060\u3068\u611f\u3058\u308b\u6295\u7a3f\u304c\u3042\u308c\u3070\u3001\u7406\u7531\u3092\u6dfb\u3048\u3066\u904b\u55b6\u306b\u77e5\u3089\u305b\u3066\u304f\u3060\u3055\u3044\u3002',
  reportPlaceholder: '\u901a\u5831\u7406\u7531\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  cancel: '\u30ad\u30e3\u30f3\u30bb\u30eb',
  submitReport: '\u901a\u5831\u3059\u308b',
  reviewFallbackName: '\u53d6\u5f15\u76f8\u624b',
  deletePostConfirmTitle: '\u3053\u306e\u6295\u7a3f\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f',
  deletePostConfirmDescription:
    '\u524a\u9664\u3059\u308b\u3068\u3001\u95a2\u9023\u3059\u308b\u30c7\u30fc\u30bf\u3082\u542b\u3081\u3066\u5143\u306b\u623b\u305b\u307e\u305b\u3093\u3002',
  deleteCommentConfirmTitle: '\u3053\u306e\u30b3\u30e1\u30f3\u30c8\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f',
  deleteCommentConfirmDescription: '\u524a\u9664\u3057\u305f\u30b3\u30e1\u30f3\u30c8\u306f\u5143\u306b\u623b\u305b\u307e\u305b\u3093\u3002',
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
        showToast({ tone: 'success', title: '\u304a\u6c17\u306b\u5165\u308a\u304b\u3089\u5916\u3057\u307e\u3057\u305f' });
      }
      return;
    }

    const { error } = await supabase.from('wishlists').insert({ user_id: user.id, post_id: postId });
    if (!error) {
      setIsWishlisted(true);
      showToast({ tone: 'success', title: '\u304a\u6c17\u306b\u5165\u308a\u306b\u8ffd\u52a0\u3057\u307e\u3057\u305f' });
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
        description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
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
        description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
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
        description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
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
        description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
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

  const canRequest = !requesting && myRequest?.status !== 'Pending' && myRequest?.status !== 'Approved';
  const requestButtonLabel = requesting
    ? COPY.requestingButton
    : myRequest
      ? COPY.requestDoneButton
      : COPY.requestButton;

  return (
    <>
      <div className="relative mx-auto max-w-2xl p-4 pb-32 pt-12">
        <PostDetailToolbar
          backLabel={COPY.back}
          wishlistActive={isWishlisted}
          wishlistAddLabel={COPY.wishlistAdd}
          wishlistRemoveLabel={COPY.wishlistRemove}
          isOwner={isOwner}
          editLabel={COPY.editPost}
          deleteLabel={COPY.deletePost}
          reportLabel={COPY.report}
          onBack={() => navigate(-1)}
          onToggleWishlist={toggleWishlist}
          onEdit={() => navigate(`/post/edit/${post.id}`)}
          onDelete={() => setConfirmDeletePost(true)}
          onReport={() => setShowReportModal(true)}
        />

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

          <PostDetailHero
            post={post}
            isOwner={isOwner}
            tradeCopy={tradeCopy}
            myRequestStatus={myRequestStatus}
            approvedRequest={approvedRequest}
            hasDistinctDescription={hasDistinctDescription}
            categoryLabels={CATEGORY_LABELS}
            conditionLabels={CONDITION_LABELS}
            copy={{
              tradeStatus: COPY.tradeStatus,
              yourRequest: COPY.yourRequest,
              currentPartner: COPY.currentPartner,
              partnerFallback: COPY.partnerFallback,
              exchangeWanted: COPY.exchangeWanted,
              ownerCompleteCountPrefix: COPY.ownerCompleteCountPrefix,
            }}
          />

          <PostDetailActionPanel
            isOwner={isOwner}
            postStatus={post.status}
            canOpenReservedChat={canOpenReservedChat}
            canRequest={canRequest}
            requesting={requesting}
            requestButtonLabel={requestButtonLabel}
            requests={requests}
            requestStatusCopy={REQUEST_STATUS_COPY}
            copy={{
              startChat: COPY.startChat,
              requestList: COPY.requestList,
              noRequests: COPY.noRequests,
              approveButton: COPY.approveButton,
              ownerCompleteCountPrefix: COPY.ownerCompleteCountPrefix,
              nextStep: COPY.nextStep,
              nextStepDescription: COPY.nextStepDescription,
              completeButton: COPY.completeButton,
              givenNotice: COPY.givenNotice,
              reviewButton: COPY.reviewButton,
            }}
            onStartChat={handleStartChat}
            onRequest={handleRequest}
            onApprove={handleApprove}
            onComplete={handleComplete}
            onReview={openReview}
          />
        </div>
        <PostCommentsSection
          comments={comments}
          userId={user?.id}
          isOwner={isOwner}
          newComment={newComment}
          submittingComment={submittingComment}
          copy={{
            commentsTitle: COPY.commentsTitle,
            commentsEmpty: COPY.commentsEmpty,
            anonymousUser: COPY.anonymousUser,
            commentDelete: COPY.commentDelete,
            commentPlaceholder: COPY.commentPlaceholder,
            loginForComment: COPY.loginForComment,
            goToLogin: COPY.goToLogin,
          }}
          onCommentChange={setNewComment}
          onSubmit={handleAddComment}
          onDeleteComment={setDeleteTargetCommentId}
        />

        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm animate-in zoom-in-95 rounded-[2.5rem] bg-white p-8 shadow-2xl duration-200">
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

