import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ExternalLink, 
  AlertTriangle,
  EyeOff
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

interface Report {
  id: string;
  post_id: string;
  reason: string;
  status: 'Pending' | 'Reviewed';
  created_at: string;
  posts: {
    title: string;
    status: string;
    user_id: string;
  };
  profiles: {
    display_name: string;
  };
}

export const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();
    
    if (data) {
      if (data.role === 'user') {
        alert('관리자 권한이 없습니다.');
        navigate('/');
        return;
      }
      fetchReports();
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reports')
      .select(`
        *,
        posts (title, status, user_id),
        profiles (display_name)
      `)
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    if (data) setReports(data as any[]);
    setLoading(false);
  };

  const handleResolveReport = async (reportId: string, postId: string, action: 'hide' | 'ignore') => {
    try {
      if (action === 'hide') {
        const { error: postError } = await supabase
          .from('posts')
          .update({ status: 'Hidden' })
          .eq('id', postId);
        if (postError) throw postError;
      }

      const { error: reportError } = await supabase
        .from('reports')
        .update({ status: 'Reviewed' })
        .eq('id', reportId);
      if (reportError) throw reportError;

      alert(action === 'hide' ? '게시글이 숨김 처리되었습니다.' : '신고가 기각되었습니다.');
      fetchReports();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-lime-500" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 pt-12 pb-32">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-lime-500 text-white rounded-xl shadow-lg shadow-lime-500/30">
            <ShieldAlert size={24} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Admin Dashboard</h1>
        </div>
        <p className="text-slate-500 font-medium ml-1">학교 관리자 모드: 신고된 게시물을 검토합니다.</p>
      </header>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} />
            신고된 게시글 ({reports.length})
          </h2>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
            <CheckCircle className="mx-auto text-lime-500 mb-4" size={48} />
            <p className="text-slate-400 font-bold">현재 처리할 신고가 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Reason</span>
                    <p className="text-lg font-bold text-slate-800">{report.reason}</p>
                  </div>
                  <Link 
                    to={`/post/${report.post_id}`}
                    className="flex items-center gap-1 text-xs font-black text-sky-600 hover:underline"
                  >
                    게시글 보기 <ExternalLink size={14} />
                  </Link>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                  <p className="text-xs font-bold text-slate-400 mb-1">Target Post</p>
                  <p className="font-black text-slate-700">{report.posts?.title}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Reporter: {report.profiles?.display_name}</p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleResolveReport(report.id, report.post_id, 'hide')}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                  >
                    <EyeOff size={18} /> 게시글 숨기기
                  </button>
                  <button 
                    onClick={() => handleResolveReport(report.id, report.post_id, 'ignore')}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-800/20"
                  >
                    <XCircle size={18} /> 신고 기각
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
