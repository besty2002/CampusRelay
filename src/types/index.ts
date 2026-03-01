export type ItemStatus = '受付中' | '予約済み' | '譲渡済み';
export type ItemCategory = '制服' | '教科書' | '学用品' | 'その他';
export type ItemCondition = '未使用に近い' | '目立った傷なし' | '사용감 있음' | '使用感あり';
export type VisibilityScope = 'SCHOOL' | 'REGION';
export type SharingMode = 'GIVEAWAY' | 'EXCHANGE';
export type UserStatus = 'PENDING' | 'VERIFIED' | 'BANNED';

export interface User {
  id: string;
  name: string;
  avatar?: string;
  schoolId: string;
  schoolName: string;
  regionId: string;
  regionName: string;
  role: '譲る' | '受け取る' | '両方';
  completedCount: number;
  rating: number;
  status: UserStatus;
  studentIdPhoto?: string;
}

export interface Post {
  id: string;
  title: string;
  description: string;
  photos: string[];
  category: ItemCategory;
  condition: string;
  pickupMethod: string;
  location?: string;
  status: ItemStatus;
  scope: VisibilityScope;
  mode: SharingMode;
  giverId: string;
  giverName: string;
  schoolId: string;
  createdAt: string;
  exchangeFor?: string;
  reportCount: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface ChatThread {
  id: string;
  postId: string;
  postTitle: string;
  postImage: string;
  participantId: string;
  participantName: string;
  lastMessage?: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface Report {
  id: string;
  targetId: string;
  targetType: 'POST' | 'USER';
  reason: string;
  reporterId: string;
  createdAt: string;
  status: 'PENDING' | 'RESOLVED';
}
