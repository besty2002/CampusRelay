import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { PostMode, PostCategory, PostCondition, School } from '../types';
import { ArrowLeft, Loader2, Camera, X, MapPin, School as SchoolIcon, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import imageCompression from 'browser-image-compression';

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

  // School selection states
  const [mySchools, setMySchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [selectedSchoolName, setSelectedSchoolName] = useState<string | null>(null);

  // Image states
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImages, setExistingPhotos] = useState<{id: string, storage_path: string}[]>([]);

  // ─── Fetch user's registered schools ──────────────────────
  useEffect(() => {
    if (user && !isEditMode) {
      fetchMySchools();
    }
  }, [user, isEditMode]);

  const fetchMySchools = async () => {
    if (!user) return;
    setSchoolsLoading(true);

    const { data } = await supabase
      .from('user_schools')
      .select('school_id, schools(id, name_ja, type)')
      .eq('user_id', user.id);

    if (data) {
      const schools = data.map((d: any) => d.schools as School);
      setMySchools(schools);

      // schoolId가 쿼리에서 넘어온 경우: 해당 학교 이름 설정
      if (schoolIdFromQuery) {
        const matched = schools.find(s => s.id === schoolIdFromQuery);
        if (matched) setSelectedSchoolName(matched.name_ja);
      }
      // schoolId가 없고, 등록 학교가 1개면 자동 선택
      else if (schools.length === 1) {
        setTargetSchoolId(schools[0].id);
        setSelectedSchoolName(schools[0].name_ja);
      }
    }
    setSchoolsLoading(false);
  };

  const handleSelectSchool = (school: School) => {
    setTargetSchoolId(school.id);
    setSelectedSchoolName(school.name_ja);
  };

  // ─── Edit mode: fetch existing post ───────────────────────
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
          post_images (id, storage_path, sort_order),
          schools (id, name_ja, type)
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
        if (data.schools) {
          setSelectedSchoolName((data.schools as any).name_ja);
        }
        
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + previews.length > 5) {
      alert('画像は最大5枚までです。');
      return;
    }
    
    setLoading(true);
    try {
      const options = {
        maxSizeMB: 1, // 최대 1MB로 압축
        maxWidthOrHeight: 1280, // 가로/세로 최대 1280px
        useWebWorker: true,
      };

      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          if (!file.type.startsWith('image/')) return file;
          try {
            return await imageCompression(file, options);
          } catch (error) {
            console.error('Image compression failed:', error);
            return file; // 압축 실패 시 원본 사용
          }
        })
      );

      setImages(prev => [...prev, ...compressedFiles]);
      const newPreviews = compressedFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    } finally {
      setLoading(false);
    }
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
    if (!targetSchoolId) return alert('出品先の学校を選択してください。');
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

  // ─── School type label helper ─────────────────────────────
  const schoolTypeLabel = (type: string) => {
    switch (type) {
      case 'elementary': return '小学校';
      case 'middle': return '中学校';
      case 'high': return '高校';
      default: return type;
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 pt-12 pb-32">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 font-bold mb-6 hover:text-lime-600 transition-colors">
        <ArrowLeft size={20} /> キャンセルして戻る
      </button>

      <h1 className="text-3xl font-black text-slate-800 mb-8">
        {isEditMode ? '投稿を編集する' : 'アイテムを出品する'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ═══ School Selection Card ═══ */}
        {!isEditMode && (
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
              <MapPin size={14} />
              出品先の学校
            </label>

            {schoolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-lime-500" size={24} />
              </div>
            ) : mySchools.length === 0 ? (
              /* ─── No schools registered ─── */
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                    <AlertTriangle size={20} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-800 text-sm mb-1">学校が登録されていません</p>
                    <p className="text-amber-600 text-xs mb-3">出品するには、まず学校を追加してください。</p>
                    <Link 
                      to="/schools" 
                      className="inline-flex items-center gap-1.5 bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 active:scale-95"
                    >
                      <SchoolIcon size={14} />
                      My Schools で学校を追加 →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* ─── School chips ─── */
              <div className="flex flex-wrap gap-2.5">
                {mySchools.map((school) => {
                  const isSelected = targetSchoolId === school.id;
                  return (
                    <button
                      key={school.id}
                      type="button"
                      onClick={() => handleSelectSchool(school)}
                      className={`
                        group relative flex items-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-sm
                        transition-all duration-200 active:scale-95
                        ${isSelected
                          ? 'bg-lime-500 text-white shadow-lg shadow-lime-500/30 ring-2 ring-lime-500 ring-offset-2'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:shadow-md border border-slate-100'
                        }
                      `}
                    >
                      <div className={`
                        w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors
                        ${isSelected ? 'bg-white/20' : 'bg-white shadow-sm'}
                      `}>
                        {isSelected ? (
                          <CheckCircle2 size={18} className="text-white" />
                        ) : (
                          <SchoolIcon size={16} className="text-slate-400 group-hover:text-lime-500 transition-colors" />
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="truncate leading-tight">{school.name_ja}</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                          {schoolTypeLabel(school.type)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected school indicator */}
            {targetSchoolId && selectedSchoolName && !schoolsLoading && (
              <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-lime-50 rounded-xl border border-lime-100">
                <CheckCircle2 size={14} className="text-lime-600 shrink-0" />
                <p className="text-xs font-bold text-lime-700">
                  <span className="text-lime-500">出品先:</span> {selectedSchoolName}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Edit mode: show current school (read-only) */}
        {isEditMode && selectedSchoolName && (
          <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-lime-50 rounded-xl">
              <SchoolIcon size={16} className="text-lime-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">出品先</p>
              <p className="font-bold text-slate-700 text-sm">{selectedSchoolName}</p>
            </div>
          </div>
        )}

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

        <button 
          disabled={loading || (!targetSchoolId && !isEditMode)} 
          className={`w-full py-5 rounded-[2rem] font-black text-xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
            !targetSchoolId && !isEditMode
              ? 'bg-slate-300 text-slate-500 shadow-slate-200/30 cursor-not-allowed'
              : 'bg-lime-500 text-white shadow-lime-500/30 hover:bg-lime-600'
          }`}
        >
          {loading ? <Loader2 className="animate-spin" /> : isEditMode ? '修正完了' : '出品完了'}
        </button>
      </form>
    </div>
  );
};
