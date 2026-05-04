import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Bell, BellOff, Tag, Plus, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface KeywordAlert {
  id: string;
  keyword: string;
}

export const NotificationSettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState<KeywordAlert[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    setLoading(true);
    // 키워드 목록 로드
    const { data: keywordData } = await supabase
      .from('keyword_alerts')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (keywordData) setKeywords(keywordData);

    // 푸시 구독 여부 체크 (현재 기기)
    const { count } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id);
    
    setPushEnabled((count || 0) > 0);
    setLoading(false);
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyword.trim();
    if (!trimmed || !user) return;
    
    if (keywords.length >= 10) {
      alert('キーワードは最大10個まで登録可能です。');
      return;
    }

    if (keywords.some(k => k.keyword === trimmed)) {
      alert('すでに登録済みのキーワードです。');
      return;
    }

    setAdding(true);
    const { data, error } = await supabase
      .from('keyword_alerts')
      .insert({ user_id: user.id, keyword: trimmed })
      .select()
      .single();

    if (error) {
      alert('登録失敗: ' + error.message);
    } else if (data) {
      setKeywords(prev => [data, ...prev]);
      setNewKeyword('');
    }
    setAdding(false);
  };

  const handleRemoveKeyword = async (id: string) => {
    setKeywords(prev => prev.filter(k => k.id !== id));
    await supabase.from('keyword_alerts').delete().eq('id', id);
  };

  const togglePushNotification = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('このブラウザはプッシュ通知に対応していません。');
      return;
    }

    if (pushEnabled) {
      const confirmOff = window.confirm('本当にプッシュ通知をオフにしますか？');
      if (confirmOff) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
            // DB에서 해당 endpoint 정보 삭제
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', subscription.endpoint);
          }
          setPushEnabled(false);
        } catch (e: any) {
          alert('通知の解除に失敗しました: ' + e.message);
        }
      }
    } else {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('通知の権限がブロックされています。ブラウザの設定から通知を許可してください。');
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        
        // VAPID 공개키 동적 임포트
        const { PUBLIC_VAPID_KEY, urlB64ToUint8Array } = await import('../lib/vapid');
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(PUBLIC_VAPID_KEY)
        });

        // 구독 정보를 DB에 저장
        const subJSON = subscription.toJSON();
        
        const { error } = await supabase
          .from('push_subscriptions')
          .insert({
            user_id: user?.id,
            endpoint: subJSON.endpoint,
            p256dh: subJSON.keys?.p256dh,
            auth: subJSON.keys?.auth
          });

        if (error) {
          // 중복 에러 무시 (이미 등록된 기기)
          if (error.code !== '23505') throw error;
        }

        setPushEnabled(true);
        alert('通知が正常に設定されました！');
      } catch (e: any) {
        console.error(e);
        alert('通知の設定に失敗しました: ' + e.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-lime-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 pb-32">
      <header className="pt-8 mb-8">
        <Link to="/me" className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-4 hover:text-lime-600 transition-colors">
          <ArrowLeft size={16} /> マイページに戻る
        </Link>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">通知設定</h1>
        <p className="text-slate-500 font-medium text-sm">プッシュ通知と関心キーワードを管理しましょう。</p>
      </header>

      {/* 푸시 알림 권한 */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${pushEnabled ? 'bg-lime-100 text-lime-600' : 'bg-slate-100 text-slate-400'}`}>
              {pushEnabled ? <Bell size={24} /> : <BellOff size={24} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">アプリプッシュ通知</h2>
              <p className="text-xs font-bold text-slate-500 mt-1">新しいメッセージや通知を受信</p>
            </div>
          </div>
          <button
            onClick={togglePushNotification}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${pushEnabled ? 'bg-lime-500' : 'bg-slate-200'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${pushEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </section>

      {/* 관심 키워드 알림 */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-500 flex items-center justify-center">
            <Tag size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">関心キーワード通知</h2>
            <p className="text-xs font-bold text-slate-500 mt-0.5">キーワードに一致する出品があるとプッシュ通知でお知らせ（最大10件）</p>
          </div>
        </div>

        <form onSubmit={handleAddKeyword} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="例: 体操服, 教科書..."
            className="flex-1 bg-slate-50 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-lime-500 outline-none text-sm font-bold text-slate-700"
            disabled={adding || keywords.length >= 10}
          />
          <button
            type="submit"
            disabled={!newKeyword.trim() || adding || keywords.length >= 10}
            className="w-12 bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-slate-700 disabled:opacity-50 transition-all"
          >
            {adding ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
          </button>
        </form>

        {keywords.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-bold text-sm">登録されたキーワードはありません。</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map(k => (
              <div key={k.id} className="bg-sky-50 text-sky-700 px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold border border-sky-100">
                <span>{k.keyword}</span>
                <button 
                  onClick={() => handleRemoveKeyword(k.id)}
                  className="w-5 h-5 bg-sky-200 rounded-full flex items-center justify-center hover:bg-sky-300 transition-colors"
                >
                  <X size={12} className="text-sky-700" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
