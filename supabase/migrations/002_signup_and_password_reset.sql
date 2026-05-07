-- ═══════════════════════════════════════════════════════════════════════════════
-- LUMOS - FULL MIGRATION: SIGNUP COLUMNS + FORGOT PASSWORD TABLES
-- 
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this ENTIRE file
--   3. Click "Run"
--   4. It's idempotent (safe to re-run)
--
-- THEN IN SUPABASE DASHBOARD:
--   Authentication → URL Configuration → Redirect URLs:
--     http://localhost:8080
--     http://localhost:8080/reset-password
--   Site URL: http://localhost:8080
--
--   Authentication → Providers → Email:
--     Turn OFF "Confirm email" (for dev) OR keep ON and handle confirmation in UI
-- ═══════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: ADD SIGNUP COLUMNS TO CLIENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_tagline TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS full_contact_name TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS brand_feel TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS auth_password_pending BOOLEAN DEFAULT true;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS signup_completed_at TIMESTAMPTZ;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS signup_source TEXT DEFAULT 'web_signup';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS services_needed JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS budget_range TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS timeline TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referral_source TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS project_summary TEXT DEFAULT '';


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: SIGNUP_REQUESTS STAGING TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.signup_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  company_name TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  contact_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  website TEXT DEFAULT '',
  brand_identity TEXT DEFAULT '',
  brand_colors JSONB DEFAULT '[]'::jsonb,
  security_question TEXT DEFAULT '',
  security_answer_hash TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  services_needed JSONB DEFAULT '[]'::jsonb,
  budget_range TEXT DEFAULT '',
  timeline TEXT DEFAULT '',
  referral_source TEXT DEFAULT '',
  project_summary TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: PASSWORD_RESET_REQUESTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  security_question TEXT,
  has_security_question BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- signup_requests: anyone can insert, admin can select
CREATE POLICY IF NOT EXISTS "Anyone can insert signup request" ON public.signup_requests FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Admin can view signup requests" ON public.signup_requests FOR SELECT USING (true);

-- password_reset_requests: anyone can insert + select + update
CREATE POLICY IF NOT EXISTS "Anyone can insert password reset" ON public.password_reset_requests FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can read password reset" ON public.password_reset_requests FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can update password reset" ON public.password_reset_requests FOR UPDATE USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 5: INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_signup_requests_status ON public.signup_requests(status);
CREATE INDEX IF NOT EXISTS idx_signup_requests_email ON public.signup_requests(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_email ON public.password_reset_requests(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON public.password_reset_requests(expires_at);


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 6: ENABLE EMAIL AUTH + DISABLE EMAIL CONFIRMATION (FOR DEV)
-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTE: For production, re-enable email confirmation in:
--   Supabase Dashboard → Authentication → Providers → Email → "Confirm email"
-- ═══════════════════════════════════════════════════════════════════════════════

-- This SQL toggles email confirmation OFF for development convenience:
UPDATE auth.users 
SET confirmed_at = now(), email_confirmed_at = now() 
WHERE confirmed_at IS NULL;

-- -------------------------------------------------------
-- DONE! Now also go to Supabase Dashboard and:
-- 1. Authentication → URL Configuration → Site URL: http://localhost:8080
-- 2. Authentication → URL Configuration → Redirect URLs:
--      http://localhost:8080
--      http://localhost:8080/reset-password
-- 3. Authentication → Providers → Email → Turn OFF "Confirm email" (for dev)
-- -------------------------------------------------------