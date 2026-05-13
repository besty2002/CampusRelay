import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, ShieldCheck, Mail, Lock, KeyRound, ArrowRight, Home } from 'lucide-react';

export const AdminAuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // 1. Standard Login
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        // 2. Check Admin Role
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          if (!profile || profile.role === 'user') {
            await supabase.auth.signOut();
            throw new Error('管理者権限がありません。一般ユーザー用ページからログインしてください。');
          }
          
          navigate('/admin');
        }
      } else {
        // Registration with Invite Code
        if (!inviteCode) throw new Error('招待コードを入力してください。');
        if (!displayName) throw new Error('名前を入力してください。');

        // 1. Sign Up User
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          // 2. Redeem Invite Code via RPC
          const { error: rpcError } = await supabase.rpc('redeem_admin_invite', {
            invite_code: inviteCode
          });

          if (rpcError) {
            // If redemption fails, user is created but is standard 'user'
            throw new Error(`アカウントは作成されましたが、招待コードが無効です: ${rpcError.message}`);
          }

          alert('管理者アカウントが正常に作成されました。');
          navigate('/admin');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lime-500/10 rounded-full blur-[100px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px] -ml-64 -mb-64 pointer-events-none" />

      {/* Header */}
      <div className="p-6 relative z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-lime-400 to-lime-600 rounded-xl flex items-center justify-center text-slate-950 shadow-lg shadow-lime-500/20">
            <ShieldCheck size={24} />
          </div>
          <span className="font-black text-xl tracking-tight text-white">CampusRelay <span className="text-lime-500">Admin</span></span>
        </div>
        <Link to="/" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800 backdrop-blur-sm">
          <Home size={16} /> 一般アプリに戻る
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-white tracking-tight mb-3">
              {isLogin ? '管理者ログイン' : '管理者アカウント登録'}
            </h1>
            <p className="text-slate-400 font-medium">
              {isLogin 
                ? '権限のあるアカウントでログインしてください。' 
                : '付与された招待コードを入力して登録を完了します。'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 backdrop-blur-xl shadow-2xl">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold rounded-2xl flex items-start gap-3">
                <div className="shrink-0 mt-0.5">⚠️</div>
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">招待コード</label>
                    <div className="relative">
                      <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        required={!isLogin}
                        placeholder="ADMIN-XXXX-XXXX"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">お名前</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required={!isLogin}
                      placeholder="表示名"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">メールアドレス</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">パスワード</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="6文字以上"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-gradient-to-r from-lime-500 to-lime-600 text-slate-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:from-lime-400 hover:to-lime-500 transition-all shadow-lg shadow-lime-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (
                <>
                  {isLogin ? 'ログイン' : 'アカウントを作成'} <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-slate-400 font-bold hover:text-white transition-colors text-sm"
            >
              {isLogin ? '招待コードをお持ちですか？ 新規登録へ' : 'すでに管理者アカウントをお持ちですか？ ログインへ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
