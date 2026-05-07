import { createClient } from '@supabase/supabase-js';
import { authConfig, isSupabaseConfigured as isConfigured } from '@/config/auth';

const supabaseUrl = authConfig.supabaseUrl;
const supabaseAnonKey = authConfig.supabaseAnonKey;

function clearExpiredSupabaseTokens() {
  try {
    const now = Date.now() / 1000;
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed?.expires_at && now >= parsed.expires_at) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // localStorage unavailable (SSR / privacy mode) — safe to ignore
  }
}

const NOT_CONFIGURED_ERROR = { message: 'auth.not_configured' };

function makeStubResponse<T>(data: T, error: { message?: string } | null = null) {
  return Promise.resolve({ data, error });
}

function makeStubQuery() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    eq: () => chain,
    neq: () => chain,
    like: () => chain,
    ilike: () => chain,
    in: () => chain,
    is: () => chain,
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    single: () => makeStubResponse(null, NOT_CONFIGURED_ERROR),
    maybeSingle: () => makeStubResponse(null, null),
    then: (cb: (res: { data: unknown; error: unknown }) => void) =>
      cb({ data: [], error: null }),
    promise: () => Promise.resolve({ data: [], error: null }),
  };
  return chain;
}

function makeStubChannel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channel: any = {
    on: () => channel,
    subscribe: () => ({ unsubscribe: () => {} }),
    unsubscribe: () => {},
  };
  return channel;
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? (clearExpiredSupabaseTokens(), createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }))
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: NOT_CONFIGURED_ERROR }),
        signUp: async () => ({ data: { user: null, session: null }, error: NOT_CONFIGURED_ERROR }),
        resetPasswordForEmail: async () => ({ data: {}, error: NOT_CONFIGURED_ERROR }),
        resend: async () => ({ data: {}, error: NOT_CONFIGURED_ERROR }),
        updateUser: async () => ({ data: { user: null }, error: NOT_CONFIGURED_ERROR }),
        getUser: async () => ({ data: { user: null }, error: NOT_CONFIGURED_ERROR }),
      },
      from: (_table: string) => ({
        select: (_columns?: string) => makeStubQuery(),
        insert: (_data: unknown) => ({
          select: () => ({
            single: () => makeStubResponse(null, NOT_CONFIGURED_ERROR),
          }),
        }),
        upsert: (_data: unknown) => ({
          select: () => ({
            single: () => makeStubResponse(null, NOT_CONFIGURED_ERROR),
          }),
        }),
        update: (_data: unknown) => ({
          eq: () => ({
            select: () => ({
              single: () => makeStubResponse(null, NOT_CONFIGURED_ERROR),
            }),
          }),
        }),
        delete: () => ({
          eq: () => makeStubQuery(),
        }),
      }),
      rpc: () => makeStubResponse(null, NOT_CONFIGURED_ERROR),
      storage: {
        from: (_bucket: string) => ({
          upload: async () => ({ data: null, error: NOT_CONFIGURED_ERROR }),
          getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } }),
        }),
      },
      channel: (_name: string) => makeStubChannel(),
      removeChannel: (_channel: unknown) => {},
    };

export const isSupabaseConfigured = isConfigured;
export { getSupabaseConfigError } from '@/config/auth';

if (!isSupabaseConfigured() && authConfig.isProd) {
  console.error(
    '[Lumos] Supabase is NOT configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before deploying. ' +
      'Auth, signup, and admin features will be disabled.',
  );
}
