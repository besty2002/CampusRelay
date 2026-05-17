import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { School } from '../types';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { useToast } from '../components/feedback/ToastProvider';

type SchoolJoin = {
  school_id: string;
  schools: School | School[] | null;
};

type RemoveDialogState = {
  schoolId: string;
  schoolName: string;
  activeCount: number;
  shouldHidePosts: boolean;
} | null;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

const schoolTypeLabel = (type: School['type']) => {
  switch (type) {
    case 'elementary':
      return '小学校';
    case 'middle':
      return '中学校';
    case 'high':
      return '高校';
    default:
      return type;
  }
};

export const SchoolSelectPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [mySchools, setMySchools] = useState<School[]>([]);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeDialog, setRemoveDialog] = useState<RemoveDialogState>(null);

  const mySchoolIds = useMemo(() => new Set(mySchools.map((school) => school.id)), [mySchools]);

  const getCurrentUser = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user ?? null;
    } catch {
      return null;
    }
  }, []);

  const fetchMySchools = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const { data: userSchoolsData } = await supabase
      .from('user_schools')
      .select('school_id, schools(id, name_ja, type)')
      .eq('user_id', user.id)
      .returns<SchoolJoin[]>();

    if (!userSchoolsData) return;

    const schoolsList = userSchoolsData
      .map((row) => (Array.isArray(row.schools) ? row.schools[0] : row.schools))
      .filter((school): school is School => Boolean(school));

    const schoolIds = schoolsList.map((school) => school.id);

    if (schoolIds.length > 0) {
      const { data: postsData, error: countError } = await supabase
        .from('posts')
        .select('school_id')
        .in('school_id', schoolIds)
        .eq('status', 'Available')
        .returns<{ school_id: string }[]>();

      if (!countError && postsData) {
        const counts = postsData.reduce<Record<string, number>>((accumulator, post) => {
          accumulator[post.school_id] = (accumulator[post.school_id] || 0) + 1;
          return accumulator;
        }, {});
        setPostCounts(counts);
      }
    } else {
      setPostCounts({});
    }

    setMySchools(schoolsList);
  }, [getCurrentUser]);

  useEffect(() => {
    fetchMySchools();
  }, [fetchMySchools]);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);

    const { data } = await supabase
      .from('schools')
      .select('*')
      .ilike('name_ja', `%${search}%`)
      .limit(10)
      .returns<School[]>();

    if (data) setSchools(data);
    setLoading(false);
  };

  const addSchool = async (school: School) => {
    const user = await getCurrentUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();

    if (!profile) {
      await supabase.from('profiles').insert({
        id: user.id,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
      });
    }

    const { error } = await supabase.from('user_schools').insert({ user_id: user.id, school_id: school.id });

    if (error) {
      if (error.code === '23505') {
        showToast({ tone: 'info', title: 'この学校はすでに登録されています。' });
      } else {
        showToast({
          tone: 'error',
          title: '学校の追加に失敗しました',
          description: error.message,
        });
      }
      return;
    }

    showToast({
      tone: 'success',
      title: `${school.name_ja} を追加しました`,
    });
    fetchMySchools();
  };

  const requestRemoveSchool = (school: School, event: React.MouseEvent) => {
    event.stopPropagation();
    setRemoveDialog({
      schoolId: school.id,
      schoolName: school.name_ja,
      activeCount: postCounts[school.id] || 0,
      shouldHidePosts: (postCounts[school.id] || 0) > 0,
    });
  };

  const confirmRemoveSchool = async () => {
    if (!removeDialog) return;

    setRemoving(true);
    const user = await getCurrentUser();

    if (!user) {
      setRemoving(false);
      setRemoveDialog(null);
      return;
    }

    try {
      if (removeDialog.activeCount > 0 && removeDialog.shouldHidePosts) {
        await supabase
          .from('posts')
          .update({ status: 'Hidden' })
          .eq('user_id', user.id)
          .eq('school_id', removeDialog.schoolId)
          .eq('status', 'Available');
      }

      const { error } = await supabase
        .from('user_schools')
        .delete()
        .eq('user_id', user.id)
        .eq('school_id', removeDialog.schoolId);

      if (error) throw error;

      showToast({
        tone: 'success',
        title: `${removeDialog.schoolName} をリストから外しました`,
        description:
          removeDialog.activeCount > 0 && removeDialog.shouldHidePosts
            ? '出品中のアイテムは非公開に切り替えました。'
            : '学校の登録だけを解除しました。',
      });
      setRemoveDialog(null);
      fetchMySchools();
    } catch (error: unknown) {
      showToast({
        tone: 'error',
        title: '削除に失敗しました',
        description: getErrorMessage(error, '時間をおいてもう一度お試しください。'),
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6 pt-12">
      <h1 className="mb-2 text-3xl font-black text-slate-800">My Schools</h1>
      <p className="mb-8 font-medium text-slate-400">利用する学校を追加してください。</p>

      <div className="mb-10">
        <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">登録中の学校</h2>
        {mySchools.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-bold text-slate-400">まだ登録されている学校がありません。</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {mySchools.map((school) => (
              <div key={school.id} className="group relative">
                <button
                  onClick={() => navigate(`/feed/${school.id}`)}
                  className="flex w-full items-center justify-between overflow-hidden rounded-[2rem] bg-lime-500 p-5 text-left font-black text-white shadow-lg shadow-lime-500/20 transition-all hover:scale-[1.02] hover:bg-lime-600"
                >
                  <div className="flex flex-col pr-12">
                    <span className="text-lg">{school.name_ja}</span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-200" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-white/90">
                        出品中のアイテム {postCounts[school.id] || 0}件
                      </span>
                    </div>
                  </div>
                  <span className="translate-x-0 rounded-full bg-white/20 p-2 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
                    &rarr;
                  </span>
                </button>
                <button
                  onClick={(event) => requestRemoveSchool(school, event)}
                  className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white opacity-0 shadow-sm transition-all hover:bg-red-500/90 group-hover:opacity-100"
                  title="削除"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
        <h2 className="mb-4 ml-1 text-sm font-black text-slate-800">学校を検索・追加</h2>
        <div className="mb-6 flex gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
            placeholder="学校名を入力..."
            className="flex-1 rounded-2xl border-none bg-slate-50 p-4 font-bold outline-none transition-all focus:ring-2 focus:ring-sky-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="rounded-2xl bg-sky-500 px-6 font-black text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-600"
          >
            {loading ? '...' : '検索'}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {schools.map((school) => {
            const isAlreadyAdded = mySchoolIds.has(school.id);
            return (
              <div
                key={school.id}
                className="flex items-center justify-between rounded-2xl border border-transparent bg-slate-50 p-4 transition-all hover:border-slate-200"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-slate-700">{school.name_ja}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {schoolTypeLabel(school.type)}
                  </span>
                </div>
                {isAlreadyAdded ? (
                  <span className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-black text-slate-400">
                    登録済み
                  </span>
                ) : (
                  <button
                    onClick={() => addSchool(school)}
                    className="rounded-xl bg-sky-50 px-4 py-2 text-xs font-black text-sky-600 transition-all hover:bg-sky-100"
                  >
                    追加
                  </button>
                )}
              </div>
            );
          })}
          {schools.length === 0 && search && !loading && (
            <p className="py-4 text-center text-sm text-slate-400">検索結果がありません。</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(removeDialog)}
        title="この学校をリストから外しますか？"
        description={
          removeDialog?.activeCount
            ? `${removeDialog.schoolName} には出品中のアイテムが ${removeDialog.activeCount} 件あります。非公開に切り替える場合はチェックを入れてください。`
            : '学校の登録を解除します。'
        }
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        tone="danger"
        busy={removing}
        onCancel={() => setRemoveDialog(null)}
        onConfirm={confirmRemoveSchool}
      />

      {removeDialog && removeDialog.activeCount > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[90] flex items-end justify-center pb-10">
          <div className="pointer-events-auto w-full max-w-md px-6">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
              <input
                type="checkbox"
                checked={removeDialog.shouldHidePosts}
                onChange={(event) =>
                  setRemoveDialog((prev) => (prev ? { ...prev, shouldHidePosts: event.target.checked } : prev))
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-lime-500 focus:ring-lime-500"
              />
              <span className="text-sm font-medium text-slate-600">
                この学校で出品中のアイテムも非公開にする
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
