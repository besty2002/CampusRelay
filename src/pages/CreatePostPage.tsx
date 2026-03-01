import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ItemCategory, ItemCondition, SharingMode } from '../types';
import { mockApi } from '../services/mockApi';
import { Camera, ChevronLeft } from 'lucide-react';

export const CreatePostPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '教科書' as ItemCategory,
    condition: '目立った傷なし' as ItemCondition,
    pickupMethod: '',
    mode: 'GIVEAWAY' as SharingMode,
    exchangeFor: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await mockApi.createPost({
      ...formData,
      photos: ['https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=400'],
      giverName: '佐藤 健太',
      schoolId: 's1',
      status: '受付中',
      scope: 'SCHOOL',
      createdAt: new Date().toISOString(),
    });
    setLoading(false);
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-slate-500 hover:text-primary mb-6 transition-colors"
      >
        <ChevronLeft size={20} /> キャンセル
      </button>

      <div className="bg-white rounded-3xl card-shadow p-8 border border-slate-50">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">アイテムを譲る</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">写真</label>
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary cursor-pointer transition-all">
                <Camera size={24} />
                <span className="text-[10px] font-bold mt-1">追加</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">商品名</label>
            <input 
              required
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="例：マクロ経済学の教科書 2024年版"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">カテゴリ</label>
              <select 
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary transition-all appearance-none"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as ItemCategory})}
              >
                <option value="制服">制服</option>
                <option value="教科書">教科書</option>
                <option value="学用品">学用品</option>
                <option value="その他">その他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">商品の状態</label>
              <select 
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary transition-all appearance-none"
                value={formData.condition}
                onChange={e => setFormData({...formData, condition: e.target.value as ItemCondition})}
              >
                <option value="未使用に近い">未使用に近い</option>
                <option value="目立った傷なし">目立った傷なし</option>
                <option value="使用感あり">使用感あり</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">説明</label>
            <textarea 
              required
              rows={4}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="アイテムの詳細や状態について教えてください。"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="p-4 bg-primary-light/30 rounded-2xl border border-primary-light/50">
            <label className="block text-sm font-bold text-primary-dark mb-3">お譲り方法</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="mode" 
                  className="text-primary focus:ring-primary"
                  checked={formData.mode === 'GIVEAWAY'}
                  onChange={() => setFormData({...formData, mode: 'GIVEAWAY'})}
                />
                <span className="text-sm font-bold">無料で譲る</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="mode" 
                  className="text-primary focus:ring-primary"
                  checked={formData.mode === 'EXCHANGE'}
                  onChange={() => setFormData({...formData, mode: 'EXCHANGE'})}
                />
                <span className="text-sm font-bold">交換希望</span>
              </label>
            </div>
            
            {formData.mode === 'EXCHANGE' && (
              <div className="mt-4">
                <input 
                  className="w-full px-4 py-2 rounded-xl bg-white border-none focus:ring-2 focus:ring-primary transition-all text-sm"
                  placeholder="代わりに欲しいアイテムを入力してください"
                  value={formData.exchangeFor}
                  onChange={e => setFormData({...formData, exchangeFor: e.target.value})}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">受け渡し方法</label>
            <input 
              required
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="例：1号館ロビー、手渡し希望"
              value={formData.pickupMethod}
              onChange={e => setFormData({...formData, pickupMethod: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg card-shadow hover:bg-primary-dark transition-all disabled:opacity-50"
          >
            {loading ? '投稿中...' : '出品する'}
          </button>
        </form>
      </div>
    </div>
  );
};
