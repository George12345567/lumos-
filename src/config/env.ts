export const env = {
  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  MASTER_ADMIN_EMAIL: import.meta.env.VITE_MASTER_ADMIN_EMAIL || '',

  // App Mode
  MODE: import.meta.env.MODE as 'development' | 'production',
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,

  // Feature flags
  ENABLE_PROFILE_PREVIEW:
    String(import.meta.env.VITE_ENABLE_PROFILE_PREVIEW || '').toLowerCase() === 'true',
} as const;

export { isSupabaseConfigured, getSupabaseConfigError, isAdminEmail, authConfig } from './auth';
