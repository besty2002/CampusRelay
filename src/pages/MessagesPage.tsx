import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChatThread } from '../types';
import { mockApi } from '../services/mockApi';
import { ChevronRight } from 'lucide-react';

export const MessagesPage = () => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchThreads = async () => {
      const data = await mockApi.getThreads();
      setThreads(data);
      setLoading(false);
    };
    fetchThreads();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400">読み込み中...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">メッセージ</h1>
      
      <div className="bg-white rounded-3xl card-shadow overflow-hidden border border-slate-50">
        {threads.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {threads.map(thread => (
              <Link 
                key={thread.id} 
                to={`/messages/${thread.id}`}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-secondary-light flex items-center justify-center text-secondary-dark font-bold text-xl overflow-hidden">
                    {thread.participantName.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border-2 border-white overflow-hidden shadow-sm">
                    <img src={thread.postImage} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-slate-800 truncate">{thread.participantName}</h3>
                    <span className="text-[10px] text-slate-400">{new Date(thread.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-primary font-bold mb-1 truncate">{thread.postTitle}</p>
                  <p className="text-sm text-slate-500 truncate">{thread.lastMessage}</p>
                </div>

                <ChevronRight size={18} className="text-slate-300" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            まだメッセージはありません
          </div>
        )}
      </div>
    </div>
  );
};
