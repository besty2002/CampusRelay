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
  avatar_url?: string;
  role: 'user' | 'school_admin' | 'super_admin';
  completed_count: number;
  avg_rating: number;
  rating_count: number;
  manner_temp: number;
  email_verified: boolean;
  verified_school_domain?: string;
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
  item_size?: string;
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
  last_message_text?: string;
  last_message_at?: string;
  unread_count_seller?: number;
  unread_count_buyer?: number;
  posts: {
    title: string;
    status: PostStatus;
    post_images: { storage_path: string }[];
  };
  seller: Profile;
  buyer: Profile;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  text: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
  profiles: {
    display_name: string;
  };
}

export interface Review {
  id: string;
  post_id: string;
  from_user_id: string;
  to_user_id: string;
  rating: number;
  comment: string;
  manner_tags: string[];
  created_at: string;
  from_profiles?: { display_name: string };
}

export const MANNER_TAGS_POSITIVE = [
  '時間を守る',
  '丁寧な対応',
  '返信が早い',
  '商品が綺麗',
  '説明通り',
  'また取引したい',
] as const;

export const MANNER_TAGS_NEGATIVE = [
  '時間に遅れた',
  '返信が遅い',
  '説明と違った',
] as const;
