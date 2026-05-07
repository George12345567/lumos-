/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // VITE_SUPABASE_SERVICE_KEY intentionally NOT declared. The Supabase
  // service-role key bypasses RLS and must NEVER be shipped to the
  // browser. Anything VITE_*-prefixed is inlined into the bundle.
  readonly VITE_MASTER_ADMIN_EMAIL: string;
  readonly VITE_ENABLE_PROFILE_PREVIEW?: string;
  readonly VITE_AI_API_KEY: string;
  readonly VITE_AI_API_ENDPOINT: string;
  readonly VITE_AI_MODEL: string;
  readonly VITE_AI_FALLBACK_KEY: string;
  readonly VITE_AI_FALLBACK_ENDPOINT: string;
  readonly VITE_AI_FALLBACK_MODEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
