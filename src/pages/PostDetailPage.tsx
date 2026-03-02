import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Post, PostRequest } from '../types';
import { ArrowLeft, MessageCircle, CheckCircle2, Loader2, User, Star, Edit, Trash2, AlertCircle, Heart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [post, setPost] = useState<Post | null>(null);
  const [requests, setRequests] = useState<PostRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const isOwner = user?.id === post?.user_id;

  useEffect(() => {
    fetchDetail();
    if (user) {
      checkWishlist();
    }
  }, [postId, user]);

  const fetchDetail = async () => {
    if (!postId) return;
    
    const { data: postData } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (display_name, completed_count, avg_rating, rating_count),
        post_images (id, storage_path, sort_order)
      `)
      .eq('id', postId)
      .single();
    
    if (postData) {
      setPost(postData as any);
      
      if (user?.id === postData.user_id) {
        const { data: reqs } = await supabase
          .from('post_requests')
          .select('*, profiles(display_name, completed_count)')
          .eq('post_id', postId);
        if (reqs) setRequests(reqs as any);
      }
    }
    setLoading(false);
  };

  const checkWishlist = async () => {
    const { data } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user?.id)
      .eq('post_id', postId)
      .single();
    setIsWishlisted(!!data);
  };

  const toggleWishlist = async () => {
    if (!user) return alert('로그인이 필요합니다.');

    if (isWishlisted) {
      const { error } = await supabase.from('wishlists').delete().eq('user_id', user.id).eq('post_id', postId);
      if (!error) setIsWishlisted(false);
    } else {
      const { error } = await supabase.from('wishlists').insert({ user_id: user.id, post_id: postId });
      if (!error) setIsWishlisted(true);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      alert('삭제되었습니다.');
      navigate('/');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRequest = async () => {
    if (!user) return alert('로그인이 필요합니다.');
    setRequesting(true);
    const { error } = await supabase.from('post_requests').insert({
      post_id: postId,
      requester_id: user.id,
      message: '나눔 신청합니다!'
    });
    if (error) {
      if (error.code === '23505') alert('이미 신청했습니다.');
      else alert(error.message);
    } else {
      alert('신청이 완료되었습니다!');
    }
    setRequesting(false);
  };

  const handleApprove = async (reqId: string) => {
    await supabase.from('post_requests').update({ status: 'Approved' }).eq('id', reqId);
    await supabase.from('posts').update({ status: 'Reserved' }).eq('id', postId);
    fetchDetail();
  };

  const handleComplete = async () => {
    await supabase.from('posts').update({ status: 'Given' }).eq('id', postId);
    fetchDetail();
  };

  const handleReport = async () => {
    if (!user) return alert('로그인이 필요합니다.');
    if (!reportReason.trim()) return alert('신고 사유를 입력해 주세요.');

    const { error } = await supabase.from('reports').insert({
      post_id: postId,
      reporter_id: user.id,
      reason: reportReason,
      status: 'Pending'
    });

    if (error) alert(error.message);
    else {
      alert('신고가 접수되었습니다.');
      setShowReportModal(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !post) return;
    try {
      const { data: reqData } = await supabase.from('post_requests').select('requester_id').eq('post_id', post.id).eq('status', 'Approved').single();
      if (!reqData) return alert('승인된 사용자를 찾을 수 없습니다.');
      
      const toUserId = isOwner ? reqData.requester_id : post.user_id;

      const { error } = await supabase.from('reviews').insert({
        post_id: post.id,
        from_user_id: user.id,
        to_user_id: toUserId,
        rating: reviewRating,
        comment: reviewComment
      });

      if (error) {
        if (error.code === '23505') alert('이미 리뷰를 작성하셨습니다.');
        else alert(error.message);
      } else {
        alert('리뷰가 등록되었습니다!');
      }
    } catch(err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-lime-500" />
    </div>
  );

  if (!post) return <div className="p-8 text-center font-bold">게시글을 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pt-12 pb-24 relative">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-400 font-bold hover:text-lime-600 transition-colors">
          <ArrowLeft size={20} /> 뒤로가기
        </button>
        
        <div className="flex gap-2">
          <button 
            onClick={toggleWishlist}
            className={`p-2 rounded-xl shadow-sm border transition-all ${
              isWishlisted ? 'bg-pink-50 border-pink-100 text-pink-500' : 'bg-white border-slate-100 text-slate-400 hover:text-pink-400'
            }`}
          >
            <Heart size={20} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>

          {isOwner ? (
            <>
              <button 
                onClick={() => navigate(`/post/edit/${post.id}`)}
                className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-lime-600 transition-all"
              >
                <Edit size={20} />
              </button>
              <button 
                onClick={handleDelete}
                className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 transition-all"
              >
                <Trash2 size={20} />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 transition-all text-xs font-bold"
            >
              <AlertCircle size={14} /> 신고
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        
        {post.post_images && post.post_images.length > 0 && (
          <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar bg-slate-100 h-64 md:h-96">
            {post.post_images.sort((a,b) => a.sort_order - b.sort_order).map((img, i) => (
              <div key={img.id} className="min-w-full snap-center relative">
                <img src={img.storage_path} alt="Post image" className="w-full h-full object-cover" />
                <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-[10px] font-black backdrop-blur-md">
                  {i + 1} / {post.post_images!.length}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-8 md:p-12">
          <div className="flex justify-between items-start mb-6">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
              post.status === 'Available' ? 'bg-lime-100 text-lime-600' :
              post.status === 'Reserved' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
            }`}>
              {post.status}
            </span>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-4xl font-black text-slate-800 mb-4 leading-tight">{post.title}</h1>
          
          <div className="flex gap-2 mb-8">
            <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{post.category}</span>
            <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{post.condition}</span>
            {post.mode === 'EXCHANGE' && <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Exchange</span>}
          </div>

          <p className="text-slate-600 text-lg leading-relaxed mb-12 whitespace-pre-wrap font-medium">
            {post.description}
          </p>

          {post.mode === 'EXCHANGE' && (
            <div className="bg-purple-50 p-6 rounded-[2rem] mb-12 border-2 border-purple-100">
              <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2">교환 희망 아이템</h3>
              <p className="text-purple-900 font-black text-xl">{post.exchange_wanted}</p>
            </div>
          )}

          <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-[2rem]">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm text-lime-500">
              <User size={28} />
            </div>
            <div>
              <p className="font-black text-slate-800 text-lg">{post.profiles.display_name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="bg-lime-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                  {post.profiles.completed_count} Given
                </span>
                <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase">
                  <Star size={12} className="fill-amber-400 text-amber-400" /> {post.profiles.avg_rating} ({post.profiles.rating_count})
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100">
          {!isOwner && post.status === 'Available' && (
            <button 
              onClick={handleRequest}
              disabled={requesting}
              className="w-full bg-lime-500 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-lime-500/30 hover:bg-lime-600 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <MessageCircle size={24} />
              {requesting ? '신청 중...' : '나눔 신청하기'}
            </button>
          )}

          {isOwner && post.status === 'Available' && (
            <div className="space-y-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="text-lime-500" size={20} />
                나눔 신청 목록
              </h3>
              {requests.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold">아직 신청자가 없습니다.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {requests.map(req => (
                    <div key={req.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center text-sky-500 font-black">
                          {req.profiles.display_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-700">{req.profiles.display_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter text-sky-600">나눔완료 {req.profiles.completed_count}회</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleApprove(req.id)}
                        className="bg-slate-800 text-white px-6 py-2.5 rounded-2xl font-black text-sm hover:bg-slate-900 transition-all shadow-lg shadow-slate-800/20"
                      >
                        승인
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isOwner && post.status === 'Reserved' && (
            <button 
              onClick={handleComplete}
              className="w-full bg-slate-800 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-slate-800/30 hover:bg-black active:scale-[0.98] transition-all"
            >
              나눔 완료 처리하기
            </button>
          )}

          {post.status === 'Given' && (
            <div className="space-y-6">
              <div className="w-full bg-white py-5 rounded-[2rem] font-black text-xl text-slate-400 text-center border-2 border-dashed border-slate-200">
                이미 나눔이 완료된 아이템입니다.
              </div>
              
              {user && <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                <h3 className="font-black text-slate-800 mb-6 text-xl tracking-tight relative">상대방에게 리뷰 남기기</h3>
                <div className="flex gap-2 mb-6">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => setReviewRating(star)} className="transition-transform active:scale-90">
                      <Star size={32} className={star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                    </button>
                  ))}
                </div>
                <textarea 
                  className="w-full p-5 bg-slate-50 rounded-2xl mb-6 border-none focus:ring-4 focus:ring-lime-500/10 focus:bg-white outline-none font-medium transition-all" 
                  placeholder="거래는 어떠셨나요? (최대 300자)"
                  rows={3}
                  maxLength={300}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
                <button onClick={handleSubmitReview} className="w-full bg-lime-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-lime-500/20 hover:bg-lime-600 active:scale-95 transition-all">
                  리뷰 등록
                </button>
              </div>}
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2">게시글 신고</h2>
            <p className="text-slate-500 text-sm font-medium mb-6">부적절한 내용이나 허위 정보가 포함되어 있나요? 사유를 알려주세요.</p>
            
            <textarea 
              className="w-full p-4 bg-slate-50 rounded-2xl mb-6 border-none focus:ring-2 focus:ring-red-500 outline-none font-medium h-32" 
              placeholder="신고 사유를 입력해 주세요..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            
            <div className="flex gap-2">
              <button 
                onClick={() => setShowReportModal(false)}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                취소
              </button>
              <button 
                onClick={handleReport}
                className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                신고 접수
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
