export type PostMode = 'GIVEAWAY' | 'EXCHANGE';
export type PostCategory = 'Uniform' | 'Textbook' | 'Supplies' | 'Other';
export type PostCondition = 'Like New' | 'Good' | 'Used';
export type PostStatus = 'Available' | 'Reserved' | 'Given';

export interface Profile {
  id: string;
  display_name: string;
  completed_count: number;
}

export interface School {
  id: string;
  name_ja: string;
  type: 'elementary' | 'middle' | 'high';
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
