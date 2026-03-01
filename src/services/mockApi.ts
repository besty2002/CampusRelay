import type { Post, User, ChatThread, ChatMessage } from '../types';

const MOCK_USER: User = {
  id: 'u1',
  name: '佐藤 健太',
  schoolId: 's1',
  schoolName: '新田学園',
  regionId: 'r1',
  regionName: '東京都',
  role: '両方',
  completedCount: 12,
  rating: 4.9,
  status: 'VERIFIED',
};

const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    title: '【0円】マクロ経済学の教科書',
    description: '昨年の講義で使用しました。少し書き込みがありますが、通読には問題ありません。次に使う方にお譲りします。',
    photos: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400'],
    category: '教科書',
    condition: '目立った傷なし',
    pickupMethod: '1号館ロビー',
    status: '受付中',
    scope: 'SCHOOL',
    mode: 'GIVEAWAY',
    giverId: 'u2',
    giverName: '高橋 美咲',
    schoolId: 's1',
    createdAt: new Date().toISOString(),
    reportCount: 0,
  },
];

// 채팅 데이터 관리 (LocalStorage 기반)
const getStoredThreads = (): ChatThread[] => {
  const stored = localStorage.getItem('chat_threads');
  if (!stored) {
    const initial: ChatThread[] = [
      {
        id: 't1',
        postId: 'p1',
        postTitle: 'マクロ経済学の教科書',
        postImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
        participantId: 'u2',
        participantName: '高橋 美咲',
        lastMessage: 'よろしくお願いします！',
        updatedAt: new Date().toISOString(),
        messages: [
          { id: 'm1', senderId: 'u2', senderName: '高橋 美咲', text: 'こんにちは！この教科書まだありますか？', timestamp: new Date(Date.now() - 100000).toISOString() },
          { id: 'm2', senderId: 'u1', senderName: '佐藤 健太', text: 'はい、まだありますよ。', timestamp: new Date(Date.now() - 50000).toISOString() },
        ]
      }
    ];
    localStorage.setItem('chat_threads', JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
};

export const mockApi = {
  getPosts: async (schoolId: string, _scope: 'SCHOOL' | 'REGION' = 'SCHOOL'): Promise<Post[]> => {
    await new Promise(r => setTimeout(r, 400));
    return MOCK_POSTS.filter(p => p.schoolId === schoolId);
  },
  getPostById: async (id: string): Promise<Post | undefined> => {
    await new Promise(r => setTimeout(r, 200));
    return MOCK_POSTS.find(p => p.id === id);
  },
  getCurrentUser: async (): Promise<User> => {
    return MOCK_USER;
  },
  createPost: async (post: Partial<Post>): Promise<Post> => {
    return { ...MOCK_POSTS[0], ...post, id: Math.random().toString() } as Post;
  },
  // 채팅 API
  getThreads: async (): Promise<ChatThread[]> => {
    await new Promise(r => setTimeout(r, 300));
    return getStoredThreads();
  },
  getThreadById: async (id: string): Promise<ChatThread | undefined> => {
    const threads = getStoredThreads();
    return threads.find(t => t.id === id);
  },
  sendMessage: async (threadId: string, text: string): Promise<ChatMessage> => {
    const threads = getStoredThreads();
    const thread = threads.find(t => t.id === threadId);
    if (!thread) throw new Error('Thread not found');

    const newMessage: ChatMessage = {
      id: Math.random().toString(),
      senderId: MOCK_USER.id,
      senderName: MOCK_USER.name,
      text,
      timestamp: new Date().toISOString(),
    };

    thread.messages.push(newMessage);
    thread.lastMessage = text;
    thread.updatedAt = newMessage.timestamp;

    localStorage.setItem('chat_threads', JSON.stringify(threads));
    return newMessage;
  }
};
