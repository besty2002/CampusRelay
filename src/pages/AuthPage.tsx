import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } }
        });
        if (error) throw error;
        alert('会員登録に成功しました！メールを確認するか、ログインしてください。');
      }
      navigate('/schools');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // GitHub Pagesのベースパスを含めた正確なリダイレクトURL設定
    const redirectTo = window.location.origin + import.meta.env.BASE_URL;
    console.log('Redirecting to:', redirectTo);
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl p-8 border border-slate-100">
        <h1 className="text-3xl font-black text-center text-slate-800 mb-8">
          Campus<span className="text-lime-500">Relay</span>
        </h1>
        
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-1 ml-1">Display Name</label>
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                placeholder="山田太郎"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1 ml-1">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none transition-all"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1 ml-1">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-lime-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          
          <button
            disabled={loading}
            className="w-full bg-lime-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-lime-500/30 hover:bg-lime-600 active:scale-[0.98] transition-all"
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <img src="https://www.google.com/favicon.ico" alt="google" className="w-5 h-5" />
            Continue with Google
          </button>
        </div>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-6 text-sm font-bold text-slate-400 hover:text-lime-600 transition-colors"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
};
