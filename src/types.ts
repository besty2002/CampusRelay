export type PostMode = 'GIVEAWAY' | 'EXCHANGE';
export type PostCategory = 'Uniform' | 'Textbook' | 'Supplies' | 'Other';
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
}

export interface PostRequest {
  id: string;
  post_id: string;
  requester_id: string;
  message: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  profiles: Profile;
}
