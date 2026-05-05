-- ═══════════════════════════════════════════════════════════════════════════════
-- LUMOS DIGITAL ASCENT - SIGNUP FIELDS MIGRATION
-- Version: 1.0
-- Created: 2026-05-05
-- Purpose: Adds signup page fields + Step 4 (Project Details) to the clients
--          table, creates signup_requests staging table, and connects everything
--          to the admin dashboard.
--
-- INSTRUCTIONS:
--   1. Run this in Supabase SQL Editor
--   2. This is idempotent (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
--   3. Will backfill existing JSONB data into new columns
--   4. Safe to re-run
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: ADD SIGNUP COLUMNS TO CLIENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

-- A) Promote fields that were packed inside package_details.signup_profile JSONB
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_tagline TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS full_contact_name TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS brand_feel TEXT DEFAULT '';

-- B) Auth / signup tracking
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS auth_password_pending BOOLEAN DEFAULT true;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS signup_completed_at TIMESTAMPTZ;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS signup_source TEXT DEFAULT 'web_signup';

-- C) Step 4: Project Details
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS services_needed JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS budget_range TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS timeline TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referral_source TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS project_summary TEXT DEFAULT '';

-- Add CHECK constraints for Step 4 enums (nullable-safe: empty string = not set)

ALTER TABLE public.clients ADD CONSTRAINT clients_industry_check
  CHECK (industry = '' OR industry IN (
    'restaurant', 'retail', 'factory', 'realestate',
    'healthcare', 'education', 'salon', 'pharmacy', 'other'
  ));

ALTER TABLE public.clients ADD CONSTRAINT clients_budget_range_check
  CHECK (budget_range = '' OR budget_range IN (
    'under_5000', '5000_15000', '15000_30000',
    '30000_50000', 'over_50000'
  ));

ALTER TABLE public.clients ADD CONSTRAINT clients_timeline_check
  CHECK (timeline = '' OR timeline IN (
    'asap', 'within_1_month', 'within_3_months',
    'within_6_months', 'no_deadline'
  ));

ALTER TABLE public.clients ADD CONSTRAINT clients_referral_source_check
  CHECK (referral_source = '' OR referral_source IN (
    'google', 'social_media', 'personal_referral',
    'paid_ad', 'content_blog', 'other'
  ));

ALTER TABLE public.clients ADD CONSTRAINT clients_signup_source_check
  CHECK (signup_source IN (
    'web_signup', 'admin_created', 'pricing_modal', 'contact_form'
  ));

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: UPDATE PHONE CONSTRAINT TO ACCEPT E.164 FORMAT
-- ═══════════════════════════════════════════════════════════════════════════════

-- The original constraint only accepts Egyptian local format (01XXXXXXXXX)
-- The signup form uses E.164 international format (+201001234567)
-- Drop the old constraint and add a new one that accepts both

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_phone_check;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_phone_number_check;

ALTER TABLE public.clients ADD CONSTRAINT clients_phone_check
  CHECK (phone IS NULL OR phone = '' OR phone ~ '^\+[1-9]\d{7,14}$');

ALTER TABLE public.clients ADD CONSTRAINT clients_phone_number_check
  CHECK (phone_number IS NULL OR phone_number = '' OR phone_number ~ '^\+[1-9]\d{7,14}$');

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: BACKFILL EXISTING JSONB DATA INTO NEW COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Migrate package_details.signup_profile fields into dedicated columns
-- Only updates rows where the new column is still empty/default and JSONB has data

UPDATE public.clients
SET
  business_tagline = COALESCE(
    NULLIF(package_details->'signup_profile'->>'business_tagline', ''),
    business_tagline
  ),
  full_contact_name = COALESCE(
    NULLIF(package_details->'signup_profile'->>'full_contact_name', ''),
    full_contact_name
  ),
  website = COALESCE(
    NULLIF(package_details->'signup_profile'->>'website', ''),
    website
  ),
  brand_feel = COALESCE(
    NULLIF(package_details->'signup_profile'->>'brand_feel', ''),
    brand_feel
  ),
  auth_password_pending = COALESCE(
    (package_details->'signup_profile'->>'auth_password_pending')::boolean,
    auth_password_pending
  )
WHERE package_details IS NOT NULL
  AND package_details->'signup_profile' IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: CREATE SIGNUP_REQUESTS STAGING TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

