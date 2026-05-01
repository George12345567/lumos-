-- ================================================================
-- DATABASE SCHEMA REFERENCE
-- Project: LUMOS
-- Generated: 2026-04-27
-- Supabase Project: hkiczkmdxldshooaelio
-- ================================================================
-- Tables: 28
-- Views:  3 (customer_dashboard, customer_overview, revenue_summary)
-- ================================================================


-- ================================================================
-- EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('ticket_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;


-- ================================================================
-- TABLE: clients  (CORE — all other tables reference this)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username                  TEXT NOT NULL UNIQUE,
    email                     TEXT NOT NULL,
    phone_number              TEXT,
    password_hash             TEXT,
    role                      TEXT NOT NULL DEFAULT 'client',
    status                    TEXT NOT NULL DEFAULT 'pending',
    email_verified            BOOLEAN NOT NULL DEFAULT false,
    login_attempts            INTEGER NOT NULL DEFAULT 0,
    locked_until              TIMESTAMPTZ,
    last_login_at             TIMESTAMPTZ,
    security_question         TEXT,
    security_answer           TEXT,
    -- Profile
    company_name              TEXT,
    display_name              TEXT,
    bio                       TEXT,
    tagline                   TEXT,
    headline                  TEXT,
    website                   TEXT,
    location                  TEXT,
    timezone                  TEXT DEFAULT 'Africa/Cairo',
    -- Media
    logo_url                  TEXT,
    avatar_url                TEXT,
    avatar_style              TEXT DEFAULT 'geometric',
    avatar_seed               TEXT,
    avatar_config             JSONB NOT NULL DEFAULT '{}',
    cover_image_url           TEXT,
    cover_gradient            TEXT DEFAULT 'aurora',
    -- Theme
    theme_accent              TEXT DEFAULT '#64ffda',
    brand_colors              JSONB NOT NULL DEFAULT '[]',
    social_links              JSONB NOT NULL DEFAULT '{}',
    profile_visibility        TEXT NOT NULL DEFAULT 'private',
    profile_sections          JSONB NOT NULL DEFAULT '[]',
    profile_theme             JSONB NOT NULL DEFAULT '{}',
    avatar_crop               JSONB NOT NULL DEFAULT '{}',
    cover_crop                JSONB NOT NULL DEFAULT '{}',
    public_slug               TEXT,
    profile_completion_score  INTEGER NOT NULL DEFAULT 0,
    profile_completed_at      TIMESTAMPTZ,
    last_profile_update       TIMESTAMPTZ,
    progress                  INTEGER DEFAULT 0,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: profiles  (admin/staff users — linked to Supabase auth)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY,  -- same as auth.users.id
    email       TEXT,
    full_name   TEXT,
    role        TEXT NOT NULL DEFAULT 'viewer',
    phone       TEXT,
    company     TEXT,
    address     TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: packages
-- ================================================================
CREATE TABLE IF NOT EXISTS public.packages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL,
    slug           TEXT NOT NULL UNIQUE,
    description    TEXT,
    price          NUMERIC NOT NULL,
    currency       TEXT NOT NULL DEFAULT 'EGP',
    billing_period TEXT NOT NULL DEFAULT 'monthly',
    features       JSONB NOT NULL DEFAULT '[]',
    is_active      BOOLEAN NOT NULL DEFAULT true,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: discount_codes  (used in orders)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.discount_codes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code           TEXT NOT NULL UNIQUE,
    discount_type  TEXT NOT NULL,          -- 'percentage' | 'fixed'
    discount_value NUMERIC NOT NULL,
    min_order_value NUMERIC,
    max_uses       INTEGER,
    current_uses   INTEGER NOT NULL DEFAULT 0,
    valid_from     TIMESTAMPTZ,
    valid_until    TIMESTAMPTZ,
    is_active      BOOLEAN NOT NULL DEFAULT true,
    description    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: orders
-- ================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name         TEXT,
    email               TEXT,
    phone               TEXT,
    company_name        TEXT,
    package_type        TEXT,
    package_id          UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    package_name        TEXT,
    selected_services   JSONB NOT NULL DEFAULT '[]',
    subtotal            NUMERIC,
    discount_amount     NUMERIC NOT NULL DEFAULT 0,
    discount_code_id    UUID REFERENCES public.discount_codes(id) ON DELETE SET NULL,
    tech_ops_fee        NUMERIC NOT NULL DEFAULT 0,
    total_price         NUMERIC,
    currency            TEXT NOT NULL DEFAULT 'EGP',
    status              TEXT NOT NULL DEFAULT 'pending',
    notes               TEXT,
    plan_details        JSONB NOT NULL DEFAULT '{}',
    auto_collected_data JSONB NOT NULL DEFAULT '{}',
    location_url        TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: subscriptions
-- ================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID,
    client_id         UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    order_id          UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_name     TEXT,
    customer_email    TEXT,
    customer_phone    TEXT,
    package_type      TEXT,
    package_name      TEXT,
    package_id        UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    selected_services JSONB NOT NULL DEFAULT '[]',
    subtotal          NUMERIC,
    tech_ops_fee      NUMERIC,
    total             NUMERIC,
    currency          TEXT NOT NULL DEFAULT 'EGP',
    status            TEXT NOT NULL DEFAULT 'pending',
    starts_at         TIMESTAMPTZ,
    ends_at           TIMESTAMPTZ,
    renewed_at        TIMESTAMPTZ,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: invoices
-- ================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id   UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    user_id           UUID,
    client_id         UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    invoice_number    TEXT NOT NULL UNIQUE DEFAULT generate_invoice_number(),
    issue_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date          DATE,
    subtotal          NUMERIC NOT NULL DEFAULT 0,
    tax               NUMERIC NOT NULL DEFAULT 0,
    discount          NUMERIC NOT NULL DEFAULT 0,
    total             NUMERIC NOT NULL DEFAULT 0,
    currency          TEXT NOT NULL DEFAULT 'EGP',
    status            TEXT NOT NULL DEFAULT 'pending',
    payment_method    TEXT,
    payment_date      TIMESTAMPTZ,
    payment_reference TEXT,
    items             JSONB NOT NULL DEFAULT '[]',
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: payments
-- ================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id       UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    subscription_id  UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    user_id          UUID,
    client_id        UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    amount           NUMERIC NOT NULL,
    currency         TEXT NOT NULL DEFAULT 'EGP',
    payment_method   TEXT,
    status           TEXT NOT NULL DEFAULT 'pending',
    transaction_id   TEXT,
    gateway_response JSONB NOT NULL DEFAULT '{}',
    payment_date     TIMESTAMPTZ,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: support_tickets
-- ================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID,
    client_id       UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    ticket_number   TEXT NOT NULL UNIQUE DEFAULT generate_ticket_number(),
    subject         TEXT NOT NULL,
    description     TEXT,
    category        TEXT,
    priority        TEXT NOT NULL DEFAULT 'medium',
    status          TEXT NOT NULL DEFAULT 'open',
    customer_name   TEXT,
    customer_email  TEXT,
    assigned_to     UUID,
    resolved_at     TIMESTAMPTZ,
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: ticket_messages
-- ================================================================
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id     UUID,
    client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    message     TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    attachments JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: client_messages
-- ================================================================
CREATE TABLE IF NOT EXISTS public.client_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    sender     TEXT NOT NULL,   -- 'client' | 'admin'
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT false,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: client_updates  (admin announcements per client)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.client_updates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    body        TEXT,
    type        TEXT NOT NULL DEFAULT 'info',
    is_read     BOOLEAN NOT NULL DEFAULT false,
    update_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: client_assets  (delivered files per client/order)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.client_assets (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id        UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    order_id         UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    file_name        TEXT NOT NULL,
    file_type        TEXT,
    mime_type        TEXT,
    storage_path     TEXT,
    public_url       TEXT,
    file_size_bytes  BIGINT,
    description      TEXT,
    is_deliverable   BOOLEAN NOT NULL DEFAULT false,
    uploaded_by      TEXT NOT NULL DEFAULT 'admin',
    uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: notifications
-- ================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID,
    client_id           UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    message             TEXT,
    type                TEXT NOT NULL DEFAULT 'info',
    action_url          TEXT,
    related_entity_type TEXT,
    related_entity_id   UUID,
    is_read             BOOLEAN NOT NULL DEFAULT false,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: activity_log
-- ================================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID,
    client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    actor_name  TEXT,
    actor_email TEXT,
    action      TEXT NOT NULL,
    entity_type TEXT,
    entity_id   UUID,
    description TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}',
    ip_address  TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: auth_events
-- ================================================================
CREATE TABLE IF NOT EXISTS public.auth_events (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    event      TEXT NOT NULL,
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: login_attempts
-- ================================================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username       TEXT,
    email          TEXT,
    success        BOOLEAN NOT NULL,
    failure_reason TEXT,
    ip_address     TEXT,
    user_agent     TEXT,
    device_info    JSONB NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: magic_links
-- ================================================================
CREATE TABLE IF NOT EXISTS public.magic_links (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used    BOOLEAN NOT NULL DEFAULT false,
    used_at    TIMESTAMPTZ,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: phone_verifications
-- ================================================================
CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone       TEXT NOT NULL,
    code        TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    ip_address  TEXT,
    user_agent  TEXT,
    attempts    INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);


-- ================================================================
-- TABLE: rate_limits
-- ================================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id         BIGSERIAL PRIMARY KEY,
    key        TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: contact_submissions
-- ================================================================
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    phone       TEXT,
    company     TEXT,
    subject     TEXT,
    message     TEXT NOT NULL,
    source      TEXT NOT NULL DEFAULT 'contact_form',
    status      TEXT NOT NULL DEFAULT 'new',
    ip_address  TEXT,
    user_agent  TEXT,
    referrer    TEXT,
    admin_notes TEXT,
    assigned_to UUID,
    replied_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: pricing_requests
-- ================================================================
CREATE TABLE IF NOT EXISTS public.pricing_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    request_type        TEXT NOT NULL,
    request_source      TEXT,
    status              TEXT NOT NULL DEFAULT 'new',
    package_id          UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    package_name        TEXT,
    selected_services   JSONB NOT NULL DEFAULT '[]',
    estimated_subtotal  NUMERIC,
    estimated_total     NUMERIC,
    currency            TEXT NOT NULL DEFAULT 'EGP',
    guest_name          TEXT,
    guest_phone         TEXT,
    guest_email         TEXT,
    company_name        TEXT,
    client_snapshot     JSONB NOT NULL DEFAULT '{}',
    request_notes       TEXT,
    admin_notes         TEXT,
    auto_collected_data JSONB NOT NULL DEFAULT '{}',
    location_url        TEXT,
    converted_order_id  UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: saved_designs  (menu builder)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.saved_designs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id         UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    business_name     TEXT NOT NULL,
    service_type      TEXT NOT NULL DEFAULT 'restaurant',
    selected_theme    TEXT NOT NULL DEFAULT 'default',
    custom_theme      JSONB NOT NULL DEFAULT '{}',
    selected_template TEXT NOT NULL DEFAULT 'classic',
    is_dark_mode      BOOLEAN NOT NULL DEFAULT false,
    glass_effect      BOOLEAN NOT NULL DEFAULT false,
    active_texture    TEXT NOT NULL DEFAULT 'none',
    font_size         NUMERIC NOT NULL DEFAULT 1.0,
    theme_accent      TEXT,
    view_mode         TEXT NOT NULL DEFAULT 'list',
    device_view       TEXT NOT NULL DEFAULT 'mobile',
    enable_3d         BOOLEAN NOT NULL DEFAULT true,
    rotation_x        INTEGER NOT NULL DEFAULT 0,
    rotation_y        INTEGER NOT NULL DEFAULT 0,
    image_quality     TEXT NOT NULL DEFAULT 'standard',
    sort_by           TEXT NOT NULL DEFAULT 'name',
    show_ratings      BOOLEAN NOT NULL DEFAULT true,
    show_time         BOOLEAN NOT NULL DEFAULT true,
    show_featured     BOOLEAN NOT NULL DEFAULT true,
    custom_items      JSONB NOT NULL DEFAULT '[]',
    cart_items        JSONB NOT NULL DEFAULT '{}',
    favorites         JSONB NOT NULL DEFAULT '[]',
    visitor_name      TEXT,
    visitor_email     TEXT,
    visitor_phone     TEXT,
    visitor_note      TEXT,
    browser_data      JSONB NOT NULL DEFAULT '{}',
    status            TEXT NOT NULL DEFAULT 'active',
    view_count        INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: avatar_presets
-- ================================================================
CREATE TABLE IF NOT EXISTS public.avatar_presets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    style       TEXT NOT NULL,
    config      JSONB NOT NULL DEFAULT '{}',
    preview_url TEXT,
    is_premium  BOOLEAN NOT NULL DEFAULT false,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: profile_activity
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profile_activity (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    action     TEXT NOT NULL,
    details    JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: profile_media
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profile_media (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    media_kind      TEXT NOT NULL,   -- 'avatar' | 'cover' | 'logo'
    storage_path    TEXT,
    public_url      TEXT NOT NULL,
    mime_type       TEXT,
    file_size_bytes BIGINT,
    width           INTEGER,
    height          INTEGER,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- TABLE: discounts  (standalone discount records)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.discounts (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code             TEXT NOT NULL UNIQUE,
    discount_type    TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value   NUMERIC NOT NULL,
    min_order_amount NUMERIC,
    max_uses         INTEGER,
    used_count       INTEGER DEFAULT 0,
    valid_from       TIMESTAMPTZ,
    valid_until      TIMESTAMPTZ,
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMPTZ DEFAULT now()
);


-- ================================================================
-- TABLE: reviews
-- ================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    item_id     UUID,
    user_name   TEXT NOT NULL,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now()
);


-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_clients_email          ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status         ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_public_slug    ON public.clients(public_slug);

CREATE INDEX IF NOT EXISTS idx_orders_client_id       ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_package_id      ON public.orders(package_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_client_id ON public.subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status    ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_order_id  ON public.subscriptions(order_id);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id      ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status         ON public.invoices(status);

CREATE INDEX IF NOT EXISTS idx_payments_client_id      ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status         ON public.payments(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_client_id ON public.support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status    ON public.support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);

CREATE INDEX IF NOT EXISTS idx_client_messages_client_id ON public.client_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_client_id   ON public.notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read     ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_activity_log_client_id    ON public.activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at   ON public.activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email      ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_token         ON public.magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_client_id     ON public.magic_links(client_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON public.phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key           ON public.rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_pricing_requests_client   ON public.pricing_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_pricing_requests_status   ON public.pricing_requests(status);
CREATE INDEX IF NOT EXISTS idx_saved_designs_client_id   ON public.saved_designs(client_id);
CREATE INDEX IF NOT EXISTS idx_profile_media_client_id   ON public.profile_media(client_id);
CREATE INDEX IF NOT EXISTS idx_discounts_code            ON public.discounts(code);
CREATE INDEX IF NOT EXISTS idx_reviews_rating            ON public.reviews(rating);


-- ================================================================
-- VIEWS
-- ================================================================

-- Customer dashboard (client-facing, filtered by auth.uid())
CREATE OR REPLACE VIEW public.customer_dashboard AS
SELECT
    s.id, s.user_id, s.client_id,
    s.package_type, s.package_name, s.selected_services,
    s.total, s.currency, s.status,
    s.starts_at, s.ends_at, s.created_at,
    p.full_name, p.email, p.phone, p.company
FROM subscriptions s
LEFT JOIN profiles p ON s.user_id = p.id
WHERE s.user_id = auth.uid();

-- Customer overview (admin view — all clients with aggregated stats)
CREATE OR REPLACE VIEW public.customer_overview AS
SELECT
    c.id AS client_id,
    c.display_name, c.company_name, c.email, c.status, c.created_at,
    COUNT(DISTINCT o.id) AS total_orders,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'active') AS active_orders,
    COALESCE(SUM(o.total_price), 0) AS lifetime_value,
    COUNT(DISTINCT cm.id) FILTER (WHERE cm.is_read = false) AS unread_messages
FROM clients c
LEFT JOIN orders o ON o.client_id = c.id
LEFT JOIN client_messages cm ON cm.client_id = c.id
GROUP BY c.id;

-- Revenue summary (monthly breakdown)
CREATE OR REPLACE VIEW public.revenue_summary AS
SELECT
    DATE_TRUNC('month', payment_date) AS month,
    currency,
    COUNT(*) AS payment_count,
    SUM(amount) AS total_revenue,
    SUM(amount) FILTER (WHERE status = 'completed') AS confirmed_revenue,
    SUM(amount) FILTER (WHERE status = 'refunded') AS refunded_amount
FROM payments
WHERE payment_date IS NOT NULL
GROUP BY DATE_TRUNC('month', payment_date), currency
ORDER BY month DESC;


-- ================================================================
-- RELATIONSHIP MAP (Quick Reference)
-- ================================================================
--
--  clients ─────────────────────────────────────────────────────┐
--    │                                                           │
--    ├── orders ──────────── subscriptions ── invoices          │
--    │       │                    │               │             │
--    │       └── discount_codes   └── payments ───┘             │
--    │       └── packages                                       │
--    │       └── pricing_requests                               │
--    │                                                          │
--    ├── support_tickets ── ticket_messages                     │
--    ├── client_messages                                        │
--    ├── client_updates                                         │
--    ├── client_assets                                          │
--    ├── notifications                                          │
--    ├── activity_log                                           │
--    ├── magic_links                                            │
--    ├── profile_activity                                       │
--    ├── profile_media                                          │
--    ├── saved_designs                                          │
--    └── reviews                                               │
--                                                              │
--  profiles (auth users / admins) ──────────────────────────────┘
--
--  Independent tables:
--    auth_events, login_attempts, rate_limits,
--    phone_verifications, contact_submissions,
--    avatar_presets, discounts, packages
-- ================================================================
