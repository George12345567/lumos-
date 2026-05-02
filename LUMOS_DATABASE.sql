-- ═══════════════════════════════════════════════════════════════════════════
-- LUMOS DIGITAL ASCENT - DATABASE SCHEMA
-- Version: 3.1 (Clean Reset - Fixed)
-- Created: 2026-05-02
-- Purpose: Cleanly removes old Lumos public schema objects, then recreates the
--          complete database schema, functions, triggers, views, storage bucket,
--          and RLS policies.
-- Notes:
--   1) This script deletes existing Lumos tables/data in public schema.
--   2) Do NOT run this if you need to keep current data.
--   3) Safe to run in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 0: EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: CLEAN RESET - DROP OLD OBJECTS FIRST
-- ═══════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.dashboard_stats CASCADE;
DROP VIEW IF EXISTS public.recent_pricing_requests CASCADE;
DROP VIEW IF EXISTS public.recent_contacts CASCADE;
DROP VIEW IF EXISTS public.monthly_revenue CASCADE;

DROP POLICY IF EXISTS "Public can view client assets" ON storage.objects;
DROP POLICY IF EXISTS "Team can upload client assets" ON storage.objects;
DROP POLICY IF EXISTS "Team can update client assets" ON storage.objects;
DROP POLICY IF EXISTS "Team can delete client assets" ON storage.objects;

