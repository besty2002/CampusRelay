import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { School } from '../types';

export const SchoolSelectPage = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [mySchools, setMySchools] = useState<School[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMySchools();
  }, []);

  const fetchMySchools = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('user_schools')
      .select('school_id, schools(id, name_ja, type)')
      .eq('user_id', user.id);
      
    if (data) setMySchools(data.map((d: any) => d.schools));
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

    const { error } = await supabase
      .from('user_schools')
      .insert({ user_id: user.id, school_id: school.id });
    
    if (error) {
      if (error.code === '23505') alert('이미 추가된 학교입니다.');
      else alert(error.message);
    } else {
      fetchMySchools();
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 pt-12">
      <h1 className="text-3xl font-black text-slate-800 mb-2">My Schools</h1>
      <p className="text-slate-400 mb-8 font-medium">아다치구 내 학교를 추가해 보세요.</p>
      
      <div className="mb-10">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">등록된 학교 목록</h2>
        {mySchools.length === 0 ? (
          <div className="p-8 bg-slate-50 rounded-3xl text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-sm font-bold">아직 등록된 학교가 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {mySchools.map(school => (
              <button 
                key={school.id}
                onClick={() => navigate(`/feed/${school.id}`)}
                className="bg-lime-500 text-white p-5 rounded-[2rem] font-black text-left hover:bg-lime-600 transition-all hover:scale-[1.02] shadow-lg shadow-lime-500/20 flex justify-between items-center group"
              >
                <span>{school.name_ja}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
        <h2 className="text-sm font-black text-slate-800 mb-4 ml-1">학교 검색 및 추가</h2>
        <div className="flex gap-2 mb-6">
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
            placeholder="학교 이름 입력..."
            className="flex-1 p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-sky-500 outline-none transition-all font-bold"
          />
          <button 
            onClick={handleSearch} 
            disabled={loading}
            className="bg-sky-500 text-white px-6 rounded-2xl font-black hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20"
          >
            {loading ? '...' : '검색'}
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
                추가
              </button>
            </div>
          ))}
          {schools.length === 0 && search && !loading && (
            <p className="text-center text-slate-400 text-sm py-4">검색 결과가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};