-- This table holds signup submissions BEFORE they become clients.
-- Admin can review, approve, or reject each signup request.
-- On approval, a row is copied into the clients table.

CREATE TABLE IF NOT EXISTS public.signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Step 1: Identity & Credentials
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT,
  avatar_mode TEXT DEFAULT 'preset'
    CHECK (avatar_mode IN ('preset', 'upload', 'generate')),
  avatar_url TEXT,
  avatar_style TEXT,
  avatar_seed TEXT,
  avatar_colors TEXT[],

  -- Step 2: Business & Contact
  company_name TEXT NOT NULL,
  business_tagline TEXT DEFAULT '',
  full_contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  website TEXT DEFAULT '',

  -- Step 3: Brand & Security
  brand_identity TEXT DEFAULT '',
  brand_primary_color TEXT DEFAULT '#00cc66',
  brand_secondary_color TEXT DEFAULT '#00bcd4',
  security_question TEXT,
  security_answer TEXT,
  terms_accepted BOOLEAN DEFAULT false,

  -- Step 4: Project Details
  industry TEXT DEFAULT '' CHECK (industry = '' OR industry IN (
    'restaurant', 'retail', 'factory', 'realestate',
    'healthcare', 'education', 'salon', 'pharmacy', 'other'
  )),
  services_needed JSONB DEFAULT '[]'::jsonb,
  budget_range TEXT DEFAULT '' CHECK (budget_range = '' OR budget_range IN (
    'under_5000', '5000_15000', '15000_30000',
    '30000_50000', 'over_50000'
  )),
  timeline TEXT DEFAULT '' CHECK (timeline = '' OR timeline IN (
    'asap', 'within_1_month', 'within_3_months',
    'within_6_months', 'no_deadline'
  )),
  referral_source TEXT DEFAULT '' CHECK (referral_source = '' OR referral_source IN (
    'google', 'social_media', 'personal_referral',
    'paid_ad', 'content_blog', 'other'
  )),
  project_summary TEXT DEFAULT '',

  -- Admin review
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  converted_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,

  -- Metadata
  signup_source TEXT DEFAULT 'web_signup'
    CHECK (signup_source IN ('web_signup', 'admin_created', 'pricing_modal', 'contact_form')),
  ip_address INET,
  user_agent TEXT,
  location_url TEXT,
  auto_collected_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for signup_requests
CREATE INDEX IF NOT EXISTS idx_signup_requests_status ON public.signup_requests(status);
CREATE INDEX IF NOT EXISTS idx_signup_requests_email ON public.signup_requests(email);
CREATE INDEX IF NOT EXISTS idx_signup_requests_username ON public.signup_requests(username);
CREATE INDEX IF NOT EXISTS idx_signup_requests_created ON public.signup_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_requests_converted ON public.signup_requests(converted_client_id) WHERE converted_client_id IS NOT NULL;

-- RLS for signup_requests
ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can create signup requests"
  ON public.signup_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Team can manage signup requests"
  ON public.signup_requests FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Team can read signup requests"
  ON public.signup_requests FOR SELECT USING (true);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_signup_requests_updated_at
  BEFORE UPDATE ON public.signup_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 5: ADD INDEXES FOR NEW CLIENTS COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_clients_industry ON public.clients(industry) WHERE industry != '';
CREATE INDEX IF NOT EXISTS idx_clients_budget_range ON public.clients(budget_range) WHERE budget_range != '';
CREATE INDEX IF NOT EXISTS idx_clients_signup_source ON public.clients(signup_source);
CREATE INDEX IF NOT EXISTS idx_clients_signup_completed ON public.clients(signup_completed_at) WHERE signup_completed_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 6: UPDATE AUDIT_LOGS ENTITY TYPE CHECK CONSTRAINT
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add 'signup_request' to the allowed entity_type values
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_entity_type_check
  CHECK (entity_type IN (
    'pricing_request', 'client', 'discount_code',
    'team_member', 'order', 'contact', 'saved_design', 'signup_request'
  ));

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 7: UPDATE DASHBOARD STATS VIEW
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM public.pricing_requests) AS total_pricing_requests,
  (SELECT COUNT(*) FROM public.pricing_requests WHERE status = 'new') AS new_pricing_requests,
  (SELECT COUNT(*) FROM public.pricing_requests WHERE status = 'converted') AS converted_requests,
  (SELECT COUNT(*) FROM public.contacts) AS total_contacts,
  (SELECT COUNT(*) FROM public.contacts WHERE status = 'new') AS new_contacts,
  (SELECT COUNT(*) FROM public.orders) AS total_orders,
  (SELECT COUNT(*) FROM public.orders WHERE status = 'pending') AS pending_orders,
  (SELECT COUNT(*) FROM public.orders WHERE status = 'completed') AS completed_orders,
  (SELECT COALESCE(SUM(total_price), 0) FROM public.orders WHERE payment_status = 'paid') AS total_revenue,
  (SELECT COALESCE(AVG(total_price), 0) FROM public.orders WHERE status = 'completed') AS avg_order_value,
  (SELECT COUNT(*) FROM public.notifications WHERE is_read = false) AS unread_notifications,
  (SELECT COUNT(*) FROM public.clients) AS total_clients,
  (SELECT COUNT(*) FROM public.saved_designs) AS total_designs,
  (SELECT COUNT(*) FROM public.signup_requests WHERE status = 'pending') AS pending_signup_requests;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 8: HELPER FUNCTION — APPROVE SIGNUP REQUEST
