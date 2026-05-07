-- ═══════════════════════════════════════════════════════════════════════════════
-- 004_fix_rls_policies.sql
-- Fix insecure RLS policies on signup_requests and password_reset_requests.
-- Previously: anyone could SELECT, INSERT, UPDATE all rows including password hashes.
-- Now: only admins can read; anonymous can INSERT only (not read/update).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── signup_requests: Drop old permissive policies ────────────────────────────

DROP POLICY IF EXISTS "Anyone can insert signup request" ON public.signup_requests;
DROP POLICY IF EXISTS "Admin can view signup requests" ON public.signup_requests;

CREATE POLICY "Anyone can insert signup request" ON public.signup_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view signup requests" ON public.signup_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.email = current_setting('request.jwt.claims', true)::jsonb->>'email'
      AND c.role = 'admin'
    )
  );

-- ─── password_reset_requests: Drop old permissive policies ────────────────────

DROP POLICY IF EXISTS "Anyone can insert password reset" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Anyone can read password reset" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Anyone can update password reset" ON public.password_reset_requests;

CREATE POLICY "Anyone can insert password reset request" ON public.password_reset_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view password reset requests" ON public.password_reset_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.email = current_setting('request.jwt.claims', true)::jsonb->>'email'
      AND c.role = 'admin'
    )
  );

-- No UPDATE policy — password reset requests should be marked used via a secure
-- server-side function, not directly by anonymous clients.

-- ─── Add index on password_reset_requests.client_id ──────────────────────────

CREATE INDEX IF NOT EXISTS idx_password_reset_client_id ON public.password_reset_requests(client_id);