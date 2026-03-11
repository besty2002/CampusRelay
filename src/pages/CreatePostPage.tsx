import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { PostMode, PostCategory, PostCondition } from '../types';
import { ArrowLeft, Loader2, Camera, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const CreatePostPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { postId } = useParams();
  const [searchParams] = useSearchParams();
  const schoolIdFromQuery = searchParams.get('schoolId');
  
  const isEditMode = !!postId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);

  // Form states
  const [mode, setMode] = useState<PostMode>('GIVEAWAY');
  const [category, setCategory] = useState<PostCategory>('Textbook');
  const [condition, setCondition] = useState<PostCondition>('Good');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [exchangeWanted, setExchangeWanted] = useState('');
  const [itemSize, setItemSize] = useState('');
  const [targetSchoolId, setTargetSchoolId] = useState<string | null>(schoolIdFromQuery);

  // Image states
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImages, setExistingPhotos] = useState<{id: string, storage_path: string}[]>([]);

  useEffect(() => {
    if (isEditMode) {
      fetchPostData();
    }
  }, [postId]);

  const fetchPostData = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          post_images (id, storage_path, sort_order)
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;
      if (data) {
        if (data.user_id !== user?.id && user) {
          alert('権限がありません。');
          navigate('/');
          return;
        }

        setTitle(data.title);
        setDescription(data.description);
        setCategory(data.category);
        setCondition(data.condition);
        setMode(data.mode);
        setExchangeWanted(data.exchange_wanted || '');
        setItemSize(data.item_size || '');
        setTargetSchoolId(data.school_id);
        
        const sortedImages = (data.post_images || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
        setExistingPhotos(sortedImages);
        setPreviews(sortedImages.map((img: any) => img.storage_path));
      }
    } catch (err: any) {
      alert(err.message);
      navigate(-1);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + previews.length > 5) {
      alert('画像は最大5枚までです。');
      return;
    }
    setImages(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = async (index: number) => {
    const previewToRemove = previews[index];
    const existingImg = existingImages.find(img => img.storage_path === previewToRemove);
    if (existingImg) {
      setExistingPhotos(prev => prev.filter(img => img.id !== existingImg.id));
    } else {
      const blobIndex = previews.filter((p, i) => i < index && !existingImages.some(ei => ei.storage_path === p)).length;
      setImages(prev => prev.filter((_, i) => i !== blobIndex));
      URL.revokeObjectURL(previewToRemove);
    }
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSchoolId) return alert('学校情報がありません。');
    if (!user) return alert('ログインが必要です。');
    if (previews.length === 0) return alert('最低1枚の画像が必要です。');

    setLoading(true);
    try {
      let currentPostId = postId;
      const postPayload = {
        school_id: targetSchoolId,
        user_id: user.id,
        mode,
        category,
        condition,
        item_size: (category === 'Uniform') ? itemSize : null,
        title,
        description,
        exchange_wanted: mode === 'EXCHANGE' ? exchangeWanted : null,
        status: 'Available'
      };

      if (isEditMode) {
        const { error: updateError } = await supabase
          .from('posts')
          .update(postPayload)
          .eq('id', postId);
        if (updateError) throw updateError;
      } else {
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .insert(postPayload)
          .select()
          .single();
        if (postError) throw postError;
        currentPostId = postData.id;
      }

      if (isEditMode) {
        await supabase.from('post_images').delete().eq('post_id', currentPostId);
      }

      for (let i = 0; i < existingImages.length; i++) {
        await supabase.from('post_images').insert({
          post_id: currentPostId,
          storage_path: existingImages[i].storage_path,
          sort_order: i
        });
      }

      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const ext = file.name.split('.').pop();
        const fileName = `${currentPostId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('post-images').getPublicUrl(fileName);
        await supabase.from('post_images').insert({
          post_id: currentPostId,
          storage_path: publicUrlData.publicUrl,
          sort_order: existingImages.length + i
        });
      }

      navigate(`/post/${currentPostId}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-lime-500" />
    </div>
  );

  return (
    <div className="max-w-xl mx-auto p-6 pt-12 pb-32">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 font-bold mb-6 hover:text-lime-600 transition-colors">
        <ArrowLeft size={20} /> キャンセルして戻る
      </button>

      <h1 className="text-3xl font-black text-slate-800 mb-8">
        {isEditMode ? '投稿を編集する' : 'アイテムを出品する'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Images (Max 5)</label>
            <div className="flex flex-wrap gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(index)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><X size={12} /></button>
                </div>
              ))}
              {previews.length < 5 && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:text-lime-500 hover:border-lime-500 transition-colors"><Camera size={24} /></button>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg, image/png, image/webp" multiple onChange={handleImageChange} />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Title</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold" placeholder="例：弘道小学校の体操服（上）" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Category</label>
              <select 
                value={category} onChange={e => setCategory(e.target.value as any)}
                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold appearance-none"
              >
                <option value="Uniform">制服・衣類</option>
                <option value="Textbook">教科書・書籍</option>
                <option value="Digital">IT・デジタル</option>
                <option value="ArtSport">芸術・体育</option>
                <option value="Life">生活用品</option>
                <option value="Other">その他</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Condition</label>
              <select value={condition} onChange={e => setCondition(e.target.value as any)} className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold appearance-none">
                <option value="Like New">未使用に近い</option>
                <option value="Good">目立った傷なし</option>
                <option value="Used">使用感あり</option>
              </select>
            </div>
          </div>

          {category === 'Uniform' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Size (例: 140, M, LL)</label>
              <input value={itemSize} onChange={e => setItemSize(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold" placeholder="サイズを入力..." />
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Description</label>
            <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none transition-all font-medium" placeholder="詳細を入力してください。" />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Sharing Mode</label>
          <div className="flex gap-3 mb-6">
            <button type="button" onClick={() => setMode('GIVEAWAY')} className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${mode === 'GIVEAWAY' ? 'bg-lime-500 text-white shadow-lg shadow-lime-500/30' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Free Giveaway</button>
            <button type="button" onClick={() => setMode('EXCHANGE')} className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${mode === 'EXCHANGE' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Exchange</button>
          </div>
          {mode === 'EXCHANGE' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="block text-xs font-black text-purple-400 uppercase tracking-widest mb-2 ml-1">交換希望アイテム</label>
              <input required value={exchangeWanted} onChange={e => setExchangeWanted(e.target.value)} className="w-full p-4 bg-purple-50 rounded-2xl border-none focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-purple-900" placeholder="例：中学校1年生の数学の教科書" />
            </div>
          )}
        </div>

        <button disabled={loading} className="w-full bg-lime-500 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-lime-500/30 hover:bg-lime-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : isEditMode ? '修正完了' : '出品完了'}
        </button>
      </form>
    </div>
  );
};
