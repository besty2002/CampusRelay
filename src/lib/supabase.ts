import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from './env';

export const supabase = createClient(
  isSupabaseConfigured ? env.supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? env.supabaseAnonKey : 'placeholder-anon-key',
);
