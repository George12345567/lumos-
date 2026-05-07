/**
 * Centralized auth configuration.
 *
 * This module is the single source of truth for:
 *   - Whether Supabase is configured (URL + anon key present)
 *   - The optional master admin email used as a UI gate
 *   - Whether the public profile-preview demo is enabled
 *
 * Real authorization (who can read/write rows) MUST be enforced by Supabase
 * RLS policies and/or Edge Functions. Frontend checks here are UX gates only.
 * See SUPABASE_SECURITY_SETUP.md for the required backend setup.
 */

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const masterAdminEmail = (import.meta.env.VITE_MASTER_ADMIN_EMAIL || '').trim().toLowerCase();
const enableProfilePreview = String(import.meta.env.VITE_ENABLE_PROFILE_PREVIEW || '').toLowerCase() === 'true';

export const authConfig = {
  supabaseUrl,
  supabaseAnonKey,
  masterAdminEmail,
  isProd: !!import.meta.env.PROD,
  isDev: !!import.meta.env.DEV,
  enableProfilePreview,
} as const;

/** True when the Supabase URL + anon key are both present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(authConfig.supabaseUrl && authConfig.supabaseAnonKey);
}

/**
 * Returns a friendly error code when Supabase is not configured, otherwise null.
 * UI should map "auth.not_configured" to a localized message and disable submit.
 */
export function getSupabaseConfigError(): string | null {
  if (isSupabaseConfigured()) return null;
  return 'auth.not_configured';
}

/**
 * UI-only check: does this email match the configured master admin?
 *
 * SECURITY: This is a UX gate, not authorization. Real authorization for admin
 * data MUST be enforced by Supabase RLS using a server-trusted role/claim.
 * If VITE_MASTER_ADMIN_EMAIL is empty, no email matches.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  if (!authConfig.masterAdminEmail) return false;
  return email.trim().toLowerCase() === authConfig.masterAdminEmail;
}
