import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { PostMode, PostCategory, PostCondition } from '../types';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const CreatePostPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get('schoolId');
  
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<PostMode>('GIVEAWAY');
  const [category, setCategory] = useState<PostCategory>('Textbook');
  const [condition, setCondition] = useState<PostCondition>('Good');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [exchangeWanted, setExchangeWanted] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return alert('학교 정보가 없습니다.');
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { error } = await supabase.from('posts').insert({
        school_id: schoolId,
        user_id: user.id,
        mode,
        category,
        condition,
        title,
        description,
        exchange_wanted: mode === 'EXCHANGE' ? exchangeWanted : null,
        status: 'Available'
      });

      if (error) throw error;
      navigate(`/feed/${schoolId}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 pt-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 font-bold mb-6 hover:text-lime-600 transition-colors">
        <ArrowLeft size={20} /> 취소하고 돌아가기
      </button>

      <h1 className="text-3xl font-black text-slate-800 mb-8">나눔 등록하기</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Title</label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold"
              placeholder="예: 弘道小学校 체육복 상의"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Category</label>
              <select 
                value={category} onChange={e => setCategory(e.target.value as any)}
                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold appearance-none"
              >
                <option value="Uniform">교복/의류</option>
                <option value="Textbook">교과서/도서</option>
                <option value="Supplies">학용품</option>
                <option value="Other">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Condition</label>
              <select 
                value={condition} onChange={e => setCondition(e.target.value as any)}
                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold appearance-none"
              >
                <option value="Like New">거의 새것</option>
                <option value="Good">상태 좋음</option>
                <option value="Used">사용감 있음</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Description</label>
            <textarea
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none transition-all font-medium"
              placeholder="상세 정보를 입력해 주세요."
            />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Sharing Mode</label>
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => setMode('GIVEAWAY')}
              className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${
                mode === 'GIVEAWAY' ? 'bg-lime-500 text-white shadow-lg shadow-lime-500/30' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              Free Giveaway
            </button>
            <button
              type="button"
              onClick={() => setMode('EXCHANGE')}
              className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${
                mode === 'EXCHANGE' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              Exchange
            </button>
          </div>

          {mode === 'EXCHANGE' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="block text-xs font-black text-purple-400 uppercase tracking-widest mb-2 ml-1">교환 희망 조건</label>
              <input
                required
                value={exchangeWanted}
                onChange={e => setExchangeWanted(e.target.value)}
                className="w-full p-4 bg-purple-50 rounded-2xl border-none focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-purple-900"
                placeholder="예: 중학교 1학년 수학 교과서"
              />
            </div>
          )}
        </div>

        <button
          disabled={loading}
          className="w-full bg-lime-500 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-lime-500/30 hover:bg-lime-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : '나눔 등록 완료'}
        </button>
      </form>
    </div>
  );
};
