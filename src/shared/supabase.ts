import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';

export function createBrowserSupabaseClient(
  config: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  },
  options?: SupabaseClientOptions<'public'>,
) {
  const authOptions = options?.auth ? options.auth : {};

  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      ...authOptions,
    },
    ...options,
  });
}