-- ═══════════════════════════════════════════════════════════════════════════════

-- Call this from admin dashboard or Edge Function when approving a signup request.
-- It copies the signup_request data into the clients table and links them.

CREATE OR REPLACE FUNCTION public.approve_signup_request(p_request_id UUID)
RETURNS UUID AS $$
DECLARE
  v_client_id UUID;
  v_request RECORD;
BEGIN
  -- Fetch the signup request
  SELECT * INTO v_request FROM public.signup_requests WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signup request not found or not pending: %', p_request_id;
  END IF;

  -- Insert into clients table
  INSERT INTO public.clients (
    username,
    email,
    phone,
    company_name,
    security_question,
    security_answer,
    avatar_url,
    brand_colors,
    business_tagline,
    full_contact_name,
    website,
    brand_feel,
    industry,
    services_needed,
    budget_range,
    timeline,
    referral_source,
    project_summary,
    auth_password_pending,
    signup_completed_at,
    signup_source,
    status
  ) VALUES (
    v_request.username,
    v_request.email,
    v_request.phone,
    v_request.company_name,
    v_request.security_question,
    v_request.security_answer,
    v_request.avatar_url,
    ARRAY[v_request.brand_primary_color, v_request.brand_secondary_color],
    v_request.business_tagline,
    v_request.full_contact_name,
    v_request.website,
    v_request.brand_identity,
    v_request.industry,
    v_request.services_needed,
    v_request.budget_range,
    v_request.timeline,
    v_request.referral_source,
    v_request.project_summary,
    true,
    NOW(),
    v_request.signup_source,
    'active'
  ) RETURNING id INTO v_client_id;

  -- Link the signup request to the new client
  UPDATE public.signup_requests
  SET
    status = 'converted',
    converted_client_id = v_client_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Log audit
  PERFORM public.log_audit(
    'client'::text,
    v_client_id,
    'created'::public.audit_action_enum,
    NULL,
    'system'::text,
    NULL,
    jsonb_build_object(
      'username', v_request.username,
      'email', v_request.email,
      'company_name', v_request.company_name,
      'industry', v_request.industry,
      'signup_source', v_request.signup_source
    ),
    'Client created from signup request',
    'تم إنشاء العميل من طلب تسجيل',
    v_request.location_url
  );

  RETURN v_client_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 9: HELPER FUNCTION — REJECT SIGNUP REQUEST
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.reject_signup_request(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE public.signup_requests
  SET
    status = 'rejected',
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signup request not found or not pending: %', p_request_id;
  END IF;

  PERFORM public.log_audit(
    'signup_request'::text,
    p_request_id,
    'deleted'::public.audit_action_enum,
    NULL,
    'system'::text,
    NULL,
    jsonb_build_object('reason', 'rejected_by_admin'),
    'Signup request rejected',
    'تم رفض طلب التسجيل',
    NULL
  );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verify clients table has new columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clients'
  AND column_name IN (
    'business_tagline', 'full_contact_name', 'website', 'brand_feel',
    'auth_password_pending', 'signup_completed_at', 'signup_source',
    'industry', 'services_needed', 'budget_range', 'timeline',
    'referral_source', 'project_summary'
  )
ORDER BY ordinal_position;

-- Verify signup_requests table exists
SELECT '✓ Signup fields migration complete!' AS status,
  current_database() AS database_name;

COMMIT;