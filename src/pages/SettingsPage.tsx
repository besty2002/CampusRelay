import { ArrowLeft, Bell, ChevronRight, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const SETTINGS_ITEMS = [
  {
    icon: Bell,
    label: '通知・キーワード設定',
    description: 'プッシュ通知とキーワード通知を管理',
    to: '/settings/notifications',
  },
  {
    icon: ShieldCheck,
    label: '学校認証',
    description: '学校メール認証の確認と更新',
    to: '/verify',
  },
] as const;

export const SettingsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-xl mx-auto p-4 pb-32">
      <header className="pt-8 mb-8">
        <Link to="/me" className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-4 hover:text-lime-600 transition-colors">
          <ArrowLeft size={16} /> マイページに戻る
        </Link>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">設定</h1>
        <p className="text-slate-500 font-medium text-sm">通知、認証、利用状況をまとめて確認します。</p>
      </header>

      <div className="grid gap-3">
        {SETTINGS_ITEMS.map(({ icon: Icon, label, description, to }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="w-full text-left bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-lime-100 transition-all group"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center group-hover:bg-lime-50 group-hover:text-lime-600 transition-colors shrink-0">
                  <Icon size={22} />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-800">{label}</p>
                  <p className="text-sm font-medium text-slate-400 mt-1">{description}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-lime-500 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
