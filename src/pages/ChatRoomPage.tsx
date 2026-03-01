import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ChatThread, ChatMessage } from '../types';
import { mockApi } from '../services/mockApi';
import { ChevronLeft, Send, Info } from 'lucide-react';

export const ChatRoomPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThread = async () => {
    if (id) {
      const data = await mockApi.getThreadById(id);
      if (data) {
        setThread(data);
        setMessages(data.messages);
      }
    }
  };

  useEffect(() => {
    fetchThread();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !id) return;

    const newMsg = await mockApi.sendMessage(id, inputValue);
    setMessages([...messages, newMsg]);
    setInputValue('');

    // 시뮬레이션: 상대방의 자동 응답 (3초 후)
    if (inputValue.includes('？') || inputValue.includes('?')) {
      setTimeout(async () => {
        const reply = await mockApi.sendMessage(id, '確認しますので、少々お待ちください！');
        setMessages(prev => [...prev, reply]);
      }, 3000);
    }
  };

  if (!thread) return <div className="p-8 text-center text-slate-400">読み込み中...</div>;

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-12rem)] flex flex-col bg-white card-shadow rounded-3xl overflow-hidden mt-4">
      {/* Chat Header */}
      <header className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft size={20}/></button>
          <div className="w-10 h-10 rounded-xl bg-secondary-light flex items-center justify-center font-bold text-secondary-dark">{thread.participantName.charAt(0)}</div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm leading-none">{thread.participantName}</h3>
            <span className="text-[10px] text-primary font-bold">{thread.postTitle}</span>
          </div>
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-600"><Info size={20}/></button>
      </header>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => {
          const isMine = msg.senderId === 'u1';
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                isMine ? 'bg-primary text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
              }`}>
                {msg.text}
                <div className={`text-[9px] mt-1 ${isMine ? 'text-primary-light text-right' : 'text-slate-400 text-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100">
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            placeholder="メッセージを入力..."
            className="flex-1 px-4 py-2.5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary text-sm"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!inputValue.trim()}
            className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};
