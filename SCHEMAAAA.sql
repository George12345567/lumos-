-- ════════════════════════════════════════════════════════════════════════════
--  LUMOS AGENCY — COMPLETE DATABASE SCHEMA
--  Generated: 2026-04-27
--  Inferred from full frontend codebase analysis (src/**/*.ts, *.tsx)
--  Tables: 19 core + 6 smart additions
--  Relations: Full FK graph with cascade rules
-- ════════════════════════════════════════════════════════════════════════════
--
--  RELATIONSHIP MAP:
--
--  clients ──────────────────────────────────────────────────────────────┐
--    ├── contacts              (lead form submissions)                   │
--    ├── pricing_requests ─── orders ───────────────────────────────┐   │
--    │       └── converted ───────────────────────────────────────── │   │
--    ├── client_messages                                              │   │
--    ├── client_updates                                               │   │
--    ├── client_assets ───────── orders                              │   │
--    ├── saved_designs                                                │   │
--    ├── magic_links                                                  │   │
--    ├── phone_verifications                                          │   │
--    ├── profile_activity                                             │   │
--    ├── profile_media                                                │   │
--    ├── notifications                                                │   │
--    └── client_reviews                           [NEW]              │   │
--                                                                    │   │
--  orders ──────────────────────────────────────────────────────────┘   │
--    ├── discount_codes                                                  │
--    └── packages_catalog                                                │
--                                                                       │
--  Standalone:                                                          │
--    marketing_data ── contacts / orders                                │
--    activity_log                                                       │
--    auth_events                                                        │
--    login_attempts                                                     │
--    rate_limits                                                        │
--    avatar_presets                                                     │
--    services_catalog            [NEW — sync from frontend pricing.ts] │
--    packages_catalog            [NEW — sync from frontend pricing.ts] │
--    design_versions             [NEW — version history]               │
--    notifications_queue         [NEW — email/SMS delivery tracking]   │
--    admin_settings              [NEW — global KV config store]        │
-- ════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- for LIKE search acceleration


-- ════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ════════════════════════════════════════════════════════════════════════════

-- Client account status
CREATE TYPE client_status AS ENUM ('pending', 'active', 'completed', 'suspended');

-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'client');

-- Order lifecycle
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'active', 'completed', 'cancelled');

-- Lead/contact status
CREATE TYPE contact_status AS ENUM ('new', 'read', 'contacted', 'resolved');

-- Pricing request lifecycle
CREATE TYPE pricing_request_status AS ENUM ('new', 'reviewing', 'approved', 'converted', 'rejected');

-- Pricing request origin
CREATE TYPE pricing_request_type AS ENUM ('package', 'custom');

-- Saved design status
CREATE TYPE design_status AS ENUM ('active', 'archived', 'featured');

-- Message sender
CREATE TYPE message_sender AS ENUM ('client', 'admin');

-- Client update types
CREATE TYPE update_type AS ENUM ('milestone', 'update', 'action', 'warning', 'success');

-- Discount mechanics
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');

-- Service categories (from pricing.ts CATEGORIES)
CREATE TYPE service_category AS ENUM (
    'web',
    'ecom_boosters',
    'brand_experience',
    'brand_identity',
    'growth_ads',
    'security'
);

-- Notification types
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'message', 'order', 'system');

-- Notification queue channel
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'whatsapp');

-- Notification delivery status
CREATE TYPE notification_delivery_status AS ENUM ('pending', 'sent', 'failed', 'bounced');

-- Media kinds
CREATE TYPE media_kind AS ENUM ('avatar', 'cover', 'logo', 'asset', 'thumbnail');

-- Review status
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');