DROP TABLE IF EXISTS public.saved_designs CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.pricing_requests CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.discount_codes CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.add_status_history(jsonb, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_final_price(numeric, numeric, text, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.validate_discount_code(text, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.log_audit(text, uuid, public.audit_action_enum, uuid, text, jsonb, jsonb, text, text, text) CASCADE;

DROP TYPE IF EXISTS public.request_type_enum CASCADE;
DROP TYPE IF EXISTS public.request_status_enum CASCADE;
DROP TYPE IF EXISTS public.request_priority_enum CASCADE;
DROP TYPE IF EXISTS public.team_role_enum CASCADE;
DROP TYPE IF EXISTS public.discount_type_enum CASCADE;
DROP TYPE IF EXISTS public.notification_type_enum CASCADE;
DROP TYPE IF EXISTS public.audit_action_enum CASCADE;
DROP TYPE IF EXISTS public.order_status_enum CASCADE;
DROP TYPE IF EXISTS public.payment_status_enum CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: ENUM TYPES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE public.request_type_enum AS ENUM ('package', 'custom');
CREATE TYPE public.request_status_enum AS ENUM ('new', 'reviewing', 'approved', 'converted', 'rejected');
CREATE TYPE public.request_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.team_role_enum AS ENUM ('admin', 'sales', 'designer', 'manager');
CREATE TYPE public.discount_type_enum AS ENUM ('percentage', 'fixed');

CREATE TYPE public.notification_type_enum AS ENUM (
  'pricing_request_new',
  'pricing_request_status_changed',
  'pricing_request_assigned',
  'pricing_request_approved',
  'pricing_request_rejected',
  'pricing_request_converted',
  'pricing_request_follow_up',
  'general'
);

CREATE TYPE public.audit_action_enum AS ENUM (
  'created',
  'updated',
  'deleted',
  'status_changed',
  'assigned',
  'notes_added',
  'converted',
  'reviewed'
);

CREATE TYPE public.order_status_enum AS ENUM (
  'pending',
  'processing',
  'completed',
  'cancelled',
  'refunded'
);

CREATE TYPE public.payment_status_enum AS ENUM (
  'unpaid',
  'partial',
  'paid'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role public.team_role_enum NOT NULL,
  phone TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  notification_preferences JSONB DEFAULT '{"email": true, "whatsapp": true, "in_app": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_members_role ON public.team_members(role);
CREATE INDEX idx_team_members_active ON public.team_members(is_active) WHERE is_active = true;
CREATE INDEX idx_team_members_email ON public.team_members(email) WHERE email IS NOT NULL;

INSERT INTO public.team_members (name, role, phone, email) VALUES
  ('Mariam', 'sales', '+201277636616', 'mariam@lumos.studio'),
  ('Sarah', 'admin', '+201000000001', 'sarah@lumos.studio'),
  ('Nour', 'designer', '+201000000002', 'nour@lumos.studio')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone;

CREATE TABLE public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  description_ar TEXT,
  discount_type public.discount_type_enum NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value >= 0),
  min_order_value NUMERIC(12,2) DEFAULT 0 CHECK (min_order_value >= 0),
  max_discount NUMERIC(12,2) CHECK (max_discount IS NULL OR max_discount >= 0),
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ CHECK (valid_until IS NULL OR valid_until > valid_from),
  usage_limit INT CHECK (usage_limit IS NULL OR usage_limit > 0),
  usage_count INT DEFAULT 0 CHECK (usage_count >= 0),
  applicable_categories TEXT[],
  created_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discount_codes_code ON public.discount_codes(code);
CREATE INDEX idx_discount_codes_active ON public.discount_codes(is_active) WHERE is_active = true;
CREATE INDEX idx_discount_codes_valid ON public.discount_codes(valid_until) WHERE valid_until IS NOT NULL AND is_active = true;

INSERT INTO public.discount_codes (
  code,
  description,
  description_ar,
  discount_type,
  discount_value,
  is_active
) VALUES
  ('WELCOME20', 'Welcome discount 20%', 'خصم ترحيبي 20%', 'percentage', 20, true),
  ('LUMOS10', 'Lumos loyal customer 10%', 'عميل لوموس المميز 10%', 'percentage', 10, true),
  ('SAVE50', 'Fixed 50 EGP off', 'خصم ثابت 50 جنيه', 'fixed', 50, true),
  ('SUMMER25', 'Summer special 25%', 'خصم الصيف 25%', 'percentage', 25, true),
  ('NEWYEAR30', 'New year offer 30%', 'عرض رأس السنة 30%', 'percentage', 30, true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT CHECK (phone IS NULL OR phone ~ '^01[0-9]{9}$'),
  phone_number TEXT CHECK (phone_number IS NULL OR phone_number ~ '^01[0-9]{9}$'),
  company_name TEXT,
  security_question TEXT,
  security_answer TEXT,
  package_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  progress NUMERIC(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  next_steps TEXT,
  package_details JSONB,
  subscription_config JSONB,
  admin_notes TEXT,
  active_offer TEXT,
  active_offer_link TEXT,
  logo_url TEXT,
  avatar_url TEXT,
  cover_gradient TEXT,
  theme_accent TEXT,
  brand_colors TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_username ON public.clients(username);
CREATE INDEX idx_clients_email ON public.clients(email) WHERE email IS NOT NULL;
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_created ON public.clients(created_at DESC);

CREATE TABLE public.pricing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  request_type public.request_type_enum NOT NULL DEFAULT 'package',
  status public.request_status_enum NOT NULL DEFAULT 'new',
  priority public.request_priority_enum DEFAULT 'medium',
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  package_id TEXT,
  package_name TEXT,
  selected_services JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_subtotal NUMERIC(12,2) NOT NULL CHECK (estimated_subtotal >= 0),
  estimated_total NUMERIC(12,2) NOT NULL CHECK (estimated_total >= 0),
  price_currency TEXT NOT NULL DEFAULT 'EGP',
  discount_breakdown JSONB DEFAULT '{"base_discount": 0, "promo_discount": 0, "reward_discount": 0, "total_discount_percent": 0}'::jsonb,
  applied_promo_code TEXT REFERENCES public.discount_codes(code) ON DELETE SET NULL,
  guest_name TEXT,
  guest_phone TEXT CHECK (guest_phone IS NULL OR guest_phone ~ '^01[0-9]{9}$'),
  guest_email TEXT CHECK (guest_email IS NULL OR guest_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  company_name TEXT,
  request_notes TEXT,
  admin_notes TEXT,
  status_history JSONB DEFAULT '[]'::jsonb,
  follow_up_actions JSONB DEFAULT '[]'::jsonb,
  converted_order_id UUID,
  location_url TEXT,
  request_source TEXT DEFAULT 'pricing_modal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_pricing_requests_client ON public.pricing_requests(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_pricing_requests_status ON public.pricing_requests(status);
CREATE INDEX idx_pricing_requests_priority ON public.pricing_requests(priority);
CREATE INDEX idx_pricing_requests_assigned ON public.pricing_requests(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_pricing_requests_created ON public.pricing_requests(created_at DESC);
CREATE INDEX idx_pricing_requests_email ON public.pricing_requests(guest_email) WHERE guest_email IS NOT NULL;
CREATE INDEX idx_pricing_requests_phone ON public.pricing_requests(guest_phone) WHERE guest_phone IS NOT NULL;
CREATE INDEX idx_pricing_requests_composite ON public.pricing_requests(status, priority, created_at DESC);

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone TEXT CHECK (phone IS NULL OR phone ~ '^01[0-9]{9}$'),
  company_name TEXT,
  service_interest TEXT,
  message TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'archived')),
  source TEXT DEFAULT 'website',
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_contacts_email ON public.contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_created ON public.contacts(created_at DESC);
CREATE INDEX idx_contacts_assigned ON public.contacts(assigned_to) WHERE assigned_to IS NOT NULL;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_request_id UUID REFERENCES public.pricing_requests(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_phone TEXT CHECK (guest_phone IS NULL OR guest_phone ~ '^01[0-9]{9}$'),
  guest_email TEXT CHECK (guest_email IS NULL OR guest_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  company_name TEXT,
  order_type TEXT NOT NULL DEFAULT 'pricing_converted',
  package_id TEXT,
  package_name TEXT,
  selected_services JSONB,
  total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
  price_currency TEXT NOT NULL DEFAULT 'EGP',
  discount_amount NUMERIC(12,2) DEFAULT 0 CHECK (discount_amount >= 0),
  status public.order_status_enum DEFAULT 'pending',
  payment_status public.payment_status_enum DEFAULT 'unpaid',
  payment_method TEXT,
  paid_amount NUMERIC(12,2) DEFAULT 0 CHECK (paid_amount >= 0),
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.pricing_requests
  ADD CONSTRAINT fk_pricing_requests_converted_order
  FOREIGN KEY (converted_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_client ON public.orders(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_payment ON public.orders(payment_status);
CREATE INDEX idx_orders_pricing_request ON public.orders(pricing_request_id) WHERE pricing_request_id IS NOT NULL;
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('client', 'team_member')),
  type public.notification_type_enum NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  message TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  action_type TEXT,
  action_id TEXT,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, user_type);
CREATE INDEX idx_notifications_unread ON public.notifications(is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (
    entity_type IN (
      'pricing_request',
      'client',
      'discount_code',
      'team_member',
      'order',
      'contact',
      'saved_design'
    )
  ),
  entity_id UUID NOT NULL,
  changed_by UUID,
  changed_by_type TEXT CHECK (changed_by_type IN ('team_member', 'client', 'system')),
  action public.audit_action_enum NOT NULL,
  old_values JSONB,
  new_values JSONB,
  change_summary TEXT,
  change_summary_ar TEXT,
  ip_address INET,
  user_agent TEXT,
  location_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_changed_by ON public.audit_logs(changed_by) WHERE changed_by IS NOT NULL;
CREATE INDEX idx_audit_action ON public.audit_logs(action);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

CREATE TABLE public.saved_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  service_type TEXT,
  selected_theme TEXT,
  custom_theme JSONB,
  layout_config JSONB,
  content_data JSONB,
  brand_settings JSONB,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  preview_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_designs_client ON public.saved_designs(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_saved_designs_published ON public.saved_designs(is_published) WHERE is_published = true;
CREATE INDEX idx_saved_designs_created ON public.saved_designs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: ROW LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can manage members"
ON public.team_members
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can validate codes"
ON public.discount_codes
FOR SELECT
USING (is_active = true);

CREATE POLICY "Team can manage codes"
ON public.discount_codes
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Team can manage clients"
ON public.clients
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Team can manage pricing requests"
ON public.pricing_requests
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can create requests"
ON public.pricing_requests
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can submit contact form"
ON public.contacts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Team can manage contacts"
ON public.contacts
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Team can manage orders"
ON public.orders
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
USING (true);

CREATE POLICY "Team can manage notifications"
ON public.notifications
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Team can read all audit logs"
ON public.audit_logs
FOR SELECT
USING (true);

CREATE POLICY "Team can create audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Team can manage designs"
ON public.saved_designs
FOR ALL
USING (true)
WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 5: HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.add_status_history(
  p_history JSONB,
  p_old_status TEXT,
  p_new_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  entry JSONB;
BEGIN
  entry := jsonb_build_object(
    'from_status', p_old_status,
    'to_status', p_new_status,
    'changed_at', NOW()::text,
    'note', p_note
  );

  RETURN COALESCE(p_history, '[]'::jsonb) || jsonb_build_array(entry);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.calculate_final_price(
  p_subtotal NUMERIC,
  p_discount_value NUMERIC,
  p_discount_type TEXT,
  p_max_discount NUMERIC DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  final_discount NUMERIC;
BEGIN
  IF p_discount_type = 'percentage' THEN
    final_discount := p_subtotal * (p_discount_value / 100);
  ELSE
    final_discount := p_discount_value;
  END IF;

  IF p_max_discount IS NOT NULL AND final_discount > p_max_discount THEN
    final_discount := p_max_discount;
  END IF;

  RETURN GREATEST(p_subtotal - final_discount, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.validate_discount_code(
  p_code TEXT,
  p_order_value NUMERIC
)
RETURNS TABLE(
  is_valid BOOLEAN,
  discount_type TEXT,
  discount_value NUMERIC,
  max_discount NUMERIC,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN dc.id IS NULL THEN false
      WHEN NOT dc.is_active THEN false
      WHEN dc.valid_until IS NOT NULL AND dc.valid_until < NOW() THEN false
      WHEN dc.usage_limit IS NOT NULL AND dc.usage_count >= dc.usage_limit THEN false
      WHEN p_order_value < dc.min_order_value THEN false
      ELSE true
    END AS is_valid,
    dc.discount_type::TEXT,
    dc.discount_value,
    dc.max_discount,
    CASE
      WHEN dc.id IS NULL THEN 'Code not found'
      WHEN NOT dc.is_active THEN 'Code is inactive'
      WHEN dc.valid_until IS NOT NULL AND dc.valid_until < NOW() THEN 'Code has expired'
      WHEN dc.usage_limit IS NOT NULL AND dc.usage_count >= dc.usage_limit THEN 'Code usage limit reached'
      WHEN p_order_value < dc.min_order_value THEN 'Minimum order value not met'
      ELSE NULL
    END AS error_message
  FROM (SELECT UPPER(TRIM(p_code)) AS code) input_code
  LEFT JOIN public.discount_codes dc ON dc.code = input_code.code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.log_audit(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action public.audit_action_enum,
  p_changed_by UUID DEFAULT NULL,
  p_changed_by_type TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_change_summary TEXT DEFAULT NULL,
  p_change_summary_ar TEXT DEFAULT NULL,
  p_location_url TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    action,
    changed_by,
    changed_by_type,
    old_values,
    new_values,
    change_summary,
    change_summary_ar,
    location_url
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_action,
    p_changed_by,
    p_changed_by_type,
    p_old_values,
    p_new_values,
    p_change_summary,
    p_change_summary_ar,
    p_location_url
  );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 6: TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discount_codes_updated_at
BEFORE UPDATE ON public.discount_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_requests_updated_at
BEFORE UPDATE ON public.pricing_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_designs_updated_at
BEFORE UPDATE ON public.saved_designs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 7: DASHBOARD VIEWS
-- ═══════════════════════════════════════════════════════════════════════════

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
  (SELECT COUNT(*) FROM public.saved_designs) AS total_designs;

CREATE OR REPLACE VIEW public.recent_pricing_requests AS
SELECT
  pr.id,
  pr.guest_name,
  pr.guest_email,
  pr.guest_phone,
  pr.package_name,
  pr.estimated_total,
  pr.price_currency,
  pr.status,
  pr.priority,
  pr.created_at,
  tm.name AS assigned_to_name
FROM public.pricing_requests pr
LEFT JOIN public.team_members tm ON pr.assigned_to = tm.id
ORDER BY pr.created_at DESC
LIMIT 20;

CREATE OR REPLACE VIEW public.recent_contacts AS
SELECT
  c.id,
  c.name,
  c.email,
  c.phone,
  c.company_name,
  c.service_interest,
  c.status,
  c.created_at,
  tm.name AS assigned_to_name
FROM public.contacts c
LEFT JOIN public.team_members tm ON c.assigned_to = tm.id
ORDER BY c.created_at DESC
LIMIT 20;

CREATE OR REPLACE VIEW public.monthly_revenue AS
SELECT
  DATE_TRUNC('month', created_at)::date AS month,
  COUNT(*) AS order_count,
  SUM(total_price) AS total_revenue,
  SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END) AS collected
FROM public.orders
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 8: STORAGE BUCKET + STORAGE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'client-assets',
  'client-assets',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public can view client assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'client-assets');

CREATE POLICY "Team can upload client assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'client-assets' AND auth.role() IN ('authenticated', 'anon'));

CREATE POLICY "Team can update client assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'client-assets')
WITH CHECK (bucket_id = 'client-assets');

CREATE POLICY "Team can delete client assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'client-assets');

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 9: VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  '✓ Database setup complete!' AS status,
  current_database() AS database_name;

SELECT
  'Tables and Views Created:' AS info,
  table_type,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'team_members',
    'discount_codes',
    'clients',
    'pricing_requests',
    'contacts',
    'orders',
    'notifications',
    'audit_logs',
    'saved_designs',
    'dashboard_stats',
    'recent_pricing_requests',
    'recent_contacts',
    'monthly_revenue'
  )
ORDER BY table_type, table_name;

SELECT
  'Enum Types:' AS info,
  typname
FROM pg_type
WHERE typnamespace = (
  SELECT oid
  FROM pg_namespace
  WHERE nspname = 'public'
)
  AND typtype = 'e'
ORDER BY typname;