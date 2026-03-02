import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Post } from '../types';
import { ChevronLeft, Calendar, ShieldCheck, MessageCircle, Loader2, Edit, Trash2 } from 'lucide-react';

export const PostDetailPage = ({ session }: { session: any }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);

  const isOwner = session?.user && post && session.user.id === (post as any).giver_id;

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const { data } = await supabase
          .from('posts')
          .select('*')
          .eq('id', id)
          .single();

        if (data) {
          setPost({
            ...data,
            pickupMethod: data.pickup_method,
            giverId: data.giver_id,
            giverName: data.giver_name,
            schoolId: data.school_id,
            createdAt: data.created_at,
            exchangeFor: data.exchange_for
          });
        }
      } catch (err) {
        console.error('Error fetching post:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('この投稿を削除してもよろしいですか？')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      navigate('/');
    } catch (err) {
      alert('削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-slate-400 font-bold">情報を読み込み中...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <ChevronLeft className="text-slate-300" size={32} />
        </div>
        <h3 className="text-2xl font-black text-slate-800 mb-2">アイテムが見つかりません</h3>
        <button onClick={() => navigate('/')} className="text-primary font-bold hover:underline">ホームに戻る</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-slate-400 hover:text-primary transition-all font-bold group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 一覧に戻る
        </button>

        {isOwner && (
          <div className="flex gap-2">
            <button 
              onClick={() => navigate(`/post/edit/${post.id}`)}
              className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm"
            >
              <Edit size={16} /> 編集
            </button>
            <button 
              onClick={handleDelete}
              className="flex items-center gap-2 bg-red-50 text-red-500 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-all text-sm"
            >
              <Trash2 size={16} /> 削除
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* Images */}
        <div className="space-y-4 sticky top-24">
          <div className="aspect-square rounded-[3rem] overflow-hidden card-shadow bg-white border border-slate-50">
            <img src={post.photos[0]} alt={post.title} className="w-full h-full object-cover" />
          </div>
          {post.photos.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
               {post.photos.slice(1).map((photo, i) => (
                 <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-slate-100 card-shadow cursor-pointer hover:scale-105 transition-transform">
                    <img src={photo} alt={`${post.title}-${i}`} className="w-full h-full object-cover" />
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col">
          <div className="mb-8">
            <span className="inline-block px-4 py-1.5 bg-primary-light/30 text-primary-dark font-black text-xs uppercase tracking-widest rounded-full mb-4">
              {post.category}
            </span>
            <h1 className="text-4xl font-black text-slate-900 leading-tight mb-4">{post.title}</h1>
            <div className="flex items-center gap-6 text-sm text-slate-500 font-bold">
              <span className="flex items-center gap-2"><Calendar size={18} className="text-slate-300"/> {new Date(post.createdAt).toLocaleDateString('ja-JP')}</span>
              <span className="flex items-center gap-2"><ShieldCheck size={18} className="text-secondary"/> 学내 인증 완료</span>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] card-shadow border border-slate-50 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl" />
            
            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
               <span className="w-1.5 h-6 bg-primary rounded-full" />
               アイテムの説明
            </h2>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium text-lg mb-8">{post.description}</p>
            
            <div className="space-y-4 pt-6 border-t border-slate-100">
               <div className="flex justify-between items-center">
                 <span className="text-sm font-black text-slate-400 uppercase tracking-widest">商品の状態</span>
                 <span className="font-black text-slate-700 bg-slate-50 px-4 py-1 rounded-full text-sm">{post.condition}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm font-black text-slate-400 uppercase tracking-widest">受け渡し方法</span>
                 <span className="font-black text-slate-700 bg-slate-50 px-4 py-1 rounded-full text-sm">{post.pickupMethod}</span>
               </div>
               {post.mode === 'EXCHANGE' && (
                 <div className="mt-6 p-6 bg-secondary-light/20 rounded-3xl border border-secondary-light/30 border-dashed">
                    <span className="text-xs text-secondary-dark font-black uppercase tracking-widest mb-2 block">交換希望アイテム</span>
                    <p className="font-black text-slate-800 text-lg">{post.exchangeFor}</p>
                 </div>
               )}
            </div>
          </div>

          {/* Giver Info */}
          <div className="flex items-center gap-5 mb-10 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group cursor-pointer hover:bg-white hover:card-shadow transition-all">
             <div className="w-16 h-16 rounded-full bg-secondary-light flex items-center justify-center text-secondary-dark font-black text-2xl border-4 border-white shadow-sm overflow-hidden group-hover:scale-110 transition-transform">
               {post.giverName.charAt(0)}
             </div>
             <div>
               <div className="font-black text-slate-900 text-lg">{post.giverName}</div>
               <div className="text-xs text-slate-500 font-bold flex items-center gap-2">
                 <span>譲渡実績 12回</span>
                 <span className="w-1 h-1 bg-slate-300 rounded-full" />
                 <span className="text-secondary">4.9 ★</span>
               </div>
             </div>
             <div className="ml-auto">
                <ChevronLeft size={20} className="text-slate-300 rotate-180" />
             </div>
          </div>

          {/* Action */}
          {!requestSent ? (
            <button 
              onClick={() => setRequestSent(true)}
              className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-primary/20 hover:bg-primary-dark hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            >
              <MessageCircle size={24} className="group-hover:rotate-12 transition-transform" />
              これ欲しい！
            </button>
          ) : (
            <div className="w-full bg-green-50 text-green-600 py-5 rounded-[2rem] font-black text-xl text-center border-2 border-green-100 animate-in zoom-in-95 duration-300">
              リクエストを送信しました！
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
