import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Post } from '../types';
import { mockApi } from '../services/mockApi';
import { ChevronLeft, Calendar, ShieldCheck, MessageCircle } from 'lucide-react';

export const PostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (id) {
        const data = await mockApi.getPostById(id);
        if (data) setPost(data);
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-400">読み込み中...</div>;
  if (!post) return <div className="p-8 text-center">アイテムが見つかりません</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-slate-500 hover:text-primary mb-6 transition-colors"
      >
        <ChevronLeft size={20} /> 一覧に戻る
      </button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl overflow-hidden card-shadow bg-white border border-slate-50">
            <img src={post.photos[0]} alt={post.title} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col">
          <div className="mb-6">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">{post.category}</span>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-1">{post.title}</h1>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(post.createdAt).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-secondary"/> 学内認証済み</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl card-shadow border border-slate-50 mb-8">
            <h2 className="font-bold text-slate-800 mb-2">アイテムの説明</h2>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{post.description}</p>
            
            <div className="mt-6 space-y-3">
               <div className="flex justify-between text-sm">
                 <span className="text-slate-400">商品の状態</span>
                 <span className="font-bold text-slate-700">{post.condition}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-slate-400">受け渡し方法</span>
                 <span className="font-bold text-slate-700">{post.pickupMethod}</span>
               </div>
               {post.mode === 'EXCHANGE' && (
                 <div className="pt-3 mt-3 border-t border-dashed border-slate-100">
                    <span className="text-xs text-secondary font-bold uppercase tracking-wider">交換希望アイテム</span>
                    <p className="font-bold text-slate-800">{post.exchangeFor}</p>
                 </div>
               )}
            </div>
          </div>

          {/* Giver Info */}
          <div className="flex items-center gap-4 mb-8 p-4 bg-secondary-light/20 rounded-2xl border border-secondary-light/30">
             <div className="w-12 h-12 rounded-full bg-secondary-dark flex items-center justify-center text-white font-bold text-xl">
               {post.giverName.charAt(0)}
             </div>
             <div>
               <div className="font-bold text-slate-800">{post.giverName}</div>
               <div className="text-xs text-slate-500">譲渡実績 {post.giverName === '佐藤 健太' ? 12 : 5}回 • 4.9★</div>
             </div>
          </div>

          {/* Action */}
          {!requestSent ? (
            <button 
              onClick={() => setRequestSent(true)}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg card-shadow hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle size={22} />
              これ欲しい！
            </button>
          ) : (
            <div className="w-full bg-green-50 text-green-600 py-4 rounded-2xl font-bold text-center border border-green-200">
              リクエストを送信しました！相手の返信をお待ちください。
            </div>
          )}
          <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed">
            お金のやり取りは一切ありません。0円シェアリングで学内リサイクルを促進しましょう。
          </p>
        </div>
      </div>
    </div>
  );
};
