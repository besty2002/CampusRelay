import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, Loader2, Plus, Tag, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { useToast } from '../components/feedback/ToastProvider';
import { logger } from '../lib/logger';

interface KeywordAlert {
  id: string;
  keyword: string;
}

const COPY = {
  back: 'マイページに戻る',
  title: '通知設定',
  description: 'プッシュ通知と関連キーワードの受け取り方を設定できます。',
  pushTitle: 'プッシュ通知',
  pushDescription: '新しいメッセージや取引の更新を受け取れます。',
  keywordsTitle: '関連キーワード通知',
  keywordsDescription: '登録したキーワードを含む出品があったときに通知します。最大10件まで登録できます。',
  keywordPlaceholder: '例: 絵の具、体操服、教科書',
  noKeywords: '登録されているキーワードはまだありません。',
  maxKeywords: 'キーワードは最大10件まで登録できます。',
  duplicateKeyword: 'そのキーワードはすでに登録されています。',
  keywordAddError: 'キーワードの登録に失敗しました',
  keywordRemoveError: 'キーワードの削除に失敗しました',
  pushUnsupported: 'このブラウザはプッシュ通知に対応していません。',
  pushBlocked: '通知の許可がブロックされています。ブラウザ設定を確認してください。',
  pushOnSuccess: '通知を有効にしました',
  pushOffSuccess: '通知をオフにしました',
  pushSetupError: '通知設定に失敗しました',
  pushDisableError: '通知の解除に失敗しました',
  disableTitle: 'プッシュ通知をオフにしますか？',
  disableDescription: 'オフにすると、新しいメッセージや取引更新の通知は届かなくなります。',
  disableConfirm: 'オフにする',
  fallbackError: '時間をおいてもう一度お試しください。',
  closeKeyword: 'キーワードを削除する',
  addKeyword: 'キーワードを追加する',
  enablePush: 'プッシュ通知をオンにする',
  disablePush: 'プッシュ通知をオフにする',
} as const;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

export const NotificationSettingsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState<KeywordAlert[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      void fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    setLoading(true);

    const { data: keywordData } = await supabase
      .from('keyword_alerts')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (keywordData) setKeywords(keywordData);

    const { count } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id);

    setPushEnabled((count || 0) > 0);
    setLoading(false);
  };

  const handleAddKeyword = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = newKeyword.trim();
    if (!trimmed || !user) return;

    if (keywords.length >= 10) {
      showToast({ tone: 'info', title: COPY.maxKeywords });
      return;
    }

    if (keywords.some((keyword) => keyword.keyword === trimmed)) {
      showToast({ tone: 'info', title: COPY.duplicateKeyword });
      return;
    }

    setAdding(true);
    const { data, error } = await supabase
      .from('keyword_alerts')
      .insert({ user_id: user.id, keyword: trimmed })
      .select()
      .single();

    if (error) {
      showToast({
        tone: 'error',
        title: COPY.keywordAddError,
        description: error.message,
      });
    } else if (data) {
      setKeywords((prev) => [data, ...prev]);
      setNewKeyword('');
    }
    setAdding(false);
  };

  const handleRemoveKeyword = async (id: string) => {
    const nextKeywords = keywords.filter((keyword) => keyword.id !== id);
    setKeywords(nextKeywords);

    const { error } = await supabase.from('keyword_alerts').delete().eq('id', id);
    if (error) {
      showToast({
        tone: 'error',
        title: COPY.keywordRemoveError,
        description: error.message,
      });
      void fetchSettings();
    }
  };

  const disablePushNotification = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
      }
      setPushEnabled(false);
      showToast({ tone: 'success', title: COPY.pushOffSuccess });
    } catch (error: unknown) {
      showToast({
        tone: 'error',
        title: COPY.pushDisableError,
        description: getErrorMessage(error, COPY.fallbackError),
      });
    } finally {
      setShowDisableConfirm(false);
    }
  };

  const togglePushNotification = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast({ tone: 'info', title: COPY.pushUnsupported });
      return;
    }

    if (pushEnabled) {
      setShowDisableConfirm(true);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast({ tone: 'info', title: COPY.pushBlocked });
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const { PUBLIC_VAPID_KEY, urlB64ToUint8Array } = await import('../lib/vapid');

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(PUBLIC_VAPID_KEY),
      });

      const subJSON = subscription.toJSON();
      const { error } = await supabase.from('push_subscriptions').insert({
        user_id: user?.id,
        endpoint: subJSON.endpoint,
        p256dh: subJSON.keys?.p256dh,
        auth: subJSON.keys?.auth,
      });

      if (error && error.code !== '23505') {
        throw error;
      }

      setPushEnabled(true);
      showToast({ tone: 'success', title: COPY.pushOnSuccess });
    } catch (error: unknown) {
      logger.error('notificationSettings.pushSubscription', error);
      showToast({
        tone: 'error',
        title: COPY.pushSetupError,
        description: getErrorMessage(error, COPY.fallbackError),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-lime-500" size={32} />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-xl p-4 pb-32">
        <header className="mb-8 pt-8">
          <Link
            to="/me"
            className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-lime-600"
          >
            <ArrowLeft size={16} /> {COPY.back}
          </Link>
          <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-800">{COPY.title}</h1>
          <p className="text-sm font-medium text-slate-500">{COPY.description}</p>
        </header>

        <section className="mb-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  pushEnabled ? 'bg-lime-100 text-lime-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {pushEnabled ? <Bell size={24} /> : <BellOff size={24} />}
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">{COPY.pushTitle}</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">{COPY.pushDescription}</p>
              </div>
            </div>
            <button
              onClick={togglePushNotification}
              aria-label={pushEnabled ? COPY.disablePush : COPY.enablePush}
              title={pushEnabled ? COPY.disablePush : COPY.enablePush}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                pushEnabled ? 'bg-lime-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  pushEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-500">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">{COPY.keywordsTitle}</h2>
              <p className="mt-0.5 text-xs font-bold text-slate-500">{COPY.keywordsDescription}</p>
            </div>
          </div>

          <form onSubmit={handleAddKeyword} className="mb-6 flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(event) => setNewKeyword(event.target.value)}
              placeholder={COPY.keywordPlaceholder}
              className="flex-1 rounded-xl border-none bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-500"
              disabled={adding || keywords.length >= 10}
            />
            <button
              type="submit"
              aria-label={COPY.addKeyword}
              title={COPY.addKeyword}
              disabled={!newKeyword.trim() || adding || keywords.length >= 10}
              className="flex w-12 items-center justify-center rounded-xl bg-slate-800 text-white transition-all hover:bg-slate-700 disabled:opacity-50"
            >
              {adding ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            </button>
          </form>

          {keywords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
              <p className="text-sm font-bold text-slate-400">{COPY.noKeywords}</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <div
                  key={keyword.id}
                  className="flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-700"
                >
                  <span>{keyword.keyword}</span>
                  <button
                    onClick={() => handleRemoveKeyword(keyword.id)}
                    aria-label={COPY.closeKeyword}
                    title={COPY.closeKeyword}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-200 transition-colors hover:bg-sky-300"
                  >
                    <X size={12} className="text-sky-700" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        isOpen={showDisableConfirm}
        title={COPY.disableTitle}
        description={COPY.disableDescription}
        confirmLabel={COPY.disableConfirm}
        cancelLabel="キャンセル"
        onCancel={() => setShowDisableConfirm(false)}
        onConfirm={disablePushNotification}
      />
    </>
  );
};
