export type PostMode = 'GIVEAWAY' | 'EXCHANGE';
export type PostCategory = 
  | 'Uniform' 
  | 'Textbook' 
  | 'Digital' 
  | 'Life' 
  | 'ArtSport' 
  | 'Other';

export type PostCondition = 'Like New' | 'Good' | 'Used';
export type PostStatus = 'Available' | 'Reserved' | 'Given' | 'Hidden';

export interface Profile {
  id: string;
  display_name: string;
  role: 'user' | 'school_admin' | 'super_admin';
  completed_count: number;
  avg_rating: number;
  rating_count: number;
}

export interface School {
  id: string;
  name_ja: string;
  type: 'elementary' | 'middle' | 'high';
}

export interface PostImage {
  id: string;
  post_id: string;
  storage_path: string;
  sort_order: number;
}

export interface Post {
  id: string;
  school_id: string;
  user_id: string;
  mode: PostMode;
  exchange_wanted?: string;
  title: string;
  description: string;
  category: PostCategory;
  condition: PostCondition;
  status: PostStatus;
  created_at: string;
  profiles: Profile;
  post_images?: PostImage[];
  schools?: School;
  post_requests?: any[];
}

export interface PostRequest {
  id: string;
  post_id: string;
  requester_id: string;
  message: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  profiles: Profile;
  posts?: Post;
}

export interface ChatRoom {
  id: string;
  post_id: string;
  seller_id: string;
  buyer_id: string;
  created_at: string;
  posts: {
    title: string;
    post_images: { storage_path: string }[];
  };
  seller: Profile;
  buyer: Profile;
  last_message?: {
    text: string;
    created_at: string;
  };
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  profiles: {
    display_name: string;
  };
}
