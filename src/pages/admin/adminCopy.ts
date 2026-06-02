import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Users,
  AlertTriangle,
  FileText,
  MessageSquare,
  ScrollText,
  KeyRound,
  Megaphone,
} from 'lucide-react';

export type AdminRole = 'school_admin' | 'super_admin';

export type AdminTab = {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: readonly AdminRole[];
};

export const ADMIN_TABS: readonly AdminTab[] = [
  { path: '/admin', label: '概要', icon: BarChart3, roles: ['school_admin', 'super_admin'] },
  { path: '/admin/users', label: 'ユーザー', icon: Users, roles: ['super_admin'] },
  { path: '/admin/reports', label: '通報', icon: AlertTriangle, roles: ['school_admin', 'super_admin'] },
  { path: '/admin/posts', label: '投稿管理', icon: FileText, roles: ['school_admin', 'super_admin'] },
  { path: '/admin/comments', label: 'コメント', icon: MessageSquare, roles: ['school_admin', 'super_admin'] },
  { path: '/admin/announcements', label: 'お知らせ', icon: Megaphone, roles: ['super_admin'] },
  { path: '/admin/audit', label: '監査ログ', icon: ScrollText, roles: ['super_admin'] },
  { path: '/admin/invites', label: '招待コード', icon: KeyRound, roles: ['super_admin'] },
];

export const ADMIN_AUTH_COPY = {
  loginTitle: '管理者ログイン',
  registerTitle: '管理者アカウント登録',
  loginDescription: '権限のあるアカウントでログインしてください。',
  registerDescription: '発行済みの招待コードを入力して管理者アカウントを有効化します。',
  homeLink: 'ホームに戻る',
  inviteCodeLabel: '招待コード',
  displayNameLabel: '表示名',
  emailLabel: 'メールアドレス',
  passwordLabel: 'パスワード',
  displayNamePlaceholder: '表示名を入力',
  passwordPlaceholder: '6文字以上',
  loginButton: 'ログイン',
  registerButton: 'アカウントを登録',
  googleButton: 'Googleでログイン',
  switchToRegister: '招待コードを持っていますか？ 新規登録へ',
  switchToLogin: 'すでに登録済みですか？ ログインへ',
  googleError: 'Googleログインに失敗しました。',
  noPermissionError: '管理者権限がありません。一般ユーザー向けページからログインしてください。',
  inviteRequiredError: '招待コードを入力してください。',
  displayNameRequiredError: '表示名を入力してください。',
  redeemErrorPrefix: 'アカウントの登録に失敗しました。招待コードを確認してください:',
  registerSuccessTitle: '管理者アカウントを登録しました',
  registerSuccessDescription: 'このまま管理画面へ移動します。',
  genericAuthError: '管理者ログインに失敗しました。',
} as const;
