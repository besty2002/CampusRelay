import type { Post } from '../types';
import { MapPin, MessageCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const Badge = ({ children, color }: { children: React.ReactNode, color: string }) => (
  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${color}`}>
    {children}
  </span>
);

export const ItemCard = ({ post }: { post: Post }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case '受付中': return 'bg-primary-light text-primary-dark';
      case '予約済み': return 'bg-orange-100 text-orange-600';
      case '譲渡済み': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100';
    }
  };

  return (
    <Link to={`/post/${post.id}`} className="block group">
      <div className="bg-white rounded-2xl overflow-hidden card-shadow h-full border border-slate-50">
        <div className="relative aspect-square overflow-hidden">
          <img 
            src={post.photos[0]} 
            alt={post.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge color={getStatusColor(post.status)}>
              {post.status}
            </Badge>
            {post.mode === 'EXCHANGE' && (
              <Badge color="bg-accent-pastel text-yellow-700 flex items-center gap-1">
                <RefreshCw size={10} /> 交換
              </Badge>
            )}
          </div>
        </div>
        
        <div className="p-4">
          <div className="text-[10px] text-primary font-bold mb-1 uppercase tracking-wider">
            {post.category}
          </div>
          <h3 className="font-bold text-slate-800 mb-2 line-clamp-1 group-hover:text-primary transition-colors text-sm">
            {post.title}
          </h3>
          
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <MapPin size={12} className="text-slate-400" />
            <span className="truncate">{post.pickupMethod}</span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-secondary-light flex items-center justify-center text-[8px] font-bold text-secondary-dark">
                {post.giverName.charAt(0)}
              </div>
              <span className="text-[10px] font-medium text-slate-600">{post.giverName}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
               <MessageCircle size={10} />
               <span>リクエスト</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
