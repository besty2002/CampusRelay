import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  School as SchoolIcon,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PostCategory, PostCondition, PostMode, School } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { useToast } from '../components/feedback/ToastProvider';

type FormErrors = {
  school?: string;
  images?: string;
  title?: string;
  description?: string;
  exchangeWanted?: string;
};

type UserSchoolRow = {
  school_id: string;
  schools: School;
};

type PostImageRow = {
  id: string;
  storage_path: string;
  sort_order: number;
};

type PostDetailRow = {
  id: string;
  user_id: string;
  school_id: string;
  title: string;
  description: string;
  category: PostCategory;
  condition: PostCondition;
  mode: PostMode;
  exchange_wanted: string | null;
  item_size: string | null;
  post_images: PostImageRow[] | null;
  schools: School | School[] | null;
};

const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_IMAGE_COUNT = 5;

type CreatePostDraft = {
  mode: PostMode;
  category: PostCategory;
  condition: PostCondition;
  title: string;
  description: string;
  exchangeWanted: string;
  itemSize: string;
  targetSchoolId: string | null;
  savedAt: string;
};

const getDraftKey = (userId: string) => `campusrelay:create-post:draft:${userId}`;
const getLastSchoolKey = (userId: string) => `campusrelay:create-post:last-school:${userId}`;

const SCHOOL_TYPE_LABELS: Record<string, string> = {
  elementary: '小学校',
  middle: '中学校',
  high: '高校',
};

const CATEGORY_OPTIONS: { value: PostCategory; label: string }[] = [
  { value: 'Uniform', label: '制服・通学用品' },
  { value: 'Textbook', label: '教科書・書籍' },
  { value: 'Digital', label: 'IT・デジタル' },
  { value: 'ArtSport', label: '文化・スポーツ' },
  { value: 'Life', label: '生活用品' },
  { value: 'Other', label: 'その他' },
];

const CONDITION_OPTIONS: { value: PostCondition; label: string }[] = [
  { value: 'Like New', label: '未使用に近い' },
  { value: 'Good', label: 'きれいな状態' },
  { value: 'Used', label: '使用感あり' },
];

const COPY = {
  permissionDenied: 'この投稿を編集する権限がありません。',
  loadFailed: '投稿情報の読み込みに失敗しました。',
  imageLimit: `画像は最大${MAX_IMAGE_COUNT}枚まで追加できます。`,
  schoolRequired: '出品先の学校を選択してください。',
  imageRequired: '少なくとも1枚の画像が必要です。',
  titleRequired: 'タイトルを入力してください。',
  descriptionRequired: '商品の説明を入力してください。',
  exchangeWantedRequired: '交換したいアイテムを入力してください。',
  loginRequired: 'ログインが必要です。',
  formInvalidTitle: '入力内容を確認してください',
  formInvalidDescription: '未入力または条件を満たしていない項目があります。',
  updated: '投稿を更新しました',
  created: '出品を公開しました',
  saveFailed: '保存に失敗しました',
  back: 'キャンセルして戻る',
  editHeading: '出品内容を編集する',
  createHeading: 'アイテムを出品する',
  schoolLabel: '出品先の学校',
  noSchoolsTitle: '学校が登録されていません',
  noSchoolsDescription: '出品するには、先に学校を追加してください。',
  addSchool: 'My Schools で学校を追加',
  selectedSchool: '出品先',
  imagesLabel: `画像（最大${MAX_IMAGE_COUNT}枚）`,
  titleLabel: 'タイトル',
  titlePlaceholder: '例：弘道小学校の体操服（上）',
  categoryLabel: 'カテゴリ',
  conditionLabel: '商品の状態',
  sizeLabel: 'サイズ（例：140、M、LL）',
  sizePlaceholder: 'サイズを入力',
  descriptionLabel: '商品の説明',
  descriptionPlaceholder: '詳細を入力してください。',
  modeLabel: '出品方法',
  giveaway: '無料で譲る',
  exchange: '交換する',
  exchangeWantedLabel: '交換したいアイテム',
  exchangeWantedPlaceholder: '例：中学1年生の数学の教科書',
  processingImages: '画像を準備中...',
  saving: '保存中...',
  saveEdit: '編集内容を保存',
  publish: '出品完了',
  leaveTitle: '入力内容を破棄して戻りますか？',
  leaveDescription: 'まだ保存していない入力内容があります。このまま戻ると内容は失われます。',
  leaveConfirm: '破棄して戻る',
} as const;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