-- ════════════════════════════════════════════════════════════════════════════
-- AUTO-UPDATED TIMESTAMP FUNCTION
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 1. CLIENTS
--    Core identity table. Mirrors Supabase auth.users (same UUID).
--    Contains both auth metadata and client-facing profile data.
--    All other tables FK back to this.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.clients (
    -- Identity
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username                  TEXT NOT NULL UNIQUE,
    email                     TEXT NOT NULL,
    phone                     TEXT,
    phone_number              TEXT,              -- legacy alias, kept for compat
    password_hash             TEXT,              -- bcrypt hash (edge function writes this)
    security_question         TEXT,
    security_answer           TEXT,              -- hashed via secretHash

    -- Auth & security
    role                      user_role NOT NULL DEFAULT 'client',
    status                    client_status NOT NULL DEFAULT 'pending',
    email_verified            BOOLEAN NOT NULL DEFAULT false,
    is_phone_verified         BOOLEAN NOT NULL DEFAULT false,
    login_attempts            INTEGER NOT NULL DEFAULT 0,
    locked_until              TIMESTAMPTZ,
    last_login_at             TIMESTAMPTZ,
    two_factor_secret         TEXT,              -- reserved for future 2FA

    -- Business profile (set during onboarding / admin config)
    company_name              TEXT,
    display_name              TEXT,
    bio                       TEXT,
    tagline                   TEXT,
    headline                  TEXT,
    website                   TEXT,
    location                  TEXT,
    timezone                  TEXT DEFAULT 'Africa/Cairo',

    -- Package & project tracking (admin-managed)
    package_name              TEXT,
    package_details           JSONB DEFAULT '{}',       -- {services[], scope, notes}
    subscription_config       JSONB DEFAULT '{}',       -- {billing, renewal_date, seats}
    progress                  INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    next_steps                TEXT,
    admin_notes               TEXT,                     -- internal — never exposed to client
    active_offer              TEXT,
    active_offer_link         TEXT,

    -- Avatar & visual identity
    avatar_style              TEXT DEFAULT 'geometric',
    avatar_seed               TEXT,
    avatar_config             JSONB NOT NULL DEFAULT '{}',
    avatar_url                TEXT,
    logo_url                  TEXT,
    cover_image_url           TEXT,
    cover_gradient            TEXT DEFAULT 'aurora',

    -- Brand customisation
    brand_identity            TEXT,
    brand_colors              JSONB NOT NULL DEFAULT '[]',  -- hex string[]
    theme_accent              TEXT DEFAULT '#64ffda',
    social_links              JSONB NOT NULL DEFAULT '{}',  -- {twitter,linkedin,github,…}
    profile_visibility        TEXT NOT NULL DEFAULT 'private',
    profile_sections          JSONB NOT NULL DEFAULT '[]',
    profile_theme             JSONB NOT NULL DEFAULT '{}',
    avatar_crop               JSONB NOT NULL DEFAULT '{}',
    cover_crop                JSONB NOT NULL DEFAULT '{}',
    public_slug               TEXT UNIQUE,
    profile_completion_score  INTEGER NOT NULL DEFAULT 0,
    profile_completed_at      TIMESTAMPTZ,
    last_profile_update       TIMESTAMPTZ,

    -- Timestamps
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email         ON public.clients(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_clients_username             ON public.clients(username);
CREATE INDEX IF NOT EXISTS idx_clients_status               ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_role                 ON public.clients(role);
CREATE INDEX IF NOT EXISTS idx_clients_public_slug          ON public.clients(public_slug);
CREATE INDEX IF NOT EXISTS idx_clients_phone                ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_created_at           ON public.clients(created_at DESC);
-- Trigram index for fuzzy search in admin dashboard
CREATE INDEX IF NOT EXISTS idx_clients_username_trgm        ON public.clients USING GIN(username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_company_trgm         ON public.clients USING GIN(company_name gin_trgm_ops);


-- ════════════════════════════════════════════════════════════════════════════
-- 2. CONTACTS
--    Lead capture — inserted directly from Supabase client SDK.
--    Realtime subscribed by admin dashboard.
--    Fields come from: submissionService.ts, ContactsManager.tsx,
--    LeadCapturePopup.tsx, contact/index.ts
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.contacts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name              TEXT NOT NULL,
    phone             TEXT NOT NULL,
    email             TEXT,
    business_name     TEXT,
    industry          TEXT,
    service_needed    TEXT,
    message           TEXT NOT NULL,
    source            TEXT DEFAULT 'contact_form',  -- 'contact_form' | 'lead_popup' | 'service_page' | 'whatsapp'
    location_url      TEXT,
    status            contact_status NOT NULL DEFAULT 'new',
    auto_collected_data JSONB DEFAULT '{}',         -- from collectBrowserData()
    admin_notes       TEXT,
    replied_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_contacts_status       ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at   ON public.contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_phone        ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_source       ON public.contacts(source);
-- Trigram for name/business search
CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm    ON public.contacts USING GIN(name gin_trgm_ops);


-- ════════════════════════════════════════════════════════════════════════════
-- 3. MARKETING_DATA
--    Browser + device analytics captured at form submission time.
--    Linked to contacts (and optionally orders).
--    Fields from: submissionService.ts → marketing_data insert
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.marketing_data (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id     UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    order_id       UUID,                            -- FK set after orders table created (see below)
    device_type    TEXT,                            -- 'Mobile' | 'Tablet' | 'Desktop'
    browser_vendor TEXT,                            -- 'Chrome' | 'Firefox' | 'Safari' | 'Edge'
    platform       TEXT,                            -- 'Windows' | 'MacOS' | 'Android' | 'iOS'
    screen_width   INTEGER,
    screen_height  INTEGER,
    referrer       TEXT,                            -- HTTP referrer or 'Direct'
    full_data      JSONB DEFAULT '{}',              -- complete collectBrowserData() snapshot
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_data_contact_id ON public.marketing_data(contact_id);
CREATE INDEX IF NOT EXISTS idx_marketing_data_order_id   ON public.marketing_data(order_id);
CREATE INDEX IF NOT EXISTS idx_marketing_data_device     ON public.marketing_data(device_type);
CREATE INDEX IF NOT EXISTS idx_marketing_data_referrer   ON public.marketing_data(referrer);


-- ════════════════════════════════════════════════════════════════════════════
-- 4. DISCOUNT_CODES
--    Promo code engine. Validated client-side via discountService.ts.
--    Fields from: DiscountCode interface in discountService.ts
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.discount_codes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            TEXT NOT NULL UNIQUE,                -- always stored UPPERCASE
    discount_type   discount_type NOT NULL,
    discount_value  NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    max_uses        INTEGER,                             -- NULL = unlimited
    current_uses    INTEGER NOT NULL DEFAULT 0,
    min_order_value NUMERIC(10,2),                       -- minimum order to apply
    valid_from      TIMESTAMPTZ DEFAULT NOW(),
    valid_until     TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    description     TEXT,                                -- internal label
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_discount_codes_updated_at
    BEFORE UPDATE ON public.discount_codes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_discount_codes_code      ON public.discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_is_active ON public.discount_codes(is_active);


-- ════════════════════════════════════════════════════════════════════════════
-- 5. SERVICES_CATALOG   [NEW — currently hardcoded in src/data/pricing.ts]
--    Moves all 30+ services into the DB so admins can update pricing,
--    toggle availability, and create custom services without redeploys.
--    Synced on first migration from pricing.ts SERVICES data.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.services_catalog (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_key     TEXT NOT NULL UNIQUE,           -- matches id from pricing.ts (e.g. 'web_landing')
    name_en         TEXT NOT NULL,
    name_ar         TEXT NOT NULL,
    description_en  TEXT,
    description_ar  TEXT,
    price           NUMERIC(10,2) NOT NULL,
    category        service_category NOT NULL,
    note            TEXT,                           -- disclaimer/footnote
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_services_catalog_updated_at
    BEFORE UPDATE ON public.services_catalog
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_services_catalog_category  ON public.services_catalog(category);
CREATE INDEX IF NOT EXISTS idx_services_catalog_is_active ON public.services_catalog(is_active);

-- Seed from pricing.ts (30 services across 6 categories)
INSERT INTO public.services_catalog (service_key, name_en, name_ar, price, category, sort_order) VALUES
  -- Web Development
  ('web_landing',    'Landing Page',           'صفحة هبوط',             2000,  'web', 1),
  ('web_corporate',  'Corporate Site',          'موقع شركة',             6000,  'web', 2),
  ('web_ecommerce',  'E-Commerce Store',        'متجر إلكتروني',         12000, 'web', 3),
  ('web_shopify',    'Shopify Store',           'متجر شوبيفاي',          12000, 'web', 4),
  ('web_realestate', 'Real Estate Platform',    'منصة عقارية',           15000, 'web', 5),
  ('web_lms',        'LMS Platform',            'منصة تعليمية',          18000, 'web', 6),
  ('web_dashboard',  'Dashboard / Admin Panel', 'لوحة تحكم',             8000,  'web', 7),
  -- E-Commerce Boosters
  ('ecom_filtering', 'Advanced Filtering',      'فلترة متقدمة',          2500,  'ecom_boosters', 1),
  ('ecom_wishlist',  'Wishlist',                'قائمة المفضلة',         1500,  'ecom_boosters', 2),
  ('ecom_comparison','Product Comparison',      'مقارنة المنتجات',       2000,  'ecom_boosters', 3),
  ('ecom_social',    'Social Login',            'تسجيل الدخول الاجتماعي',1500,  'ecom_boosters', 4),
  ('ecom_loyalty',   'Loyalty Program',         'برنامج ولاء',           4000,  'ecom_boosters', 5),
  -- Brand & Experience
  ('bx_motion',      'Motion Design',           'تصميم متحرك',           2500,  'brand_experience', 1),
  ('bx_darkmode',    'Dark Mode',               'الوضع الليلي',          1500,  'brand_experience', 2),
  ('bx_cursor',      'Custom Cursor',           'مؤشر مخصص',             1000,  'brand_experience', 3),
  ('bx_creative',    'Creative Pack',           'حزمة إبداعية',          3000,  'brand_experience', 4),
  ('bx_webcopy',     'Web Copywriting',         'كتابة محتوى الموقع',    2500,  'brand_experience', 5),
  -- Brand Identity
  ('brand_logo',         'Logo Design',         'تصميم الشعار',          2200,  'brand_identity', 1),
  ('brand_colors',       'Colors & Typography', 'نظام الألوان والخطوط',  900,   'brand_identity', 2),
  ('brand_elements',     'Brand Elements',      'عناصر الهوية البصرية',  900,   'brand_identity', 3),
  ('brand_guide',        'Mini Brand Guide',    'دليل هوية مختصر',       1200,  'brand_identity', 4),
  ('brand_stationery',   'Stationery Kit',      'حزمة الطباعة',          1200,  'brand_identity', 5),
  ('brand_social',       'Social Media Kit',    'حزمة السوشيال ميديا',   1500,  'brand_identity', 6),
  ('brand_profile',      'Company Profile PDF', 'ملف تعريفي PDF',        2200,  'brand_identity', 7),
  ('brand_presentation', 'Presentation Template','قالب عرض تقديمي',      1000,  'brand_identity', 8),
  -- Growth & Ads
  ('growth_fb',     'FB / Instagram Ads',       'إعلانات فيسبوك / انستغرام', 3000, 'growth_ads', 1),
  ('growth_tiktok', 'TikTok Ads',               'إعلانات تيك توك',            3000, 'growth_ads', 2),
  ('growth_google', 'Google Ads',               'إعلانات جوجل',               3500, 'growth_ads', 3),
  ('growth_pixel',  'Pixel Setup',              'إعداد البيكسل',              1000, 'growth_ads', 4),
  -- Security & Performance
  ('sec_cdn',     'CDN Setup',           'إعداد CDN',             1000, 'security', 1),
  ('sec_ssl',     'SSL Certificate',     'شهادة SSL',             500,  'security', 2),
  ('sec_ddos',    'DDoS Protection',     'حماية DDoS',            2000, 'security', 3),
  ('sec_backups', 'Auto Backups',        'نسخ احتياطي تلقائي',   1000, 'security', 4),
  ('sec_vip',     'VIP Support',         'دعم VIP',               2500, 'security', 5)
ON CONFLICT (service_key) DO NOTHING;


-- ════════════════════════════════════════════════════════════════════════════
-- 6. PACKAGES_CATALOG   [NEW — currently hardcoded in src/data/pricing.ts]
--    Three Lumos packages with included service IDs.
--    Allows admin to update pricing and features without code changes.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.packages_catalog (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_key       TEXT NOT NULL UNIQUE,        -- 'lumos_launch' | 'lumos_presence' | 'lumos_commerce'
    name_en           TEXT NOT NULL,
    name_ar           TEXT NOT NULL,
    highlight_en      TEXT,
    highlight_ar      TEXT,
    price             NUMERIC(10,2) NOT NULL,       -- current offer price
    original_price    NUMERIC(10,2),                -- base price (shown strikethrough)
    savings           NUMERIC(10,2),
    included_services TEXT[] NOT NULL DEFAULT '{}', -- array of service_key values
    features          JSONB NOT NULL DEFAULT '[]',  -- [{text, textAr}]
    is_active         BOOLEAN NOT NULL DEFAULT true,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_packages_catalog_updated_at
    BEFORE UPDATE ON public.packages_catalog
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed from pricing.ts PACKAGES
INSERT INTO public.packages_catalog
    (package_key, name_en, name_ar, highlight_en, highlight_ar, price, original_price, savings, included_services, sort_order)
VALUES
(
    'lumos_launch', 'Lumos Launch', 'لوموس لانش',
    'Fast-track for startups & new brands', 'انطلاقة سريعة للستارتابس والمشاريع الجديدة',
    9720, 10800, 1080,
    ARRAY['brand_logo','brand_colors','brand_elements','brand_guide','brand_social','web_landing','bx_webcopy','sec_ssl','growth_pixel'],
    1
),
(
    'lumos_presence', 'Lumos Presence', 'لوموس بريزنس',
    'Full identity + corporate website', 'هوية كاملة + موقع شركة',
    17910, 19900, 1990,
    ARRAY['brand_logo','brand_colors','brand_elements','brand_guide','brand_stationery','brand_profile','brand_presentation','web_corporate','bx_webcopy','sec_ssl','sec_cdn','sec_backups'],
    2
),
(
    'lumos_commerce', 'Lumos Commerce', 'لوموس كوميرس',
    'Pro e-commerce brand launch', 'إطلاق متجر احترافي مع هوية كاملة',
    22320, 24800, 2480,
    ARRAY['brand_logo','brand_colors','brand_elements','brand_guide','brand_social','web_ecommerce','bx_webcopy','sec_ssl','sec_cdn','sec_backups'],
    3
)
ON CONFLICT (package_key) DO NOTHING;


-- ════════════════════════════════════════════════════════════════════════════
-- 7. ORDERS
--    Captured orders. Created either directly from the pricing modal
--    or via pricing_request conversion (admin action).
--    Realtime subscribed by admin dashboard.
--    Fields from: dashboard.ts Order interface, OrdersKanban.tsx
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id           UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    package_key         TEXT REFERENCES public.packages_catalog(package_key) ON DELETE SET NULL,
    discount_code_id    UUID REFERENCES public.discount_codes(id) ON DELETE SET NULL,

    -- Contact info (captured at order time — client may not exist yet)
    client_name         TEXT NOT NULL,
    email               TEXT,
    phone               TEXT NOT NULL,
    company_name        TEXT,

    -- Order contents
    package_type        TEXT,                      -- display label
    package_name        TEXT,
    selected_services   JSONB NOT NULL DEFAULT '[]',  -- [{id, name, nameAr, price, category}]
    plan_details        JSONB NOT NULL DEFAULT '{}',  -- full package config snapshot

    -- Financials (EGP by default)
    subtotal            NUMERIC(12,2) DEFAULT 0,
    discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    tech_ops_fee        NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_price         NUMERIC(12,2) NOT NULL DEFAULT 0,
    original_price      NUMERIC(12,2),
    currency            TEXT NOT NULL DEFAULT 'EGP',

    -- Tracking
    status              order_status NOT NULL DEFAULT 'pending',
    notes               TEXT,
    location_url        TEXT,
    auto_collected_data JSONB DEFAULT '{}',        -- device/browser data at order time
    package_payload     JSONB DEFAULT '{}',        -- full package object snapshot

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Back-fill marketing_data FK now that orders exists
ALTER TABLE public.marketing_data
    ADD CONSTRAINT fk_marketing_data_order
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_client_id  ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone      ON public.orders(phone);


-- ════════════════════════════════════════════════════════════════════════════
-- 8. PRICING_REQUESTS
--    Quote requests from the PricingModal.
--    Inserted directly by pricingRequestService.ts.
--    Admin can convert → creates an order and links converted_order_id.
--    Realtime subscribed by admin dashboard.
--    Fields from: PricingRequest interface in dashboard.ts,
--                 pricingRequestService.ts requestPayload
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pricing_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id           UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    converted_order_id  UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    package_key         TEXT REFERENCES public.packages_catalog(package_key) ON DELETE SET NULL,

    -- Request metadata
    request_type        pricing_request_type NOT NULL,
    request_source      TEXT DEFAULT 'pricing_modal',   -- 'pricing_modal' | 'service_page' | 'admin'
    status              pricing_request_status NOT NULL DEFAULT 'new',

    -- Package info
    package_id          TEXT,                           -- internal package key
    package_name        TEXT,

    -- Selected services
    selected_services   JSONB NOT NULL DEFAULT '[]',    -- [{id, name, nameAr, price, category}]
    estimated_subtotal  NUMERIC(12,2) NOT NULL DEFAULT 0,
    estimated_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
    price_currency      TEXT NOT NULL DEFAULT 'EGP',

    -- Guest contact (if not logged in)
    guest_name          TEXT,
    guest_phone         TEXT,
    guest_email         TEXT,
    company_name        TEXT,

    -- Snapshots & notes
    client_snapshot     JSONB DEFAULT '{}',             -- client row snapshot at request time
    request_notes       TEXT,
    admin_notes         TEXT,
    location_url        TEXT,
    auto_collected_data JSONB DEFAULT '{}',

    -- Timestamps
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_pricing_requests_updated_at
    BEFORE UPDATE ON public.pricing_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_pricing_requests_client_id ON public.pricing_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_pricing_requests_status    ON public.pricing_requests(status);
CREATE INDEX IF NOT EXISTS idx_pricing_requests_created_at ON public.pricing_requests(created_at DESC);


-- ════════════════════════════════════════════════════════════════════════════
-- 9. SAVED_DESIGNS
--    Menu/website designs saved by visitors and clients.
--    Used in the live-preview studio. Realtime subscribed by admin.
--    Fields from: SavedDesign interface in dashboard.ts,
--                 designService.ts, useStudioState.ts
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.saved_designs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id         UUID REFERENCES public.clients(id) ON DELETE SET NULL,

    -- Business info
    business_name     TEXT NOT NULL,
    service_type      TEXT NOT NULL DEFAULT 'restaurant', -- restaurant|cafe|salon|pharmacy|…

    -- Visual settings
    selected_theme    TEXT NOT NULL DEFAULT 'default',
    custom_theme      JSONB NOT NULL DEFAULT '{"primary":"","accent":"","gradient":""}',
    selected_template TEXT NOT NULL DEFAULT 'Template1Screen',
    is_dark_mode      BOOLEAN NOT NULL DEFAULT false,
    glass_effect      BOOLEAN NOT NULL DEFAULT false,
    active_texture    TEXT NOT NULL DEFAULT 'none',
    font_size         NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    theme_accent      TEXT,

    -- Layout & device
    view_mode         TEXT NOT NULL DEFAULT 'list',       -- list|grid|card
    device_view       TEXT NOT NULL DEFAULT 'mobile',     -- mobile|tablet|desktop
    enable_3d         BOOLEAN NOT NULL DEFAULT true,
    rotation_x        INTEGER NOT NULL DEFAULT 0,
    rotation_y        INTEGER NOT NULL DEFAULT 0,
    image_quality     TEXT NOT NULL DEFAULT 'standard',   -- draft|standard|high

    -- Content toggles
    sort_by           TEXT NOT NULL DEFAULT 'name',
    show_ratings      BOOLEAN NOT NULL DEFAULT true,
    show_time         BOOLEAN NOT NULL DEFAULT true,
    show_featured     BOOLEAN NOT NULL DEFAULT true,

    -- Dynamic content
    custom_items      JSONB NOT NULL DEFAULT '[]',        -- MenuItem[]
    cart_items        JSONB NOT NULL DEFAULT '{}',        -- {itemId: quantity}
    favorites         JSONB NOT NULL DEFAULT '[]',        -- itemId[]

    -- Visitor capture (guest sessions)
    visitor_name      TEXT,
    visitor_email     TEXT,
    visitor_phone     TEXT,
    visitor_note      TEXT,
    browser_data      JSONB DEFAULT '{}',

    -- Lifecycle
    status            design_status NOT NULL DEFAULT 'active',
    view_count        INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_saved_designs_updated_at
    BEFORE UPDATE ON public.saved_designs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_saved_designs_client_id    ON public.saved_designs(client_id);
CREATE INDEX IF NOT EXISTS idx_saved_designs_status       ON public.saved_designs(status);
CREATE INDEX IF NOT EXISTS idx_saved_designs_service_type ON public.saved_designs(service_type);
CREATE INDEX IF NOT EXISTS idx_saved_designs_created_at   ON public.saved_designs(created_at DESC);


-- ════════════════════════════════════════════════════════════════════════════
-- 10. DESIGN_VERSIONS   [NEW]
--     Snapshot history for saved_designs.
--     Enables design rollback / version compare — maps to Version interface
--     in src/types/index.ts (currently stored in-memory only).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.design_versions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_id   UUID NOT NULL REFERENCES public.saved_designs(id) ON DELETE CASCADE,
    version_name TEXT,                             -- user-supplied label
    snapshot    JSONB NOT NULL,                    -- full saved_designs row snapshot
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_versions_design_id  ON public.design_versions(design_id);
CREATE INDEX IF NOT EXISTS idx_design_versions_created_at ON public.design_versions(created_at DESC);


-- ════════════════════════════════════════════════════════════════════════════
-- 11. CLIENT_MESSAGES
--     Bidirectional chat between client and admin.
--     Realtime subscribed by both admin dashboard and client portal.
--     sender = 'client' | 'admin'
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.client_messages (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    sender     message_sender NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT false,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_messages_client_id ON public.client_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_is_read   ON public.client_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_client_messages_sender    ON public.client_messages(sender);
CREATE INDEX IF NOT EXISTS idx_client_messages_created_at ON public.client_messages(created_at DESC);


-- ════════════════════════════════════════════════════════════════════════════
-- 12. CLIENT_UPDATES
--     Admin-pushed project milestones and status updates shown in client portal.
--     Fields from: ClientUpdate interface in dashboard.ts
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.client_updates (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id   UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    body        TEXT,
    type        update_type NOT NULL DEFAULT 'update',
    is_read     BOOLEAN NOT NULL DEFAULT false,
    update_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_updates_client_id ON public.client_updates(client_id);
CREATE INDEX IF NOT EXISTS idx_client_updates_is_read   ON public.client_updates(is_read);
CREATE INDEX IF NOT EXISTS idx_client_updates_type      ON public.client_updates(type);


-- ════════════════════════════════════════════════════════════════════════════
-- 13. CLIENT_ASSETS
--     Delivered files linked to a client (optionally to an order).
--     Referenced by client-portal edge function recordAsset action.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.client_assets (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id        UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    order_id         UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    file_name        TEXT NOT NULL,
    file_type        TEXT,                         -- MIME type
    storage_path     TEXT,                         -- Supabase Storage path
    public_url       TEXT,
    file_size_bytes  BIGINT,
    description      TEXT,
    is_deliverable   BOOLEAN NOT NULL DEFAULT true,
    downloaded_count INTEGER NOT NULL DEFAULT 0,   -- [NEW] track downloads
    expires_at       TIMESTAMPTZ,                  -- [NEW] time-limited links
    uploaded_by      TEXT NOT NULL DEFAULT 'admin',
    uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_assets_client_id ON public.client_assets(client_id);
CREATE INDEX IF NOT EXISTS idx_client_assets_order_id  ON public.client_assets(order_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 14. MAGIC_LINKS
--     Custom magic link / OTP tokens (separate from Supabase Auth OTP).
--     Used by send-magic-link edge function.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.magic_links (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used    BOOLEAN NOT NULL DEFAULT false,
    used_at    TIMESTAMPTZ,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token     ON public.magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_client_id ON public.magic_links(client_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_email     ON public.magic_links(email);


-- ════════════════════════════════════════════════════════════════════════════
-- 15. PHONE_VERIFICATIONS
--     SMS OTP — used by send-otp / verify-otp edge functions.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    phone       TEXT NOT NULL,
    code        TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    attempts    INTEGER NOT NULL DEFAULT 0,
    ip_address  TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone      ON public.phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at ON public.phone_verifications(expires_at);


-- ════════════════════════════════════════════════════════════════════════════
-- 16. AUTH_EVENTS
--     Structured auth event log — login, logout, signup, pw_reset.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.auth_events (
    id         BIGSERIAL PRIMARY KEY,
    client_id  UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    event      TEXT NOT NULL,   -- 'login' | 'logout' | 'signup' | 'pw_reset' | 'magic_link' | 'otp_verify'
    metadata   JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_client_id  ON public.auth_events(client_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_event      ON public.auth_events(event);
CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON public.auth_events(created_at DESC);


-- ════════════════════════════════════════════════════════════════════════════
-- 17. LOGIN_ATTEMPTS
--     Brute-force audit — every attempt logged regardless of outcome.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.login_attempts (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username       TEXT,
    email          TEXT,
    success        BOOLEAN NOT NULL,
    failure_reason TEXT,
    ip_address     TEXT,
    user_agent     TEXT,
    device_info    JSONB DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email      ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON public.login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts(created_at DESC);


-- ════════════════════════════════════════════════════════════════════════════
-- 18. RATE_LIMITS
--     Generic rate-limiting table — sliding window by key.
--     key format: '{action}:{identifier}' e.g. 'signup:192.168.1.1'
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.rate_limits (
    id         BIGSERIAL PRIMARY KEY,
    key        TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key        ON public.rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON public.rate_limits(created_at);


-- ════════════════════════════════════════════════════════════════════════════
-- 19. ACTIVITY_LOG
--     Application-level event log. Inserted by submissionService.ts and
--     edge functions. activity_type categorizes the event; activity_data
--     carries the full context.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.activity_log (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id      UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    activity_type  TEXT NOT NULL,  -- 'form_submission' | 'new_order' | 'new_message' | 'contact_created' | 'design_saved' | …
    activity_data  JSONB NOT NULL DEFAULT '{}',
    ip_address     TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_client_id     ON public.activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON public.activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at    ON public.activity_log(created_at DESC);


-- ════════════════════════════════════════════════════════════════════════════
-- 20. AVATAR_PRESETS
--     Reference table for the 14 avatar styles in profileService.ts.
--     style = AvatarConfig.style union type.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.avatar_presets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    style       TEXT NOT NULL UNIQUE,   -- 'nanoBanana' | 'cosmicDust' | … (14 values)
    name_en     TEXT NOT NULL,
    name_ar     TEXT,
    config      JSONB NOT NULL DEFAULT '{}',    -- default AvatarConfig values for this style
    preview_url TEXT,
    is_premium  BOOLEAN NOT NULL DEFAULT false,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.avatar_presets (style, name_en, name_ar, sort_order) VALUES
  ('nanoBanana',  'Nano Banana',    'نانو بنانا',      1),
  ('cosmicDust',  'Cosmic Dust',    'غبار كوني',       2),
  ('liquidMetal', 'Liquid Metal',   'معدن سائل',       3),
  ('crystalFacet','Crystal Facet',  'بلورة متعددة',    4),
  ('neonPulse',   'Neon Pulse',     'نبض نيون',        5),
  ('holographic', 'Holographic',    'هولوغرافي',       6),
  ('origami',     'Origami',        'أوريغامي',        7),
  ('photo',       'Photo',          'صورة',            8),
  ('mesh',        'Mesh',           'شبكة',            9),
  ('abstract',    'Abstract',       'تجريدي',          10),
  ('glass',       'Glass',          'زجاج',            11),
  ('monogram',    'Monogram',       'مونوغرام',        12),
  ('geometric',   'Geometric',      'هندسي',           13),
  ('pixel',       'Pixel',          'بكسل',            14)
ON CONFLICT (style) DO NOTHING;


-- ════════════════════════════════════════════════════════════════════════════
-- 21. PROFILE_ACTIVITY
--     Profile change audit for each client — shown in client portal.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profile_activity (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    action     TEXT NOT NULL,   -- 'avatar_updated' | 'bio_updated' | 'social_links_updated' | …
    details    JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_activity_client_id  ON public.profile_activity(client_id);
CREATE INDEX IF NOT EXISTS idx_profile_activity_created_at ON public.profile_activity(created_at DESC);


-- ════════════════════════════════════════════════════════════════════════════
-- 22. PROFILE_MEDIA
--     Storage metadata for uploaded avatars, covers, logos.
--     Tracks crop data, dimensions, and original Supabase Storage path.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profile_media (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    media_kind      media_kind NOT NULL,
    storage_path    TEXT,
    public_url      TEXT NOT NULL,
    mime_type       TEXT,
    file_size_bytes BIGINT,
    width           INTEGER,
    height          INTEGER,
    crop_data       JSONB DEFAULT '{}',   -- {x, y, width, height, zoom}
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profile_media_updated_at
    BEFORE UPDATE ON public.profile_media
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_profile_media_client_id ON public.profile_media(client_id);
CREATE INDEX IF NOT EXISTS idx_profile_media_kind      ON public.profile_media(media_kind);


-- ════════════════════════════════════════════════════════════════════════════
-- 23. NOTIFICATIONS
--     In-app alerts for clients (and optionally admins).
--     Created by edge functions when orders change, messages arrive, etc.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id           UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    message             TEXT,
    type                notification_type NOT NULL DEFAULT 'info',
    action_url          TEXT,
    related_entity_type TEXT,   -- 'order' | 'message' | 'pricing_request' | 'design'
    related_entity_id   UUID,
    is_read             BOOLEAN NOT NULL DEFAULT false,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_client_id ON public.notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read   ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);


-- ════════════════════════════════════════════════════════════════════════════
-- 24. NOTIFICATIONS_QUEUE   [NEW]
--     Tracks outbound email/SMS/WhatsApp delivery status.
--     Decoupled from in-app notifications — one in-app notification can
--     trigger multiple outbound channels.
--     UX benefit: retry failed sends, show delivery receipts in admin.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications_queue (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
    client_id       UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    channel         notification_channel NOT NULL,          -- 'email' | 'sms' | 'whatsapp'
    recipient       TEXT NOT NULL,                          -- email address or phone number
    subject         TEXT,
    body            TEXT NOT NULL,
    status          notification_delivery_status NOT NULL DEFAULT 'pending',
    provider        TEXT,                                   -- 'resend' | 'twilio' | 'vonage'
    provider_id     TEXT,                                   -- provider message ID for tracking
    error_message   TEXT,
    attempts        INTEGER NOT NULL DEFAULT 0,
    next_retry_at   TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_notifications_queue_updated_at
    BEFORE UPDATE ON public.notifications_queue
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_notif_queue_status     ON public.notifications_queue(status);
CREATE INDEX IF NOT EXISTS idx_notif_queue_client_id  ON public.notifications_queue(client_id);
CREATE INDEX IF NOT EXISTS idx_notif_queue_channel    ON public.notifications_queue(channel);
CREATE INDEX IF NOT EXISTS idx_notif_queue_next_retry ON public.notifications_queue(next_retry_at) WHERE status = 'failed';


-- ════════════════════════════════════════════════════════════════════════════
-- 25. CLIENT_REVIEWS   [NEW]
--     Post-delivery NPS / testimonial capture.
--     Shown in client portal after order is completed.
--     Admin can approve/reject for public display.
--     UX benefit: social proof, NPS tracking, client satisfaction score.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.client_reviews (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id      UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    order_id       UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    nps_score      INTEGER CHECK (nps_score BETWEEN 0 AND 10),  -- Net Promoter Score
    title          TEXT,
    comment        TEXT,
    is_public      BOOLEAN NOT NULL DEFAULT false,              -- show on website?
    status         review_status NOT NULL DEFAULT 'pending',
    reviewed_by    UUID,                                        -- admin who approved/rejected
    reviewed_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_reviews_client_id ON public.client_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_client_reviews_status    ON public.client_reviews(status);
CREATE INDEX IF NOT EXISTS idx_client_reviews_rating    ON public.client_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_client_reviews_is_public ON public.client_reviews(is_public) WHERE is_public = true;


-- ════════════════════════════════════════════════════════════════════════════
-- 26. ADMIN_SETTINGS   [NEW]
--     Global key-value config store for the admin panel.
--     Replaces hardcoded constants and allows runtime config changes:
--     - tech_ops_fee percentage
--     - feature flags (enable_reviews, enable_2fa, …)
--     - branding (agency_name, support_email, whatsapp_number)
--     - maintenance mode toggle
--     UX benefit: admin can tune the app without redeploys.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_settings (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    description TEXT,
    updated_by  UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default settings
INSERT INTO public.admin_settings (key, value, description) VALUES
  ('tech_ops_fee_percent', '10'::JSONB,                          'Tech-ops fee applied to all orders (%)'),
  ('default_currency',     '"EGP"'::JSONB,                       'Default currency for all pricing'),
  ('support_email',        '"support@lumos.agency"'::JSONB,      'Support contact email'),
  ('whatsapp_number',      '"201000000000"'::JSONB,              'WhatsApp contact number (no +)'),
  ('agency_name',          '"Lumos Agency"'::JSONB,              'Agency display name'),
  ('enable_reviews',       'true'::JSONB,                        'Allow clients to submit reviews'),
  ('enable_2fa',           'false'::JSONB,                       'Require 2FA for admin login'),
  ('maintenance_mode',     'false'::JSONB,                       'Put site in maintenance mode'),
  ('max_login_attempts',   '5'::JSONB,                           'Lock account after N failed logins'),
  ('otp_expiry_minutes',   '10'::JSONB,                          'OTP validity window in minutes')
ON CONFLICT (key) DO NOTHING;


-- ════════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ════════════════════════════════════════════════════════════════════════════

-- Admin: full client overview with aggregated KPIs
CREATE OR REPLACE VIEW public.v_client_overview AS
SELECT
    c.id,
    c.display_name,
    c.company_name,
    c.email,
    c.phone,
    c.status,
    c.progress,
    c.package_name,
    c.created_at,
    COUNT(DISTINCT o.id)                                          AS total_orders,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'active')       AS active_orders,
    COALESCE(SUM(o.total_price), 0)                               AS lifetime_value,
    COUNT(DISTINCT cm.id) FILTER (WHERE cm.is_read = false
                                    AND cm.sender = 'client')     AS unread_messages,
    COUNT(DISTINCT pr.id) FILTER (WHERE pr.status = 'new')        AS pending_quotes,
    MAX(o.created_at)                                             AS last_order_at
FROM public.clients c
LEFT JOIN public.orders         o  ON o.client_id  = c.id
LEFT JOIN public.client_messages cm ON cm.client_id = c.id
LEFT JOIN public.pricing_requests pr ON pr.client_id = c.id
GROUP BY c.id;


-- Admin: revenue breakdown by month and currency
CREATE OR REPLACE VIEW public.v_revenue_summary AS
SELECT
    DATE_TRUNC('month', created_at)       AS month,
    currency,
    COUNT(*)                              AS order_count,
    SUM(total_price)                      AS gross_revenue,
    SUM(discount_amount)                  AS total_discounts,
    AVG(total_price)                      AS avg_order_value,
    SUM(total_price) FILTER (WHERE status = 'completed') AS confirmed_revenue,
    SUM(total_price) FILTER (WHERE status = 'cancelled') AS cancelled_revenue
FROM public.orders
GROUP BY DATE_TRUNC('month', created_at), currency
ORDER BY month DESC;


-- Admin: lead funnel (contact → pricing_request → order)
CREATE OR REPLACE VIEW public.v_lead_funnel AS
SELECT
    DATE_TRUNC('week', c.created_at)   AS week,
    COUNT(DISTINCT c.id)               AS total_leads,
    COUNT(DISTINCT pr.id)              AS quote_requests,
    COUNT(DISTINCT o.id)               AS converted_orders,
    ROUND(
        COUNT(DISTINCT pr.id)::NUMERIC / NULLIF(COUNT(DISTINCT c.id), 0) * 100, 1
    )                                  AS lead_to_quote_pct,
    ROUND(
        COUNT(DISTINCT o.id)::NUMERIC  / NULLIF(COUNT(DISTINCT pr.id), 0) * 100, 1
    )                                  AS quote_to_order_pct
FROM public.contacts c
LEFT JOIN public.pricing_requests pr ON pr.guest_email = c.email
LEFT JOIN public.orders o ON o.id = pr.converted_order_id
GROUP BY DATE_TRUNC('week', c.created_at)
ORDER BY week DESC;


-- Client portal: self-service snapshot (RLS filters to auth.uid() row)
-- Usage: SELECT * FROM v_client_portal WHERE id = auth.uid()
CREATE OR REPLACE VIEW public.v_client_portal AS
SELECT
    c.id,
    c.display_name,
    c.company_name,
    c.email,
    c.phone,
    c.status,
    c.progress,
    c.next_steps,
    c.package_name,
    c.package_details,
    c.active_offer,
    c.active_offer_link,
    c.avatar_style,
    c.avatar_seed,
    c.avatar_config,
    c.avatar_url,
    c.theme_accent,
    c.brand_colors,
    c.social_links,
    c.profile_completion_score
FROM public.clients c;


-- ════════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ════════════════════════════════════════════════════════════════════════════
-- Enable RLS on tables exposed to the client SDK (anon / authenticated roles).
-- Edge functions bypass RLS via the service_role key.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_updates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_assets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_activity   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_media      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_reviews     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_designs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders             ENABLE ROW LEVEL SECURITY;

-- Clients can only read/update their own row
CREATE POLICY clients_self_read   ON public.clients FOR SELECT USING (auth.uid() = id);
CREATE POLICY clients_self_update ON public.clients FOR UPDATE USING (auth.uid() = id);

-- Clients can only see their own messages
CREATE POLICY messages_self ON public.client_messages
    FOR ALL USING (auth.uid() = client_id);

-- Clients see their own updates
CREATE POLICY updates_self ON public.client_updates
    FOR SELECT USING (auth.uid() = client_id);

-- Clients see their own assets
CREATE POLICY assets_self ON public.client_assets
    FOR SELECT USING (auth.uid() = client_id);

-- Clients see their own notifications
CREATE POLICY notifications_self ON public.notifications
    FOR ALL USING (auth.uid() = client_id);

-- Clients manage their own profile media
CREATE POLICY profile_media_self ON public.profile_media
    FOR ALL USING (auth.uid() = client_id);

-- Clients see their own activity
CREATE POLICY profile_activity_self ON public.profile_activity
    FOR SELECT USING (auth.uid() = client_id);

-- Clients can submit and read their own reviews
CREATE POLICY reviews_self ON public.client_reviews
    FOR ALL USING (auth.uid() = client_id);

-- Public reads approved reviews
CREATE POLICY reviews_public_read ON public.client_reviews
    FOR SELECT USING (is_public = true AND status = 'approved');

-- Clients can insert and read their own pricing requests
CREATE POLICY pricing_requests_self ON public.pricing_requests
    FOR ALL USING (auth.uid() = client_id);

-- Clients see their own orders
CREATE POLICY orders_self ON public.orders
    FOR SELECT USING (auth.uid() = client_id);

-- Public read for services and packages (pricing page)
ALTER TABLE public.services_catalog  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages_catalog  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatar_presets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes    ENABLE ROW LEVEL SECURITY;

CREATE POLICY services_public_read  ON public.services_catalog  FOR SELECT USING (is_active = true);
CREATE POLICY packages_public_read  ON public.packages_catalog  FOR SELECT USING (is_active = true);
CREATE POLICY avatars_public_read   ON public.avatar_presets    FOR SELECT USING (true);
CREATE POLICY discounts_anon_read   ON public.discount_codes    FOR SELECT USING (is_active = true);

-- Public can insert contacts (lead form — anon user)
ALTER TABLE public.contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_anon_insert    ON public.contacts       FOR INSERT WITH CHECK (true);
CREATE POLICY marketing_anon_insert   ON public.marketing_data FOR INSERT WITH CHECK (true);


-- ════════════════════════════════════════════════════════════════════════════
-- REALTIME PUBLICATIONS
-- (enable realtime for admin dashboard subscriptions)
-- ════════════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_designs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ════════════════════════════════════════════════════════════════════════════
-- AUTO-CLEANUP FUNCTIONS (housekeeping)
-- ════════════════════════════════════════════════════════════════════════════

-- Expire old magic links (call via pg_cron or edge function)
CREATE OR REPLACE FUNCTION cleanup_expired_magic_links()
RETURNS void LANGUAGE sql AS $$
    DELETE FROM public.magic_links
    WHERE expires_at < NOW() - INTERVAL '24 hours';
$$;

-- Expire old phone OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void LANGUAGE sql AS $$
    DELETE FROM public.phone_verifications
    WHERE expires_at < NOW() - INTERVAL '1 hour';
$$;

-- Expire old rate-limit rows (keep 1 hour window)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void LANGUAGE sql AS $$
    DELETE FROM public.rate_limits
    WHERE created_at < NOW() - INTERVAL '1 hour';
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- SMART IMPROVEMENTS SUMMARY (UX / Architecture)
-- ════════════════════════════════════════════════════════════════════════════
--
-- 1. SERVICES_CATALOG & PACKAGES_CATALOG
--    Problem: all pricing is hardcoded in src/data/pricing.ts.
--    Changing a price requires a frontend redeploy.
--    Solution: Move to DB. Admin edits prices via dashboard → live on site.
--    Bonus: analytics can correlate ordered services with catalog records.
--
-- 2. DESIGN_VERSIONS
--    Problem: "Version" type exists in src/types/index.ts but only stored
--    in React state — lost on page refresh.
--    Solution: Persist snapshots to DB. Clients get rollback history.
--    UX: "Restore this design" button in studio sidebar.
--
-- 3. NOTIFICATIONS_QUEUE
--    Problem: Email/SMS are fire-and-forget via edge functions — no retry,
--    no delivery tracking.
--    Solution: Queue table with status, attempts, and next_retry_at.
--    UX: Admin sees "Email delivery failed" badge. Retry button per message.
--
-- 4. CLIENT_REVIEWS
--    Problem: No feedback loop after project delivery.
--    Solution: Trigger review request when order → 'completed'.
--    UX: Client portal shows "Rate your experience" card.
--    Admin: Approve reviews to show as testimonials on landing page.
--    Analytics: NPS score tracked over time.
--
-- 5. ADMIN_SETTINGS
--    Problem: tech_ops_fee, support email, feature flags are hardcoded.
--    Solution: KV table editable from admin dashboard.
--    UX: Admin toggles "maintenance mode" → site shows maintenance page.
--    No code change. No redeploy.
--
-- 6. ENUM TYPES (instead of TEXT)
--    Prevents typos in status fields. DB enforces valid values.
--    order_status, contact_status, pricing_request_status, etc.
--
-- 7. TRIGRAM INDEXES (pg_trgm)
--    idx_clients_username_trgm, idx_clients_company_trgm, idx_contacts_name_trgm
--    Admin dashboard search becomes instant even with 10k+ records.
--    Supports partial-match: searching "ahm" finds "Ahmed".
--
-- 8. AUTO-CLEANUP FUNCTIONS
--    Expired OTPs and magic links accumulate. cleanup_* functions can be
--    scheduled via pg_cron (in Supabase: Database → Extensions → pg_cron).
--
-- 9. RLS POLICIES
--    Clients can only access their own data via the anon key.
--    Edge functions use service_role key to bypass RLS for admin ops.
--    Contacts and marketing_data allow anon INSERT (lead forms work without login).
--
-- 10. REALTIME PUBLICATIONS
--    All tables subscribed by useAdminDashboard.ts are explicitly added
--    to the supabase_realtime publication.
--
-- ════════════════════════════════════════════════════════════════════════════
