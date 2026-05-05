/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_SERVICE_KEY: string;
  readonly VITE_MASTER_ADMIN_EMAIL: string;
  readonly VITE_EMAILJS_PUBLIC_KEY: string;
  readonly VITE_EMAILJS_SERVICE_ID: string;
  readonly VITE_EMAILJS_TEMPLATE_ID: string;
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