const pickSchool = (school: School | School[] | null): School | null => {
  if (Array.isArray(school)) {
    return school[0] ?? null;
  }
  return school;
};

export const CreatePostPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { postId } = useParams();
  const [searchParams] = useSearchParams();
  const schoolIdFromQuery = searchParams.get('schoolId');
  const { showToast } = useToast();

  const isEditMode = Boolean(postId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const [mode, setMode] = useState<PostMode>('GIVEAWAY');
  const [category, setCategory] = useState<PostCategory>('Textbook');
  const [condition, setCondition] = useState<PostCondition>('Good');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [exchangeWanted, setExchangeWanted] = useState('');
  const [itemSize, setItemSize] = useState('');
  const [targetSchoolId, setTargetSchoolId] = useState<string | null>(schoolIdFromQuery);
  const [mySchools, setMySchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [selectedSchoolName, setSelectedSchoolName] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<PostImageRow[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  const isDirty = useMemo(
    () =>
      Boolean(
        title.trim() ||
          description.trim() ||
          exchangeWanted.trim() ||
          itemSize.trim() ||
          previews.length > 0 ||
          targetSchoolId
      ),
    [title, description, exchangeWanted, itemSize, previews.length, targetSchoolId]
  );

  useEffect(() => {
    if (user && !isEditMode) {
      void fetchMySchools();
    }
  }, [user, isEditMode]);

  useEffect(() => {
    if (isEditMode) {
      void fetchPostData();
    }
  }, [postId, isEditMode, user]);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [previews]);

  useEffect(() => {
    if (!user || isEditMode || !draftReady) return;

    const draftKey = getDraftKey(user.id);
    const hasDraftContent = Boolean(
      title.trim() ||
        description.trim() ||
        exchangeWanted.trim() ||
        itemSize.trim() ||
        targetSchoolId ||
        mode !== 'GIVEAWAY' ||
        category !== 'Textbook' ||
        condition !== 'Good'
    );

    if (!hasDraftContent) {
      localStorage.removeItem(draftKey);
      setDraftSavedAt(null);
      return;
    }

    const payload: CreatePostDraft = {
      mode,
      category,
      condition,
      title,
      description,
      exchangeWanted,
      itemSize,
      targetSchoolId,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(draftKey, JSON.stringify(payload));
    setDraftSavedAt(payload.savedAt);
  }, [user, isEditMode, draftReady, mode, category, condition, title, description, exchangeWanted, itemSize, targetSchoolId]);

  const fetchMySchools = async () => {
    if (!user) return;
    setSchoolsLoading(true);

    const { data } = await supabase
      .from('user_schools')
      .select('school_id, schools(id, name_ja, type)')
      .eq('user_id', user.id);

    if (data) {
      const schools = (((data as unknown) as UserSchoolRow[]) || []).map((entry) => entry.schools);
      setMySchools(schools);

      const rememberedSchoolId = localStorage.getItem(getLastSchoolKey(user.id));
      const rememberedSchool = rememberedSchoolId
        ? schools.find((school) => school.id === rememberedSchoolId)
        : null;
      const requestedSchool = schoolIdFromQuery
        ? schools.find((school) => school.id === schoolIdFromQuery)
        : null;
      const defaultSchool = requestedSchool ?? rememberedSchool ?? (schools.length === 1 ? schools[0] : null);

      if (defaultSchool) {
        setTargetSchoolId(defaultSchool.id);
        setSelectedSchoolName(defaultSchool.name_ja);
      }

      const rawDraft = localStorage.getItem(getDraftKey(user.id));
      if (rawDraft) {
        try {
          const draft = JSON.parse(rawDraft) as CreatePostDraft;
          setMode(draft.mode);
          setCategory(draft.category);
          setCondition(draft.condition);
          setTitle(draft.title);
          setDescription(draft.description);
          setExchangeWanted(draft.exchangeWanted);
          setItemSize(draft.itemSize);
          setDraftSavedAt(draft.savedAt);

          const draftSchool =
            !schoolIdFromQuery && draft.targetSchoolId
              ? schools.find((school) => school.id === draft.targetSchoolId)
              : null;

          if (draftSchool) {
            setTargetSchoolId(draftSchool.id);
            setSelectedSchoolName(draftSchool.name_ja);
          }

          setDraftRestored(true);
        } catch {
          localStorage.removeItem(getDraftKey(user.id));
        }
      }
    }

    setSchoolsLoading(false);
    setDraftReady(true);
  };

  const fetchPostData = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(
          `
          id,
          user_id,
          school_id,
          title,
          description,
          category,
          condition,
          mode,
          exchange_wanted,
          item_size,
          post_images (id, storage_path, sort_order),
          schools (id, name_ja, type)
        `
        )
        .eq('id', postId)
        .single();

      if (error) throw error;
      if (!data) return;

      const postData = (data as unknown) as PostDetailRow;

      if (postData.user_id !== user?.id && user) {
        showToast({ tone: 'error', title: COPY.permissionDenied });
        navigate('/');
        return;
      }

      setTitle(postData.title);
      setDescription(postData.description);
      setCategory(postData.category);
      setCondition(postData.condition);
      setMode(postData.mode);
      setExchangeWanted(postData.exchange_wanted || '');
      setItemSize(postData.item_size || '');
      setTargetSchoolId(postData.school_id);

      const school = pickSchool(postData.schools);
      if (school) {
        setSelectedSchoolName(school.name_ja);
      }

      const sortedImages = ((postData.post_images || []) as PostImageRow[]).sort(
        (left, right) => left.sort_order - right.sort_order
      );
      setExistingImages(sortedImages);
      setPreviews(sortedImages.map((image) => image.storage_path));
    } catch (error) {
      showToast({
        tone: 'error',
        title: COPY.loadFailed,
        description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
      });
      navigate(-1);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSelectSchool = (school: School) => {
    setTargetSchoolId(school.id);
    setSelectedSchoolName(school.name_ja);
    setErrors((prev) => ({ ...prev, school: undefined }));
    if (user && !isEditMode) {
      localStorage.setItem(getLastSchoolKey(user.id), school.id);
    }
  };

  const clearDraft = () => {
    if (!user) return;

    localStorage.removeItem(getDraftKey(user.id));
    setMode('GIVEAWAY');
    setCategory('Textbook');
    setCondition('Good');
    setTitle('');
    setDescription('');
    setExchangeWanted('');
    setItemSize('');
    setImages([]);
    previews.forEach((preview) => {
      if (preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    });
    setPreviews([]);
    setErrors({});
    setDraftSavedAt(null);
    setDraftRestored(false);

    const rememberedSchoolId = localStorage.getItem(getLastSchoolKey(user.id));
    const rememberedSchool = rememberedSchoolId ? mySchools.find((school) => school.id === rememberedSchoolId) : null;
    const defaultSchool = rememberedSchool ?? (mySchools.length === 1 ? mySchools[0] : null);

    setTargetSchoolId(defaultSchool?.id ?? schoolIdFromQuery ?? null);
    setSelectedSchoolName(defaultSchool?.name_ja ?? null);
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + previews.length > MAX_IMAGE_COUNT) {
      setErrors((prev) => ({ ...prev, images: COPY.imageLimit }));
      showToast({ tone: 'info', title: COPY.imageLimit });
      return;
    }

    setIsProcessingImages(true);
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };

      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          if (!file.type.startsWith('image/')) return file;
          try {
            return await imageCompression(file, options);
          } catch {
            return file;
          }
        })
      );

      setImages((prev) => [...prev, ...compressedFiles]);
      setPreviews((prev) => [...prev, ...compressedFiles.map((file) => URL.createObjectURL(file))]);
      setErrors((prev) => ({ ...prev, images: undefined }));
    } finally {
      setIsProcessingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const previewToRemove = previews[index];
    const existingImage = existingImages.find((image) => image.storage_path === previewToRemove);

    if (existingImage) {
      setExistingImages((prev) => prev.filter((image) => image.id !== existingImage.id));
    } else {
      const blobIndex = previews.filter(
        (preview, previewIndex) =>
          previewIndex < index && !existingImages.some((image) => image.storage_path === preview)
      ).length;

      setImages((prev) => prev.filter((_, imageIndex) => imageIndex !== blobIndex));
      URL.revokeObjectURL(previewToRemove);
    }

    setPreviews((prev) => prev.filter((_, previewIndex) => previewIndex !== index));
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!targetSchoolId) nextErrors.school = COPY.schoolRequired;
    if (previews.length === 0) nextErrors.images = COPY.imageRequired;
    if (!title.trim()) nextErrors.title = COPY.titleRequired;
    if (!description.trim()) nextErrors.description = COPY.descriptionRequired;
    if (mode === 'EXCHANGE' && !exchangeWanted.trim()) nextErrors.exchangeWanted = COPY.exchangeWantedRequired;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    if (!user) {
      showToast({ tone: 'info', title: COPY.loginRequired });
      return;
    }

    if (!validateForm()) {
      showToast({
        tone: 'info',
        title: COPY.formInvalidTitle,
        description: COPY.formInvalidDescription,
      });
      return;
    }

    setIsSaving(true);
    try {
      let currentPostId = postId;
      const postPayload = {
        school_id: targetSchoolId,
        user_id: user.id,
        mode,
        category,
        condition,
        item_size: category === 'Uniform' ? itemSize : null,
        title: title.trim(),
        description: description.trim(),
        exchange_wanted: mode === 'EXCHANGE' ? exchangeWanted.trim() : null,
        status: 'Available',
      };

      if (isEditMode) {
        const { error: updateError } = await supabase.from('posts').update(postPayload).eq('id', postId);
        if (updateError) throw updateError;
      } else {
        const { data: postData, error: postError } = await supabase.from('posts').insert(postPayload).select().single();
        if (postError) throw postError;
        currentPostId = postData.id;
      }

      if (isEditMode) {
        await supabase.from('post_images').delete().eq('post_id', currentPostId);
      }

      for (let index = 0; index < existingImages.length; index += 1) {
        await supabase.from('post_images').insert({
          post_id: currentPostId,
          storage_path: existingImages[index].storage_path,
          sort_order: index,
        });
      }

      for (let index = 0; index < images.length; index += 1) {
        const file = images[index];
        const ext = file.name.split('.').pop();
        const fileName = `${currentPostId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('post-images').getPublicUrl(fileName);
        await supabase.from('post_images').insert({
          post_id: currentPostId,
          storage_path: publicUrlData.publicUrl,
          sort_order: existingImages.length + index,
        });
      }

      if (!isEditMode && user) {
        localStorage.removeItem(getDraftKey(user.id));
        if (targetSchoolId) {
          localStorage.setItem(getLastSchoolKey(user.id), targetSchoolId);
        }
      }

      showToast({ tone: 'success', title: isEditMode ? COPY.updated : COPY.created });
      navigate(`/post/${currentPostId}`);
    } catch (error) {
      showToast({
        tone: 'error',
        title: COPY.saveFailed,
        description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const schoolTypeLabel = (type: string) => SCHOOL_TYPE_LABELS[type] ?? type;

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-lime-500" />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-xl p-6 pb-32 pt-12">
        <button
          onClick={() => (isDirty && !isEditMode ? setShowLeaveConfirm(true) : navigate(-1))}
          className="mb-6 flex items-center gap-2 font-bold text-slate-400 transition-colors hover:text-lime-600"
        >
          <ArrowLeft size={20} />
          {COPY.back}
        </button>

        <h1 className="mb-8 text-3xl font-black text-slate-800">{isEditMode ? COPY.editHeading : COPY.createHeading}</h1>

        {!isEditMode && (
          <div className="mb-6 rounded-[2rem] border border-slate-100 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-700">下書きを自動保存しています</p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {draftRestored
                    ? '前回の入力内容を復元しました。'
                    : '入力内容はこの端末に一時保存されます。'}
                </p>
                {draftSavedAt && (
                  <p className="mt-1 text-[11px] font-bold text-slate-300">
                    最終保存 {new Date(draftSavedAt).toLocaleString('ja-JP')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={clearDraft}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-500 transition-colors hover:border-red-200 hover:text-red-500"
              >
                下書きを削除
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isEditMode && (
            <div className="rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50">
              <label className="mb-4 ml-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <MapPin size={14} />
                {COPY.schoolLabel}
              </label>

              {schoolsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-lime-500" size={24} />
                </div>
              ) : mySchools.length === 0 ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 rounded-xl bg-amber-100 p-2">
                      <AlertTriangle size={20} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="mb-1 text-sm font-bold text-amber-800">{COPY.noSchoolsTitle}</p>
                      <p className="mb-3 text-xs text-amber-600">{COPY.noSchoolsDescription}</p>
                      <Link
                        to="/schools"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-amber-500/20 transition-all active:scale-95 hover:bg-amber-600"
                      >
                        <SchoolIcon size={14} />
                        {COPY.addSchool}
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {mySchools.map((school) => {
                    const isSelected = targetSchoolId === school.id;
                    return (
                      <button
                        key={school.id}
                        type="button"
                        onClick={() => handleSelectSchool(school)}
                        className={`group relative flex items-center gap-2.5 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all duration-200 active:scale-95 ${
                          isSelected
                            ? 'bg-lime-500 text-white shadow-lg shadow-lime-500/30 ring-2 ring-lime-500 ring-offset-2'
                            : 'border border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:shadow-md'
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            isSelected ? 'bg-white/20' : 'bg-white shadow-sm'
                          }`}
                        >
                          {isSelected ? (
                            <CheckCircle2 size={18} className="text-white" />
                          ) : (
                            <SchoolIcon size={16} className="text-slate-400 transition-colors group-hover:text-lime-500" />
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="truncate leading-tight">{school.name_ja}</p>
                          <p
                            className={`text-[10px] font-black uppercase tracking-widest ${
                              isSelected ? 'text-white/70' : 'text-slate-400'
                            }`}
                          >
                            {schoolTypeLabel(school.type)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {errors.school && <p className="mt-3 text-xs font-bold text-red-500">{errors.school}</p>}
            </div>
          )}

          {isEditMode && selectedSchoolName && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-sm">
              <div className="rounded-xl bg-lime-50 p-2">
                <SchoolIcon size={16} className="text-lime-600" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{COPY.selectedSchool}</p>
                <p className="text-sm font-bold text-slate-700">{selectedSchoolName}</p>
              </div>
            </div>
          )}

          <div className="space-y-6 rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
            <div>
              <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                {COPY.imagesLabel}
              </label>
              <div className="flex flex-wrap gap-4">
                {previews.map((preview, index) => (
                  <div
                    key={index}
                    className="group relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 shadow-sm"
                  >
                    <img src={preview} alt="preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {previews.length < MAX_IMAGE_COUNT && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-lime-500 hover:text-lime-500"
                  >
                    <Camera size={24} />
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg, image/png, image/webp"
                multiple
                onChange={handleImageChange}
              />
              {errors.images && <p className="mt-3 text-xs font-bold text-red-500">{errors.images}</p>}
            </div>

            <div>
              <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                {COPY.titleLabel}
              </label>
              <input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value.slice(0, MAX_TITLE_LENGTH));
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                maxLength={MAX_TITLE_LENGTH}
                className="w-full rounded-2xl border-none bg-slate-50 p-4 font-bold outline-none transition-all focus:ring-2 focus:ring-lime-500"
                placeholder={COPY.titlePlaceholder}
              />
              <p className="mt-2 text-right text-[11px] font-bold text-slate-400">
                {title.length}/{MAX_TITLE_LENGTH}
              </p>
              {errors.title && <p className="mt-3 text-xs font-bold text-red-500">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                  {COPY.categoryLabel}
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as PostCategory)}
                  className="w-full appearance-none rounded-2xl border-none bg-slate-50 p-4 font-bold outline-none transition-all focus:ring-2 focus:ring-lime-500"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                  {COPY.conditionLabel}
                </label>
                <select
                  value={condition}
                  onChange={(event) => setCondition(event.target.value as PostCondition)}
                  className="w-full appearance-none rounded-2xl border-none bg-slate-50 p-4 font-bold outline-none transition-all focus:ring-2 focus:ring-lime-500"
                >
                  {CONDITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {category === 'Uniform' && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                  {COPY.sizeLabel}
                </label>
                <input
                  value={itemSize}
                  onChange={(event) => setItemSize(event.target.value)}
                  className="w-full rounded-2xl border-none bg-slate-50 p-4 font-bold outline-none transition-all focus:ring-2 focus:ring-lime-500"
                  placeholder={COPY.sizePlaceholder}
                />
              </div>
            )}

            <div>
              <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                {COPY.descriptionLabel}
              </label>
              <textarea
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value.slice(0, MAX_DESCRIPTION_LENGTH));
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }}
                rows={4}
                maxLength={MAX_DESCRIPTION_LENGTH}
                className="w-full rounded-2xl border-none bg-slate-50 p-4 font-medium outline-none transition-all focus:ring-2 focus:ring-lime-500"
                placeholder={COPY.descriptionPlaceholder}
              />
              <p className="mt-2 text-right text-[11px] font-bold text-slate-400">
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </p>
              {errors.description && <p className="mt-3 text-xs font-bold text-red-500">{errors.description}</p>}
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
            <label className="mb-4 ml-1 block text-xs font-black uppercase tracking-widest text-slate-400">
              {COPY.modeLabel}
            </label>
            <div className="mb-6 flex gap-3">
              <button
                type="button"
                onClick={() => setMode('GIVEAWAY')}
                className={`flex-1 rounded-2xl py-4 text-sm font-black transition-all ${
                  mode === 'GIVEAWAY'
                    ? 'bg-lime-500 text-white shadow-lg shadow-lime-500/30'
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {COPY.giveaway}
              </button>
              <button
                type="button"
                onClick={() => setMode('EXCHANGE')}
                className={`flex-1 rounded-2xl py-4 text-sm font-black transition-all ${
                  mode === 'EXCHANGE'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {COPY.exchange}
              </button>
            </div>

            {mode === 'EXCHANGE' && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-purple-400">
                  {COPY.exchangeWantedLabel}
                </label>
                <input
                  value={exchangeWanted}
                  onChange={(event) => {
                    setExchangeWanted(event.target.value);
                    setErrors((prev) => ({ ...prev, exchangeWanted: undefined }));
                  }}
                  className="w-full rounded-2xl border-none bg-purple-50 p-4 font-bold text-purple-900 outline-none transition-all focus:ring-2 focus:ring-purple-500"
                  placeholder={COPY.exchangeWantedPlaceholder}
                />
                {errors.exchangeWanted && (
                  <p className="mt-3 text-xs font-bold text-red-500">{errors.exchangeWanted}</p>
                )}
              </div>
            )}
          </div>

          <button
            disabled={isSaving || isProcessingImages}
            className="flex w-full items-center justify-center gap-2 rounded-[2rem] bg-lime-500 py-5 text-xl font-black text-white shadow-xl shadow-lime-500/30 transition-all active:scale-[0.98] hover:bg-lime-600 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-slate-200/30"
          >
            {isSaving || isProcessingImages ? (
              <>
                <Loader2 className="animate-spin" />
                {isProcessingImages ? COPY.processingImages : COPY.saving}
              </>
            ) : isEditMode ? (
              COPY.saveEdit
            ) : (
              COPY.publish
            )}
          </button>
        </form>
      </div>

      <ConfirmDialog
        isOpen={showLeaveConfirm}
        title={COPY.leaveTitle}
        description={COPY.leaveDescription}
        confirmLabel={COPY.leaveConfirm}
        tone="danger"
        onCancel={() => setShowLeaveConfirm(false)}
        onConfirm={() => navigate(-1)}
      />
    </>
  );
};
