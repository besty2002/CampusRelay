import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { School } from '../types';

export const SchoolSelectPage = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [mySchools, setMySchools] = useState<School[]>([]);
  const [postCounts, setPostCounts] = useState<{ [key: string]: number }>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMySchools();
  }, []);

  const fetchMySchools = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // 1. Get my schools list
    const { data: userSchoolsData } = await supabase
      .from('user_schools')
      .select('school_id, schools(id, name_ja, type)')
      .eq('user_id', user.id);
      
    if (userSchoolsData) {
      const schoolsList = userSchoolsData.map((d: any) => d.schools);
      const schoolIds = schoolsList.map((s: any) => s.id);

      // 2. Get 'Available' post counts for each school
      if (schoolIds.length > 0) {
        const { data: postsData, error: countError } = await supabase
          .from('posts')
          .select('school_id')
          .in('school_id', schoolIds)
          .eq('status', 'Available');

        if (!countError && postsData) {
          const counts: { [key: string]: number } = {};
          postsData.forEach((p: any) => {
            counts[p.school_id] = (counts[p.school_id] || 0) + 1;
          });
          setPostCounts(counts);
        }
      }
      
      setMySchools(schoolsList);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from('schools')
      .select('*')
      .ilike('name_ja', `%${search}%`)
      .limit(10);
    if (data) setSchools(data);
    setLoading(false);
  };

  const addSchool = async (school: School) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // [Fail-safe] Check if profile exists, if not create one
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      await supabase.from('profiles').insert({
        id: user.id,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'
      });
    }

    const { error } = await supabase
      .from('user_schools')
      .insert({ user_id: user.id, school_id: school.id });
    
    if (error) {
      if (error.code === '23505') alert('既に追加されている学校です。');
      else alert(error.message);
    } else {
      fetchMySchools();
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 pt-12">
      <h1 className="text-3xl font-black text-slate-800 mb-2">My Schools</h1>
      <p className="text-slate-400 mb-8 font-medium">足立区内の学校を追加してみてください。</p>
      
      <div className="mb-10">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">登録済みの学校</h2>
        {mySchools.length === 0 ? (
          <div className="p-8 bg-slate-50 rounded-3xl text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-sm font-bold">まだ登録された学校がありません。</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {mySchools.map(school => (
              <button 
                key={school.id}
                onClick={() => navigate(`/feed/${school.id}`)}
                className="bg-lime-500 text-white p-5 rounded-[2rem] font-black text-left hover:bg-lime-600 transition-all hover:scale-[1.02] shadow-lg shadow-lime-500/20 flex justify-between items-center group relative overflow-hidden"
              >
                <div className="flex flex-col">
                  <span className="text-lg">{school.name_ja}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-200 animate-pulse"></span>
                    <span className="text-[11px] font-black text-white/90 uppercase tracking-widest">
                      出品中のアイテム {postCounts[school.id] || 0}個
                    </span>
                  </div>
                </div>
                <span className="bg-white/20 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                  &rarr;
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
        <h2 className="text-sm font-black text-slate-800 mb-4 ml-1">学校を検索・追加</h2>
        <div className="flex gap-2 mb-6">
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
            placeholder="学校名を入力..."
            className="flex-1 p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-sky-500 outline-none transition-all font-bold"
          />
          <button 
            onClick={handleSearch} 
            disabled={loading}
            className="bg-sky-500 text-white px-6 rounded-2xl font-black hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20"
          >
            {loading ? '...' : '検索'}
          </button>
        </div>
        
        <div className="flex flex-col gap-2">
          {schools.map(school => (
            <div key={school.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
              <div className="flex flex-col">
                <span className="font-bold text-slate-700">{school.name_ja}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{school.type}</span>
              </div>
              <button 
                onClick={() => addSchool(school)} 
                className="text-xs text-sky-600 font-black bg-sky-50 px-4 py-2 rounded-xl hover:bg-sky-100 transition-all"
              >
                追加
              </button>
            </div>
          ))}
          {schools.length === 0 && search && !loading && (
            <p className="text-center text-slate-400 text-sm py-4">検索結果がありません。</p>
          )}
        </div>
      </div>
    </div>
  );
};
