import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/feedback/ToastProvider';

const COPY = {
  title: 'CampusRelay',
  displayNameLabel: '表示名',
  displayNamePlaceholder: '表示名を入力',
  emailLabel: 'メールアドレス',
  passwordLabel: 'パスワード',
  passwordPlaceholder: '8文字以上で入力',
  loading: '処理中...',
  login: 'ログイン',
  signup: '新規登録',
  googleLogin: 'Googleで続ける',
  switchToSignup: 'アカウントをお持ちでない場合は新規登録へ',
  switchToLogin: 'すでにアカウントをお持ちの場合はログインへ',
  signupSuccess: '新規登録が完了しました',
  signupDescription: '確認メールを送信しました。メールを確認してからログインしてください。',
  authError: '認証に失敗しました',
  fallbackError: '時間をおいてもう一度お試しください。',
} as const;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

export const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) throw error;

        showToast({
          tone: 'success',
          title: COPY.signupSuccess,
          description: COPY.signupDescription,
        });
      }

      navigate('/schools');
    } catch (error: unknown) {
      showToast({
        tone: 'error',
        title: COPY.authError,
        description: getErrorMessage(error, COPY.fallbackError),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const redirectTo = window.location.origin + import.meta.env.BASE_URL;

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-100 bg-white p-8 shadow-xl">
        <h1 className="mb-8 text-center text-3xl font-black text-slate-800">
          Campus<span className="text-lime-500">Relay</span>
        </h1>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="display-name" className="mb-1 ml-1 block text-sm font-bold text-slate-500">
                {COPY.displayNameLabel}
              </label>
              <input
                id="display-name"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-2xl border-none bg-slate-50 p-4 outline-none transition-all focus:ring-2 focus:ring-lime-500"
                placeholder={COPY.displayNamePlaceholder}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 ml-1 block text-sm font-bold text-slate-500">
              {COPY.emailLabel}
            </label>
            <input
              id="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border-none bg-slate-50 p-4 outline-none transition-all focus:ring-2 focus:ring-lime-500"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 ml-1 block text-sm font-bold text-slate-500">
              {COPY.passwordLabel}
            </label>
            <input
              id="password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border-none bg-slate-50 p-4 outline-none transition-all focus:ring-2 focus:ring-lime-500"
              placeholder={COPY.passwordPlaceholder}
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-lime-500 py-4 text-lg font-bold text-white shadow-lg shadow-lime-500/30 transition-all hover:bg-lime-600 active:scale-[0.98]"
          >
            {loading ? COPY.loading : isLogin ? COPY.login : COPY.signup}
          </button>
        </form>

        <div className="mt-6">
          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-4 font-bold text-slate-600 transition-all hover:bg-slate-50"
          >
            <img src="https://www.google.com/favicon.ico" alt="" aria-hidden="true" className="h-5 w-5" />
            {COPY.googleLogin}
          </button>
        </div>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="mt-6 w-full text-sm font-bold text-slate-400 transition-colors hover:text-lime-600"
        >
          {isLogin ? COPY.switchToSignup : COPY.switchToLogin}
        </button>
      </div>
    </div>
  );
};
