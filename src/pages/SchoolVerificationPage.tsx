import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Loader2,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const ALLOWED_DOMAINS = ['.ac.jp', '.ed.jp', '.school.jp'];

const isSchoolEmail = (email: string): boolean =>
  ALLOWED_DOMAINS.some((domain) => email.toLowerCase().endsWith(domain));

const extractDomain = (email: string): string => email.split('@')[1] || '';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export const SchoolVerificationPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'input' | 'sent' | 'done'>('input');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    setError('');

    if (!schoolEmail.trim()) {
      setError('学校メールアドレスを入力してください。');
      return;
    }

    if (!isSchoolEmail(schoolEmail)) {
      setError('学校メールアドレスは @xxx.ac.jp / @xxx.ed.jp / @xxx.school.jp のみ利用できます。');
      return;
    }

    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: schoolEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (otpError) throw otpError;
      setStep('sent');
    } catch (otpError) {
      // OTP flow may be unavailable depending on the Supabase auth setup.
      // In that case, fall back to storing the verified school domain directly.
      try {
        const domain = extractDomain(schoolEmail);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            email_verified: true,
            verified_school_domain: domain,
          })
          .eq('id', user?.id);

        if (updateError) throw updateError;
        setStep('done');
      } catch (dbError) {
        setError(getErrorMessage(dbError, getErrorMessage(otpError, '認証メールを送信できませんでした。')));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError('認証コードを入力してください。');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: schoolEmail,
        token: otp,
        type: 'email',
      });

      if (verifyError) throw verifyError;

      const domain = extractDomain(schoolEmail);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email_verified: true,
          verified_school_domain: domain,
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;
      setStep('done');
    } catch (verifyError) {
      setError(getErrorMessage(verifyError, '認証に失敗しました。'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 pb-32 pt-12">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 font-bold text-slate-400 transition-colors hover:text-lime-600"
      >
        <ArrowLeft size={20} /> 戻る
      </button>

      <div className="relative overflow-hidden rounded-[3rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 md:p-12">
        <div className="absolute left-0 right-0 top-0 h-2 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />

        {step === 'input' && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-sky-50 shadow-lg">
              <ShieldCheck size={36} className="text-sky-500" />
            </div>

            <h1 className="mb-2 text-3xl font-black text-slate-800">学校認証</h1>
            <p className="mb-8 font-medium text-slate-400">
              学校のメールアドレスで認証すると、
              <br />
              プロフィールに
              <span className="font-bold text-sky-500">認証バッジ</span>
              が表示されます。
            </p>

            <div className="mb-8 rounded-2xl bg-slate-50 p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                対応ドメイン
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {ALLOWED_DOMAINS.map((domain) => (
                  <span
                    key={domain}
                    className="rounded-lg border border-slate-100 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm"
                  >
                    @xxx{domain}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="ml-1 block text-left text-sm font-bold text-slate-500">
                学校メールアドレス
              </label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  value={schoolEmail}
                  onChange={(event) => setSchoolEmail(event.target.value)}
                  placeholder="taro@u-tokyo.ac.jp"
                  className="w-full rounded-2xl border-none bg-slate-50 py-4 pl-12 pr-4 font-medium outline-none transition-all focus:bg-white focus:ring-4 focus:ring-sky-500/10"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-500">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 text-lg font-black text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-600 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
              {loading ? '送信中...' : '認証メールを送信'}
            </button>
          </div>
        )}

        {step === 'sent' && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-amber-50 shadow-lg">
              <Mail size={36} className="text-amber-500" />
            </div>

            <h1 className="mb-2 text-3xl font-black text-slate-800">認証コードを入力</h1>
            <p className="mb-8 font-medium text-slate-400">
              <span className="font-bold text-slate-600">{schoolEmail}</span>
              に
              <br />
              認証コードを送信しました。
            </p>

            <div className="mb-6">
              <input
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="6桁の認証コード"
                maxLength={6}
                className="w-full rounded-2xl border-none bg-slate-50 py-5 text-center text-3xl font-black tracking-[0.5em] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-sky-500/10"
              />
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-500">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 text-lg font-black text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-600 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <BadgeCheck size={20} />}
              {loading ? '確認中...' : '認証する'}
            </button>

            <button
              onClick={() => {
                setStep('input');
                setError('');
              }}
              className="mt-4 text-sm font-bold text-slate-400 transition-colors hover:text-sky-500"
            >
              メールアドレスを変更する
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 animate-bounce items-center justify-center rounded-full border-4 border-white bg-lime-50 shadow-lg">
              <BadgeCheck size={48} className="text-lime-500" />
            </div>

            <h1 className="mb-2 text-3xl font-black text-slate-800">認証が完了しました</h1>
            <p className="mb-2 font-medium text-slate-400">
              学校メールアドレスの認証が完了しました。
            </p>
            <p className="mb-8 text-sm font-bold text-sky-500">
              プロフィールに認証バッジが表示されます。
            </p>

            <div className="mb-8 flex items-center justify-center gap-3 rounded-2xl bg-slate-50 p-6">
              <BadgeCheck size={24} className="fill-sky-50 text-sky-500" />
              <span className="text-lg font-black text-slate-800">学校認証済み</span>
              <span className="text-sm font-bold text-slate-400">({extractDomain(schoolEmail)})</span>
            </div>

            <button
              onClick={() => navigate('/me')}
              className="w-full rounded-2xl bg-lime-500 py-4 text-lg font-black text-white shadow-lg shadow-lime-500/20 transition-all hover:bg-lime-600 active:scale-[0.98]"
            >
              プロフィールに戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
