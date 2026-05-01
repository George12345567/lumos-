-- ================================================================
-- LUMOS PROJECT - DATABASE SCHEMA
-- Complete database schema for Supabase backend
-- ================================================================

-- ================================================================
-- EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- ENUMS
-- ================================================================
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contact_status AS ENUM ('new', 'read', 'contacted', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pricing_request_status AS ENUM ('new', 'reviewing', 'approved', 'converted', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pricing_request_type AS ENUM ('package', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE design_status AS ENUM ('active', 'archived', 'featured');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE client_role AS ENUM ('admin', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ================================================================
-- TABLE: clients (Main User/Client Table)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,
    password_hash TEXT,
    company_name TEXT,
    brand_identity TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    brand_colors TEXT[],
    website TEXT,
    security_question TEXT,
    security_answer TEXT,
    package_name TEXT,
    package_details JSONB,
    subscription_config JSONB,
    status TEXT DEFAULT 'active',
    progress INTEGER DEFAULT 0,
    next_steps TEXT,
    admin_notes TEXT,
    active_offer TEXT,
    active_offer_link TEXT,
    role TEXT DEFAULT 'client',
    avatar_style TEXT,
    avatar_seed TEXT,
    avatar_config JSONB,
    avatar_url TEXT,
    display_name TEXT,
    bio TEXT,
    tagline TEXT,
    location TEXT,
    timezone TEXT,
    social_links JSONB,
    theme_accent TEXT,
    profile_visible BOOLEAN DEFAULT true,
    cover_gradient TEXT,
    verified_email BOOLEAN DEFAULT false,
    is_phone_verified BOOLEAN DEFAULT false,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    two_factor_secret TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for clients
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_username ON public.clients(username);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_role ON public.clients(role);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- TABLE: profiles (Extended Profile Data)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
    avatar_style TEXT,
    avatar_seed TEXT,
    avatar_config JSONB,
    avatar_url TEXT,
    display_name TEXT,
    bio TEXT,
    tagline TEXT,
    website TEXT,
    location TEXT,
    timezone TEXT DEFAULT 'UTC',
    social_links JSONB DEFAULT '{}',
    brand_colors TEXT[],
    logo_url TEXT,
    cover_gradient TEXT,
    theme_accent TEXT,
    profile_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON public.profiles(client_id);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- TABLE: orders
-- ================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    package_type TEXT,
    total_price NUMERIC(10,2) DEFAULT 0,
    original_price NUMERIC(10,2),
    discount_amount NUMERIC(10,2),
    plan_details JSONB,
    auto_collected_data JSONB,
    location_url TEXT,
    package_payload JSONB,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- TABLE: contacts (Contact Form Submissions)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    business_name TEXT,
    industry TEXT,
    service_needed TEXT,
    message TEXT,
    source TEXT,
    auto_collected_data JSONB,
    location_url TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- TABLE: pricing_requests
-- ================================================================
CREATE TABLE IF NOT EXISTS public.pricing_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    request_type TEXT DEFAULT 'package',
    status TEXT DEFAULT 'new',
    request_source TEXT,
    package_id TEXT,
    package_name TEXT,
    selected_services JSONB,
    estimated_subtotal NUMERIC(10,2) DEFAULT 0,
    estimated_total NUMERIC(10,2) DEFAULT 0,
    price_currency TEXT DEFAULT 'USD',
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    company_name TEXT,
    client_snapshot JSONB,
    request_notes TEXT,
    admin_notes TEXT,
    converted_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    location_url TEXT,
    auto_collected_data JSONB,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for pricing_requests
CREATE INDEX IF NOT EXISTS idx_pricing_requests_client_id ON public.pricing_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_pricing_requests_status ON public.pricing_requests(status);
CREATE INDEX IF NOT EXISTS idx_pricing_requests_created_at ON public.pricing_requests(created_at);

DROP TRIGGER IF EXISTS update_pricing_requests_updated_at ON public.pricing_requests;
CREATE TRIGGER update_pricing_requests_updated_at
    BEFORE UPDATE ON public.pricing_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- TABLE: saved_designs
-- ================================================================
CREATE TABLE IF NOT EXISTS public.saved_designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    business_name TEXT,
    service_type TEXT,
    selected_theme TEXT,
    custom_theme JSONB,
    selected_template TEXT,
    is_dark_mode BOOLEAN DEFAULT false,
    glass_effect BOOLEAN DEFAULT false,
    active_texture TEXT,
    font_size INTEGER DEFAULT 16,
    view_mode TEXT DEFAULT 'grid',
    device_view TEXT DEFAULT 'desktop',
    enable_3d BOOLEAN DEFAULT false,
    rotation_x INTEGER DEFAULT 0,
    rotation_y INTEGER DEFAULT 0,
    show_ratings BOOLEAN DEFAULT true,
    show_time BOOLEAN DEFAULT true,
    show_featured BOOLEAN DEFAULT false,
    image_quality TEXT DEFAULT 'high',
    sort_by TEXT DEFAULT 'name',
    custom_items JSONB DEFAULT '[]',
    cart_items JSONB DEFAULT '{}',
    favorites INTEGER[] DEFAULT '{}',
    visitor_name TEXT,
    visitor_email TEXT,
    visitor_phone TEXT,
    visitor_note TEXT,
    browser_data JSONB,
    status TEXT DEFAULT 'active',
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for saved_designs
CREATE INDEX IF NOT EXISTS idx_saved_designs_client_id ON public.saved_designs(client_id);
CREATE INDEX IF NOT EXISTS idx_saved_designs_status ON public.saved_designs(status);
CREATE INDEX IF NOT EXISTS idx_saved_designs_service_type ON public.saved_designs(service_type);
CREATE INDEX IF NOT EXISTS idx_saved_designs_created_at ON public.saved_designs(created_at);

DROP TRIGGER IF EXISTS update_saved_designs_updated_at ON public.saved_designs;
CREATE TRIGGER update_saved_designs_updated_at
    BEFORE UPDATE ON public.saved_designs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- TABLE: client_messages
-- ================================================================
CREATE TABLE IF NOT EXISTS public.client_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for client_messages
CREATE INDEX IF NOT EXISTS idx_client_messages_client_id ON public.client_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_is_read ON public.client_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_client_messages_created_at ON public.client_messages(created_at);

-- ================================================================
-- TABLE: client_updates
-- ================================================================
CREATE TABLE IF NOT EXISTS public.client_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'update',
    description TEXT,
    update_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for client_updates
CREATE INDEX IF NOT EXISTS idx_client_updates_client_id ON public.client_updates(client_id);
CREATE INDEX IF NOT EXISTS idx_client_updates_update_date ON public.client_updates(update_date);

-- ================================================================
-- TABLE: client_assets (File Uploads)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.client_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for client_assets
CREATE INDEX IF NOT EXISTS idx_client_assets_client_id ON public.client_assets(client_id);
CREATE INDEX IF NOT EXISTS idx_client_assets_asset_type ON public.client_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_client_assets_created_at ON public.client_assets(created_at);

-- ================================================================
-- TABLE: auth_events (Authentication Event Logging)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.auth_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    email TEXT,
    phone TEXT,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for auth_events
CREATE INDEX IF NOT EXISTS idx_auth_events_client_id ON public.auth_events(client_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_event_type ON public.auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON public.auth_events(created_at);

-- ================================================================
-- TABLE: rate_limits
-- ================================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL,
    action TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    window_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rate_limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON public.rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);

-- ================================================================
-- TABLE: magic_links
-- ================================================================
CREATE TABLE IF NOT EXISTS public.magic_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for magic_links
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON public.magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON public.magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON public.magic_links(expires_at);

-- ================================================================
-- TABLE: login_attempts
-- ================================================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    email TEXT,
    ip_address TEXT,
    success BOOLEAN DEFAULT false,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for login_attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_client_id ON public.login_attempts(client_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON public.login_attempts(ip_address);

-- ================================================================
-- TABLE: profile_activity (Profile Activity Log)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profile_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profile_activity
CREATE INDEX IF NOT EXISTS idx_profile_activity_client_id ON public.profile_activity(client_id);
CREATE INDEX IF NOT EXISTS idx_profile_activity_created_at ON public.profile_activity(created_at);

-- ================================================================
-- RLS POLICIES (Row Level Security)
-- ================================================================

-- Clients table - Clients can read own data, Admin can read all
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own profile"
    ON public.clients FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Clients can update own profile"
    ON public.clients FOR UPDATE
    USING (auth.uid() = id);

-- Profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by owner or admin"
    ON public.profiles FOR SELECT
    USING (
        client_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Profiles are updatable by owner"
    ON public.profiles FOR UPDATE
    USING (client_id = auth.uid());

-- Orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own orders"
    ON public.orders FOR SELECT
    USING (
        client_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND role = 'admin')
    );

-- Contacts table - Admin only
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage contacts"
    ON public.contacts FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND role = 'admin')
    );

-- Pricing Requests table
ALTER TABLE public.pricing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pricing requests accessible to owner or admin"
    ON public.pricing_requests FOR SELECT
    USING (
        client_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND role = 'admin')
    );

-- Saved Designs table
ALTER TABLE public.saved_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Designs viewable by owner or admin"
    ON public.saved_designs FOR SELECT
    USING (
        client_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Designs updatable by owner"
    ON public.saved_designs FOR UPDATE
    USING (client_id = auth.uid());

CREATE POLICY "Designs deletable by owner"
    ON public.saved_designs FOR DELETE
    USING (client_id = auth.uid());

-- Client Messages table
ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages accessible to owner or admin"
    ON public.client_messages FOR SELECT
    USING (
        client_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND role = 'admin')
    );

-- ================================================================
-- STORAGE BUCKET (File Storage)
-- ================================================================

-- Create client-assets bucket for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'client-assets',
    'Client Assets',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Clients can upload own assets"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'client-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Clients can view own assets"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'client-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Clients can update own assets"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'client-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Clients can delete own assets"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'client-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ================================================================
-- FUNCTIONS
-- ================================================================

-- Function to get client by email or username
CREATE OR REPLACE FUNCTION public.get_client_by_identifier(identifier TEXT)
RETURNS TABLE(
    id UUID,
    username TEXT,
    email TEXT,
    company_name TEXT,
    role TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.username,
        c.email,
        c.company_name,
        c.role,
        c.status
    FROM public.clients c
    WHERE c.email = get_client_by_identifier.identifier
       OR c.username = get_client_by_identifier.identifier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count orders by status
CREATE OR REPLACE FUNCTION public.count_orders_by_status(p_status TEXT)
RETURNS BIGINT AS $$
DECLARE
    count BIGINT;
BEGIN
    SELECT COUNT(*) INTO count
    FROM public.orders o
    WHERE o.status = p_status;
    RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get dashboard stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE(
    total_orders BIGINT,
    total_revenue NUMERIC,
    total_contacts BIGINT,
    total_pricing_requests BIGINT,
    pending_orders BIGINT,
    completed_orders BIGINT,
    new_contacts BIGINT,
    new_pricing_requests BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.orders)::BIGINT AS total_orders,
        (SELECT COALESCE(SUM(total_price), 0) FROM public.orders WHERE status = 'completed')::NUMERIC AS total_revenue,
        (SELECT COUNT(*) FROM public.contacts)::BIGINT AS total_contacts,
        (SELECT COUNT(*) FROM public.pricing_requests)::BIGINT AS total_pricing_requests,
        (SELECT COUNT(*) FROM public.orders WHERE status = 'pending')::BIGINT AS pending_orders,
        (SELECT COUNT(*) FROM public.orders WHERE status = 'completed')::BIGINT AS completed_orders,
        (SELECT COUNT(*) FROM public.contacts WHERE status = 'new')::BIGINT AS new_contacts,
        (SELECT COUNT(*) FROM public.pricing_requests WHERE status = 'new')::BIGINT AS new_pricing_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;