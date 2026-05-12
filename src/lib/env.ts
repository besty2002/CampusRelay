const readEnv = (value: string | undefined) => value?.trim() || '';

export const env = {
  supabaseUrl: readEnv(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY),
};

export const missingPublicEnvVars = [
  !env.supabaseUrl ? 'VITE_SUPABASE_URL' : null,
  !env.supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
].filter(Boolean) as string[];

export const isSupabaseConfigured = missingPublicEnvVars.length === 0;
