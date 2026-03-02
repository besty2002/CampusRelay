import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { ItemCategory, ItemCondition, SharingMode } from '../types';
import { Camera, ChevronLeft, X, Loader2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

export const CreatePostPage = ({ session }: { session: Session | null }) => {
  const { id } = useParams(); // 수정 모드일 경우 ID가 있음
  const isEditMode = !!id;
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '教科書' as ItemCategory,
    condition: '目立った傷なし' as ItemCondition,
    pickupMethod: '',
    mode: 'GIVEAWAY' as SharingMode,
    exchangeFor: '',
  });

  useEffect(() => {
    if (isEditMode && session) {
      fetchPostData();
    }
  }, [id, session]);

  const fetchPostData = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        // 권한 확인
        if (data.giver_id !== session?.user.id) {
          alert('修正権限がありません。');
          navigate('/');
          return;
        }

        setFormData({
          title: data.title,
          description: data.description,
          category: data.category,
          condition: data.condition,
          pickupMethod: data.pickup_method,
          mode: data.mode,
          exchangeFor: data.exchange_for || '',
        });
        setExistingPhotos(data.photos || []);
        setPreviews(data.photos || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + previews.length > 4) {
      alert('写真は最大4枚までです。');
      return;
    }

    setImages(prev => [...prev, ...files]);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const previewToRemove = previews[index];
    
    if (existingPhotos.includes(previewToRemove)) {
      setExistingPhotos(prev => prev.filter(p => p !== previewToRemove));
    } else {
      const blobIndex = previews.filter((p, i) => i < index && !existingPhotos.includes(p)).length;
      setImages(prev => prev.filter((_, i) => i !== blobIndex));
      URL.revokeObjectURL(previewToRemove);
    }
    
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const file of images) {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}-${randomString}.${fileExt}`;
      const filePath = `${session?.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath);

      if (data?.publicUrl) uploadedUrls.push(data.publicUrl);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (previews.length === 0) {
      alert('写真を少なくとも1枚追加してください。');
      return;
    }

    setLoading(true);

    try {
      const newPhotoUrls = await uploadImages();
      const finalPhotoUrls = [...existingPhotos, ...newPhotoUrls];

      const postData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        pickup_method: formData.pickupMethod,
        mode: formData.mode,
        exchange_for: formData.exchangeFor,
        photos: finalPhotoUrls,
        giver_id: session.user.id,
        giver_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('posts')
          .insert([{ ...postData, school_id: 's1', status: '受付中' }]);
        if (error) throw error;
      }
      
      navigate(isEditMode ? `/post/${id}` : '/');
    } catch (err: any) {
      alert(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-slate-400 font-bold">情報を読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-slate-500 hover:text-primary mb-6 transition-colors"
      >
        <ChevronLeft size={20} /> キャンセル
      </button>

      <div className="bg-white rounded-[2.5rem] card-shadow p-8 border border-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        
        <h1 className="text-3xl font-black text-slate-900 mb-8 relative">
          {isEditMode ? '投稿を編集する' : 'アイテムを譲る'}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-8 relative">
          <div>
            <label className="block text-sm font-black text-slate-700 mb-4 ml-1 uppercase tracking-widest">写真 (最大4枚)</label>
            <div className="flex flex-wrap gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-100 card-shadow">
                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:scale-110 transition-transform"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {previews.length < 4 && (
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary hover:bg-primary-light/10 cursor-pointer transition-all"
                >
                  <Camera size={24} />
                  <span className="text-[10px] font-black mt-1 uppercase tracking-tighter">追加</span>
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} />
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2 ml-1">商品名</label>
              <input 
                required
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all font-bold text-slate-800"
                placeholder="例：マクロ経済学の教科書 2024年版"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 ml-1">カテゴリ</label>
                <div className="relative">
                  <select 
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all font-bold text-slate-800 appearance-none cursor-pointer"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value as ItemCategory})}
                  >
                    <option value="制服">制服</option>
                    <option value="教科書">教科書</option>
                    <option value="学用品">学用品</option>
                    <option value="その他">その他</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronLeft size={20} className="-rotate-90" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 ml-1">商品の状態</label>
                <div className="relative">
                  <select 
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all font-bold text-slate-800 appearance-none cursor-pointer"
                    value={formData.condition}
                    onChange={e => setFormData({...formData, condition: e.target.value as ItemCondition})}
                  >
                    <option value="未使用に近い">未使用に近い</option>
                    <option value="目立った傷なし">目立った傷なし</option>
                    <option value="使用感あり">使用感あり</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronLeft size={20} className="-rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2 ml-1">説明</label>
              <textarea 
                required
                rows={4}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all font-bold text-slate-800"
                placeholder="アイテムの詳細や状態について教えてください。"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="p-6 bg-primary-light/20 rounded-[2rem] border-2 border-primary-light/30">
              <label className="block text-sm font-black text-primary-dark mb-4 ml-1 uppercase tracking-widest">お譲り方法</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="radio" 
                      name="mode" 
                      className="w-5 h-5 border-2 border-primary-light checked:bg-primary appearance-none rounded-full transition-all"
                      checked={formData.mode === 'GIVEAWAY'}
                      onChange={() => setFormData({...formData, mode: 'GIVEAWAY'})}
                    />
                    {formData.mode === 'GIVEAWAY' && <div className="absolute w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm font-black text-slate-700 group-hover:text-primary transition-colors">無料で譲る</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="radio" 
                      name="mode" 
                      className="w-5 h-5 border-2 border-primary-light checked:bg-primary appearance-none rounded-full transition-all"
                      checked={formData.mode === 'EXCHANGE'}
                      onChange={() => setFormData({...formData, mode: 'EXCHANGE'})}
                    />
                    {formData.mode === 'EXCHANGE' && <div className="absolute w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm font-black text-slate-700 group-hover:text-primary transition-colors">交換希望</span>
                </label>
              </div>
              
              {formData.mode === 'EXCHANGE' && (
                <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                  <input 
                    className="w-full px-6 py-3 rounded-xl bg-white border-2 border-primary-light focus:border-primary focus:outline-none transition-all font-bold text-slate-800 text-sm"
                    placeholder="代わりに欲しいアイテムを入力してください"
                    value={formData.exchangeFor}
                    onChange={e => setFormData({...formData, exchangeFor: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2 ml-1">受け渡し方法</label>
              <input 
                required
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all font-bold text-slate-800"
                placeholder="例：1号館ロビー、手渡し希望"
                value={formData.pickupMethod}
                onChange={e => setFormData({...formData, pickupMethod: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-primary/20 hover:bg-primary-dark hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>更新中...</span>
              </>
            ) : (
              <span>{isEditMode ? '変更를 저장한다' : '出品する'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
