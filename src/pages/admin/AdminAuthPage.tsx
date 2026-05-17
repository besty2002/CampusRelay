import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ShieldCheck, Mail, Lock, KeyRound, ArrowRight, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/feedback/ToastProvider';
import { ADMIN_AUTH_COPY } from './adminCopy';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

export const AdminAuthPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleGoogleLogin = async () => {
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin`,
        },
      });

      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      setError(getErrorMessage(err, ADMIN_AUTH_COPY.googleError));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          if (!profile || profile.role === 'user') {
            await supabase.auth.signOut();
            throw new Error(ADMIN_AUTH_COPY.noPermissionError);
          }

          navigate('/admin');
        }

        return;
      }

      if (!inviteCode.trim()) throw new Error(ADMIN_AUTH_COPY.inviteRequiredError);
      if (!displayName.trim()) throw new Error(ADMIN_AUTH_COPY.displayNameRequiredError);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: rpcError } = await supabase.rpc('redeem_admin_invite', {
          invite_code: inviteCode.trim(),
        });

        if (rpcError) {
          throw new Error(`${ADMIN_AUTH_COPY.redeemErrorPrefix} ${rpcError.message}`);
        }

        showToast({
          tone: 'success',
          title: ADMIN_AUTH_COPY.registerSuccessTitle,
          description: ADMIN_AUTH_COPY.registerSuccessDescription,
        });
        navigate('/admin');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, ADMIN_AUTH_COPY.genericAuthError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950 text-slate-200">
      <div className="pointer-events-none absolute right-0 top-0 -mr-64 -mt-64 h-[500px] w-[500px] rounded-full bg-lime-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 -mb-64 -ml-64 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[100px]" />

      <div className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 to-lime-600 text-slate-950 shadow-lg shadow-lime-500/20">
            <ShieldCheck size={24} />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            CampusRelay <span className="text-lime-500">Admin</span>
          </span>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm font-bold text-slate-400 backdrop-blur-sm transition-colors hover:text-white"
        >
          <Home size={16} /> {ADMIN_AUTH_COPY.homeLink}
        </Link>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <h1 className="mb-3 text-3xl font-black tracking-tight text-white">
              {isLogin ? ADMIN_AUTH_COPY.loginTitle : ADMIN_AUTH_COPY.registerTitle}
            </h1>
            <p className="font-medium text-slate-400">
              {isLogin
                ? ADMIN_AUTH_COPY.loginDescription
                : ADMIN_AUTH_COPY.registerDescription}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[2.5rem] border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl"
          >
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
                <div className="mt-0.5 shrink-0">!</div>
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                      {ADMIN_AUTH_COPY.inviteCodeLabel}
                    </label>
                    <div className="relative">
                      <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        required={!isLogin}
                        placeholder="ADMIN-XXXX-XXXX"
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-3.5 pl-12 pr-4 font-mono text-white placeholder:text-slate-600 transition-all focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                      {ADMIN_AUTH_COPY.displayNameLabel}
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required={!isLogin}
                      placeholder={ADMIN_AUTH_COPY.displayNamePlaceholder}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-white placeholder:text-slate-600 transition-all focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                  {ADMIN_AUTH_COPY.emailLabel}
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@example.com"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 transition-all focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                  {ADMIN_AUTH_COPY.passwordLabel}
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder={ADMIN_AUTH_COPY.passwordPlaceholder}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 transition-all focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-lime-500 to-lime-600 py-4 font-black text-slate-950 shadow-lg shadow-lime-500/20 transition-all hover:from-lime-400 hover:to-lime-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? ADMIN_AUTH_COPY.loginButton : ADMIN_AUTH_COPY.registerButton} <ArrowRight size={20} />
                </>
              )}
            </button>

            {isLogin && (
              <>
                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-800" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">or</span>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-3.5 font-bold text-slate-900 shadow-lg transition-all hover:bg-slate-100"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {ADMIN_AUTH_COPY.googleButton}
                </button>
              </>
            )}
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-sm font-bold text-slate-400 transition-colors hover:text-white"
            >
              {isLogin ? ADMIN_AUTH_COPY.switchToRegister : ADMIN_AUTH_COPY.switchToLogin}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
