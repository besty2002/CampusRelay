import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Post, PostRequest } from '../types';
import { ArrowLeft, MessageCircle, CheckCircle2, Loader2, User } from 'lucide-react';

export const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [requests, setRequests] = useState<PostRequest[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [postId]);

  const fetchDetail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    const { data: postData } = await supabase
      .from('posts')
      .select('*, profiles(display_name, completed_count)')
      .eq('id', postId)
      .single();
    
    if (postData) {
      setPost(postData as any);
      setIsOwner(user?.id === postData.user_id);
      
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

  const handleRequest = async () => {
    if (!currentUser) return alert('로그인이 필요합니다.');
    setRequesting(true);
    const { error } = await supabase.from('post_requests').insert({
      post_id: postId,
      requester_id: currentUser.id,
      message: '나눔 신청합니다!'
    });
    if (error) alert(error.message);
    else alert('신청이 완료되었습니다!');
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-lime-500" />
    </div>
  );

  if (!post) return <div className="p-8 text-center font-bold">Post not found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pt-12 pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 font-bold mb-8 hover:text-lime-600 transition-colors">
        <ArrowLeft size={20} /> 뒤로가기
      </button>

      <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-8 md:p-12">
          <div className="flex justify-between items-start mb-6">
            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
              post.status === 'Available' ? 'bg-lime-100 text-lime-600' :
              post.status === 'Reserved' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
            }`}>
              {post.status}
            </span>
            <span className="text-xs font-black text-slate-300 uppercase tracking-tighter">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-4xl font-black text-slate-800 mb-4 leading-tight">{post.title}</h1>
          
          <div className="flex gap-2 mb-8">
            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-bold">{post.category}</span>
            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-bold">{post.condition}</span>
            {post.mode === 'EXCHANGE' && <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-lg text-xs font-bold">Exchange</span>}
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
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Trust Score</span>
                <span className="bg-lime-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black">
                  {post.profiles.completed_count} Given
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
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">나눔완료 {req.profiles.completed_count}회</p>
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
            <div className="w-full bg-white py-5 rounded-[2rem] font-black text-xl text-slate-400 text-center border-2 border-dashed border-slate-200">
              이미 나눔이 완료된 아이템입니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
