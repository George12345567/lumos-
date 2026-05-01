-- ================================================================
-- LUMOS PROJECT - ADVANCED SMART DATABASE SCHEMA
-- Intelligent Schema with AI Features & Advanced Relations
-- Generated from Deep UI Analysis
-- ================================================================

-- ================================================================
-- EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================
-- ENUMS
-- ================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'client', 'guest');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contact_status AS ENUM ('new', 'read', 'contacted', 'converted', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pricing_status AS ENUM ('draft', 'pending', 'reviewing', 'approved', 'rejected', 'converted');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE design_status AS ENUM ('draft', 'active', 'archived', 'featured', 'shared');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE service_type AS ENUM ('restaurant', 'cafe', 'salon', 'pharmacy', 'store', 'clinic', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE package_type AS ENUM ('starter', 'professional', 'enterprise', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'expired', 'cancelled', 'paused');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_sender AS ENUM ('client', 'admin', 'system', 'assistant');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ================================================================
-- CORE TABLES
-- ================================================================

-- ─────────────────────────────────────────────────────────────────
-- TABLE: users (Unified User System)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'client', 'guest')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_status ON public.users(status);
CREATE INDEX idx_users_created_at ON public.users(created_at);
CREATE INDEX idx_users_email_gin ON public.users USING gin(email gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: user_profiles (Extended Profile Data)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Basic Info
    full_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    avatar_style TEXT DEFAULT 'default',
    avatar_seed TEXT,
    avatar_config JSONB DEFAULT '{}',
    bio TEXT,
    tagline TEXT,
    
    -- Company Info
    company_name TEXT,
    brand_identity TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    cover_gradient TEXT,
    brand_colors TEXT[] DEFAULT '{}',
    website TEXT,
    
    -- Location
    location TEXT,
    timezone TEXT DEFAULT 'UTC',
    language_preference TEXT DEFAULT 'en',
    
    -- Social
    social_links JSONB DEFAULT '{}',
    
    -- Preferences
    theme_preference TEXT DEFAULT 'light',
    theme_accent TEXT DEFAULT '#6366f1',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
    privacy_settings JSONB DEFAULT '{"profile_visible": true, "show_email": false, "show_phone": false}',
    
    -- AI Assistant
    ai_assistant_enabled BOOLEAN DEFAULT true,
    ai_assistant_name TEXT DEFAULT 'Lumos AI',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_company_name ON public.user_profiles(company_name);
CREATE INDEX idx_user_profiles_gin ON public.user_profiles USING gin(company_name gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: user_security (Security & Authentication)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.user_security (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    
    security_question TEXT,
    security_answer_hash TEXT,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret TEXT,
    two_factor_backup_codes TEXT[],
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    password_history JSONB DEFAULT '[]',
    
    -- MFA
    mfa_methods JSONB DEFAULT '[]',
    preferred_mfa_method TEXT,
    
    -- Session
    last_session_id UUID,
    last_session_ip TEXT,
    last_session_user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_security_user_id ON public.user_security(user_id);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: subscriptions (Subscription Management)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    package_type TEXT DEFAULT 'starter',
    package_name TEXT,
    price_amount NUMERIC(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    billing_cycle TEXT DEFAULT 'monthly',
    status TEXT DEFAULT 'trial',
    
    -- Limits
    max_projects INTEGER DEFAULT 3,
    max_storage_mb INTEGER DEFAULT 500,
    max_bandwidth_gb INTEGER DEFAULT 10,
    projects_used INTEGER DEFAULT 0,
    storage_used_mb INTEGER DEFAULT 0,
    
    -- Dates
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    trial_end_date DATE,
    cancelled_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT true,
    
    -- Payment
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    payment_method TEXT,
    last_payment_at TIMESTAMPTZ,
    next_billing_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: packages (Pricing Packages)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'starter',
    price_monthly NUMERIC(10,2) NOT NULL,
    price_yearly NUMERIC(10,2),
    currency TEXT DEFAULT 'USD',
    
    -- Features
    features JSONB DEFAULT '[]',
    limitations JSONB DEFAULT '{}',
    
    -- Limits
    max_projects INTEGER DEFAULT 1,
    max_storage_mb INTEGER DEFAULT 100,
    max_team_members INTEGER DEFAULT 1,
    custom_domain BOOLEAN DEFAULT false,
    analytics BOOLEAN DEFAULT false,
    priority_support BOOLEAN DEFAULT false,
    api_access BOOLEAN DEFAULT false,
    
    -- Display
    is_popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_packages_slug ON public.packages(slug);
CREATE INDEX idx_packages_type ON public.packages(type);
CREATE INDEX idx_packages_active ON public.packages(is_active);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: orders (Order Management)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    company_name TEXT,
    
    package_type TEXT,
    package_name TEXT,
    original_price NUMERIC(10,2),
    discount_amount NUMERIC(10,2) DEFAULT 0,
    discount_code TEXT,
    total_price NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    -- Details
    plan_details JSONB,
    package_payload JSONB,
    auto_collected_data JSONB,
    location_url TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    fulfillment_status TEXT DEFAULT 'pending',
    
    -- Notes
    notes TEXT,
    admin_notes TEXT,
    internal_tags TEXT[],
    
    -- Tracking
    source TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    
    -- Timestamps
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_subscription_id ON public.orders(subscription_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_client_phone ON public.orders(client_phone);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_orders_total_price ON public.orders(total_price);

-- ──────��──────────────────────────────────────────────────────────
-- TABLE: contacts (Contact Form Submissions)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    business_name TEXT,
    industry TEXT,
    service_needed TEXT,
    message TEXT,
    
    -- Source Tracking
    source TEXT,
    referrer_url TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    
    -- Auto Data
    auto_collected_data JSONB,
    location_url TEXT,
    browser_data JSONB,
    
    -- Status
    status TEXT DEFAULT 'new',
    priority TEXT DEFAULT 'normal',
    assigned_to UUID REFERENCES public.users(id),
    
    -- Management
    tags TEXT[],
    admin_notes TEXT,
    
    -- Follow-up
    contacted_by UUID REFERENCES public.users(id),
    contacted_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_assigned_to ON public.contacts(assigned_to);
CREATE INDEX idx_contacts_created_at ON public.contacts(created_at);
CREATE INDEX idx_contacts_business_name ON public.contacts(business_name);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: pricing_requests (Pricing Inquiries)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.pricing_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    request_type TEXT DEFAULT 'package',
    status TEXT DEFAULT 'pending',
    
    -- Package Info
    package_id UUID REFERENCES public.packages(id),
    package_name TEXT,
    custom_requirements JSONB,
    
    -- Selected Services
    selected_services JSONB DEFAULT '[]',
    
    -- Pricing
    estimated_subtotal NUMERIC(10,2) DEFAULT 0,
    estimated_discount NUMERIC(10,2) DEFAULT 0,
    estimated_total NUMERIC(10,2) DEFAULT 0,
    final_price NUMERIC(10,2),
    currency TEXT DEFAULT 'USD',
    
    -- Customer Info
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    company_name TEXT,
    
    -- Client Snapshot
    client_snapshot JSONB,
    
    -- Notes
    request_notes TEXT,
    admin_notes TEXT,
    
    -- Conversion
    converted_order_id UUID REFERENCES public.orders(id),
    converted_at TIMESTAMPTZ,
    
    -- Tracking
    source TEXT,
    location_url TEXT,
    auto_collected_data JSONB,
    
    -- Review
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    review_comments TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pricing_requests_user_id ON public.pricing_requests(user_id);
CREATE INDEX idx_pricing_requests_package_id ON public.pricing_requests(package_id);
CREATE INDEX idx_pricing_requests_status ON public.pricing_requests(status);
CREATE INDEX idx_pricing_requests_converted_order_id ON public.pricing_requests(converted_order_id);
CREATE INDEX idx_pricing_requests_created_at ON public.pricing_requests(created_at);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: designs (Saved Design Configurations)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Identity
    business_name TEXT NOT NULL,
    business_slug TEXT,
    tagline TEXT,
    bio TEXT,
    logo_emoji TEXT,
    
    -- Service
    service_type TEXT NOT NULL,
    service_categories TEXT[],
    
    -- Theme
    selected_theme TEXT,
    custom_theme JSONB DEFAULT '{"primary": "#6366f1", "accent": "#8b5cf6", "gradient": "linear-gradient"}',
    color_palette JSONB DEFAULT '{}',
    
    -- Template
    selected_template TEXT,
    template_version TEXT,
    layout_config JSONB DEFAULT '{}',
    
    -- Display Options
    is_dark_mode BOOLEAN DEFAULT false,
    glass_effect BOOLEAN DEFAULT false,
    active_texture TEXT,
    font_family TEXT DEFAULT 'default',
    font_size INTEGER DEFAULT 16,
    view_mode TEXT DEFAULT 'grid',
    device_view TEXT DEFAULT 'desktop',
    
    -- 3D Effects
    enable_3d BOOLEAN DEFAULT false,
    rotation_x INTEGER DEFAULT 0,
    rotation_y INTEGER DEFAULT 0,
    perspective TEXT DEFAULT '1000',
    
    -- Content Options
    show_ratings BOOLEAN DEFAULT true,
    show_time BOOLEAN DEFAULT true,
    show_featured BOOLEAN DEFAULT true,
    show_prices BOOLEAN DEFAULT true,
    image_quality TEXT DEFAULT 'standard',
    sort_by TEXT DEFAULT 'name',
    
    -- Items
    custom_items JSONB DEFAULT '[]',
    all_items JSONB DEFAULT '[]',
    favorites INTEGER[] DEFAULT '{}',
    cart_items JSONB DEFAULT '{}',
    
    -- Hours
    operating_hours JSONB DEFAULT '{}',
    
    -- AI Suggestions
    ai_suggestions JSONB DEFAULT '[]',
    brand_personality TEXT DEFAULT 'friendly',
    
    -- Stats
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'draft',
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    
    -- SEO
    meta_title TEXT,
    meta_description TEXT,
    custom_domain TEXT,
    
    -- Visitor Data
    visitor_name TEXT,
    visitor_email TEXT,
    visitor_phone TEXT,
    visitor_note TEXT,
    browser_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_edited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_designs_user_id ON public.designs(user_id);
CREATE INDEX idx_designs_service_type ON public.designs(service_type);
CREATE INDEX idx_designs_status ON public.designs(status);
CREATE INDEX idx_designs_is_published ON public.designs(is_published);
CREATE INDEX idx_designs_business_name ON public.designs(business_name);
CREATE INDEX idx_designs_gin ON public.designs USING gin(business_name gin_trgm_ops);
CREATE INDEX idx_designs_created_at ON public.designs(created_at);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: design_items (Menu/Catalog Items)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.design_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_id UUID REFERENCES public.designs(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    description_ar TEXT,
    price NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'EGP',
    
    image_url TEXT,
    image_gallery TEXT[],
    image_quality TEXT DEFAULT 'standard',
    
    -- Properties
    featured BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    tags TEXT[],
    
    -- Dynamic Fields
    time_needed TEXT,
    calories INTEGER,
    allergens TEXT[],
    nutritional_info JSONB,
    customization_options JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_design_items_design_id ON public.design_items(design_id);
CREATE INDEX idx_design_items_category ON public.design_items(category);
CREATE INDEX idx_design_items_featured ON public.design_items(featured);
CREATE INDEX idx_design_items_position ON public.design_items(position);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: categories (Content Categories)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_id UUID REFERENCES public.designs(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    name_ar TEXT,
    slug TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    show_item_count BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_design_id ON public.categories(design_id);
CREATE INDEX idx_categories_slug ON public.categories(slug);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: messages (Chat/Messaging System)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    sender_id UUID REFERENCES public.users(id),
    sender_type TEXT NOT NULL,
    sender_name TEXT,
    
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    attachments JSONB DEFAULT '[]',
    
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}',
    ai_generated BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_is_read ON public.messages(is_read);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: conversations (Chat Conversations)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.users(id),
    
    subject TEXT,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'normal',
    
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    unread_count INTEGER DEFAULT 0,
    
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES public.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_assigned_to ON public.conversations(assigned_to);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: user_updates (Milestones & Activity)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.user_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'update',
    
    icon TEXT,
    color TEXT,
    
    is_important BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_updates_user_id ON public.user_updates(user_id);
CREATE INDEX idx_user_updates_type ON public.user_updates(type);
CREATE INDEX idx_user_updates_created_at ON public.user_updates(created_at);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: assets (File Uploads)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    original_name TEXT,
    file_type TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER,
    
    storage_path TEXT NOT NULL,
    public_url TEXT,
    thumbnail_url TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    alt_text TEXT,
    title TEXT,
    description TEXT,
    
    -- Usage
    used_in_designs UUID[] DEFAULT '{}',
    used_in_orders UUID[] DEFAULT '{}',
    
    scan_status TEXT DEFAULT 'pending',
    virus_scan_result JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_assets_file_type ON public.assets(file_type);
CREATE INDEX idx_assets_created_at ON public.assets(created_at);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: reviews (User Reviews)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    design_id UUID REFERENCES public.designs(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,
    
    reviewer_name TEXT,
    reviewer_email TEXT,
    
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    
    helpful_count INTEGER DEFAULT 0,
    report_count INTEGER DEFAULT 0,
    report_reason TEXT,
    
    response TEXT,
    responded_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_design_id ON public.reviews(design_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_reviews_is_approved ON public.reviews(is_approved);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: discounts (Discount Codes)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    code_type TEXT DEFAULT 'percentage',
    
    discount_value NUMERIC(10,2) NOT NULL,
    max_discount_amount NUMERIC(10,2),
    
    min_order_amount NUMERIC(10,2),
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    uses_per_user INTEGER,
    
    applicable_packages UUID[],
    applicable_categories TEXT[],
    exclude_items UUID[],
    
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT true,
    is_stackable BOOLEAN DEFAULT false,
    
    description TEXT,
    terms TEXT,
    
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discounts_code ON public.discounts(code);
CREATE INDEX idx_discounts_is_active ON public.discounts(is_active);
CREATE INDEX idx_discounts_valid_from ON public.discounts(valid_from);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: analytics_events (Advanced Analytics)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_id UUID,
    
    -- Event Data
    event_name TEXT NOT NULL,
    event_category TEXT,
    event_data JSONB DEFAULT '{}',
    
    -- Page Info
    page_url TEXT,
    page_title TEXT,
    referrer_url TEXT,
    
    -- Device Info
    device_type TEXT,
    browser TEXT,
    os TEXT,
    screen_resolution TEXT,
    
    -- Location
    country TEXT,
    city TEXT,
    ip_address TEXT,
    
    -- UTM
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_session ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_events_timestamp ON public.analytics_events(timestamp);

-- ─────────────────────────────────────────────────��─��─────────────
-- TABLE: user_activity_log (Activity Tracking)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    activity_type TEXT NOT NULL,
    description TEXT,
    entity_type TEXT,
    entity_id UUID,
    
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_type ON public.user_activity_log(activity_type);
CREATE INDEX idx_user_activity_log_created_at ON public.user_activity_log(created_at);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: auth_events (Authentication Audit)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.auth_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    event_type TEXT NOT NULL,
    event_status TEXT NOT NULL,
    
    email TEXT,
    phone TEXT,
    ip_address TEXT,
    user_agent TEXT,
    
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_events_user_id ON public.auth_events(user_id);
CREATE INDEX idx_auth_events_type ON public.auth_events(event_type);
CREATE INDEX idx_auth_events_created_at ON public.auth_events(created_at);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: rate_limits (Rate Limiting)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL,
    action TEXT NOT NULL,
    
    count INTEGER DEFAULT 0,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    window_end TIMESTAMPTZ,
    
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_identifier ON public.rate_limits(identifier);
CREATE INDEX idx_rate_limits_window_start ON public.rate_limits(window_start);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: magic_links (Magic Link Tokens)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.magic_links (
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

CREATE INDEX idx_magic_links_email ON public.magic_links(email);
CREATE INDEX idx_magic_links_token ON public.magic_links(token);
CREATE INDEX idx_magic_links_expires_at ON public.magic_links(expires_at);

-- ���─���──────────────────────────────────────────────────────────────
-- TABLE: phone_verifications (OTP)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.phone_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    
    expires_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    ip_address TEXT,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_phone_verifications_phone ON public.phone_verifications(phone);
CREATE INDEX idx_phone_verifications_token ON public.phone_verifications(code);
CREATE INDEX idx_phone_verifications_expires_at ON public.phone_verifications(expires_at);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: avatar_presets (AI Avatar Styles)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.avatar_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    style TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    
    default_colors TEXT[],
    available_patterns TEXT[],
    complexity_range INTEGER[],
    
    preview_url TEXT,
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    display_order INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_avatar_presets_style ON public.avatar_presets(style);
CREATE INDEX idx_avatar_presets_active ON public.avatar_presets(is_active);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: notifications (Notification System)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    
    data JSONB DEFAULT '{}',
    link TEXT,
    
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    priority TEXT DEFAULT 'normal',
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- ─────────────────────────────────────────────────────────────────
-- TABLE: sessions (User Sessions)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    token TEXT UNIQUE NOT NULL,
    device_info JSONB,
    ip_address TEXT,
    user_agent TEXT,
    
    is_active BOOLEAN DEFAULT true,
    last_active_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_token ON public.sessions(token);
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at);

-- ================================================================
-- ADVANCED RELATIONSHIPS & TRIGGERS
-- ================================================================

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_security_updated_at ON public.user_security;
CREATE TRIGGER update_user_security_updated_at BEFORE UPDATE ON public.user_security FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pricing_requests_updated_at ON public.pricing_requests;
CREATE TRIGGER update_pricing_requests_updated_at BEFORE UPDATE ON public.pricing_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_designs_updated_at ON public.designs;
CREATE TRIGGER update_designs_updated_at BEFORE UPDATE ON public.designs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_design_items_updated_at ON public.design_items;
CREATE TRIGGER update_design_items_updated_at BEFORE UPDATE ON public.design_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assets_updated_at ON public.assets;
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_discounts_updated_at ON public.discounts;
CREATE TRIGGER update_discounts_updated_at BEFORE UPDATE ON public.discounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- SMART FUNCTIONS
-- ================================================================

-- Function: Get user with profile
CREATE OR REPLACE FUNCTION public.get_user_with_profile(user_identifier TEXT)
RETURNS TABLE(
    id UUID,
    username TEXT,
    email TEXT,
    phone TEXT,
    role TEXT,
    status TEXT,
    full_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    company_name TEXT,
    package_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.email,
        u.phone,
        u.role,
        u.status,
        up.full_name,
        up.display_name,
        up.avatar_url,
        up.company_name,
        s.package_name
    FROM public.users u
    LEFT JOIN public.user_profiles up ON up.user_id = u.id
    LEFT JOIN public.subscriptions s ON s.user_id = u.id AND s.status = 'active'
    WHERE u.email = user_identifier OR u.username = user_identifier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate design completeness score
CREATE OR REPLACE FUNCTION public.calculate_design_score(design_uuid UUID)
RETURNS NUMERIC(5,2) AS $$
DECLARE
    score NUMERIC(5,2) := 0;
    d public.designs%ROWTYPE;
BEGIN
    SELECT * INTO d FROM public.designs WHERE id = design_uuid;
    
    IF d.business_name IS NOT NULL AND d.business_name != '' THEN
        score := score + 10;
    END IF;
    
    IF d.selected_theme IS NOT NULL THEN
        score := score + 10;
    END IF;
    
    IF d.selected_template IS NOT NULL THEN
        score := score + 10;
    END IF;
    
    IF d.brand_identity IS NOT NULL AND d.brand_identity != '' THEN
        score := score + 10;
    END IF;
    
    IF d.logo_emoji IS NOT NULL THEN
        score := score + 5;
    END IF;
    
    IF d.tagline IS NOT NULL AND d.tagline != '' THEN
        score := score + 5;
    END IF;
    
    IF d.custom_items IS NOT NULL AND jsonb_array_length(d.custom_items) > 0 THEN
        score := score + 15;
    END IF;
    
    IF d.operating_hours IS NOT NULL AND jsonb_object_keys(d.operating_hours) IS NOT NULL THEN
        score := score + 10;
    END IF;
    
    IF d.is_published THEN
        score := score + 15;
    END IF;
    
    RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get dashboard stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(admin_user_id UUID)
RETURNS TABLE(
    total_users BIGINT,
    active_users BIGINT,
    total_orders BIGINT,
    total_revenue NUMERIC,
    total_contacts BIGINT,
    new_contacts BIGINT,
    total_pricing_requests BIGINT,
    pending_pricing BIGINT,
    total_designs BIGINT,
    active_designs BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.users)::BIGINT AS total_users,
        (SELECT COUNT(*) FROM public.users WHERE status = 'active')::BIGINT AS active_users,
        (SELECT COUNT(*) FROM public.orders)::BIGINT AS total_orders,
        (SELECT COALESCE(SUM(total_price), 0) FROM public.orders WHERE status = 'completed')::NUMERIC AS total_revenue,
        (SELECT COUNT(*) FROM public.contacts)::BIGINT AS total_contacts,
        (SELECT COUNT(*) FROM public.contacts WHERE status = 'new')::BIGINT AS new_contacts,
        (SELECT COUNT(*) FROM public.pricing_requests)::BIGINT AS total_pricing_requests,
        (SELECT COUNT(*) FROM public.pricing_requests WHERE status = 'pending')::BIGINT AS pending_pricing,
        (SELECT COUNT(*) FROM public.designs)::BIGINT AS total_designs,
        (SELECT COUNT(*) FROM public.designs WHERE status = 'active')::BIGINT AS active_designs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- User Policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- User Profile Policies
CREATE POLICY "Profile viewable by owner or admin" ON public.user_profiles FOR SELECT 
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Orders Policies
CREATE POLICY "Orders accessible to owner or admin" ON public.orders FOR SELECT 
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Designs Policies
CREATE POLICY "Designs viewable by owner or admin" ON public.designs FOR SELECT 
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Designs updatable by owner" ON public.designs FOR UPDATE USING (user_id = auth.uid());

-- Messages Policies
CREATE POLICY "Messages viewable by participants" ON public.messages FOR SELECT 
    USING (sender_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR c.assigned_to = auth.uid())
    ));

-- Notifications Policies
CREATE POLICY "Notifications viewable by owner" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Notifications updatable by owner" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- ================================================================
-- STORAGE BUCKET
-- ================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-assets', 'User Assets', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4'])
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Users can upload own assets" ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'user-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own assets" ON storage.objects FOR SELECT 
    USING (bucket_id = 'user-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own assets" ON storage.objects FOR DELETE 
    USING (bucket_id = 'user-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ================================================================
-- SEED DATA: Avatar Presets
-- ================================================================
INSERT INTO public.avatar_presets (style, name, name_ar, description, default_colors, available_patterns, complexity_range, is_active, display_order) VALUES
('default', 'Default', 'افتراضي', 'Simple default avatar', ARRAY['#6366f1'], ARRAY['solid'], ARRAY[1, 3], true, 1),
('robot', 'Robot', 'روبو', 'Cute robot style', ARRAY['#3b82f6', '#60a5fa'], ARRAY['classic', 'modern', 'futuristic'], ARRAY[1, 5], true, 2),
('animal', 'Animal', 'حيوان', 'Animal avatars', ARRAY['#f59e0b', '#10b981'], ARRAY['cat', 'dog', 'fox', 'bear'], ARRAY[1, 4], true, 3),
('avatar', 'Human', 'شخص', 'Human-like avatars', ARRAY['#f472b6', '#fb7185'], ARRAY['casual', 'formal', 'creative'], ARRAY[1, 3], true, 4),
('miniavs', 'Mini Avs', 'ميني افز', 'Minimal avatars', ARRAY['#8b5cf6', '#a78bfa'], ARRAY['circle', 'square', 'hexagon'], ARRAY[1, 2], true, 5),
('funEmoji', 'Fun Emoji', 'إيموجي', 'Fun emoji style', ARRAY['#fbbf24', '#f59e0b'], ARRAY['happy', 'cool', 'fun'], ARRAY[1, 3], true, 6),
('initials', 'Initials', 'حروف', 'Initials based', ARRAY['#1e293b', '#334155'], ARRAY['circle', 'badge', 'shield'], ARRAY[1, 1], true, 7),
('personas', 'Personas', 'شخصيات', 'Character personas', ARRAY['#ec4899', '#8b5cf6'], ARRAY['hero', 'villain', 'antihero'], ARRAY[1, 5], true, 8),
('bottts', 'Bots', 'بوتس', 'Bot characters', ARRAY['#06b6d4', '#0ea5e9'], ARRAY['friendly', 'neutral', 'mysterious'], ARRAY[1, 4], true, 9),
('thumbs', 'Thumbs', 'إبهام', 'Thumb characters', ARRAY['#84cc16', '#22c55e'], ARRAY['up', 'down', 'shrug'], ARRAY[1, 2], true, 10),
('lorelei', 'Lorelei', 'لوريلي', 'Fantasy style', ARRAY['#a855f7', '#d8b4fe'], ARRAY['elf', 'witch', 'fairy'], ARRAY[1, 5], true, 11),
('adventurer', 'Adventurer', 'مغامر', 'Adventure characters', ARRAY['#f97316', '#fb923c'], ARRAY['knight', 'mage', 'rogue'], ARRAY[1, 4], true, 12),
('micah', 'Micah', 'ميكا', 'Modern style', ARRAY['#14b8a6', '#2dd4bf'], ARRAY['simple', 'detailed'], ARRAY[1, 3], true, 13),
('notionists', 'Notionist', 'نوتشيون', 'Abstract style', ARRAY['#64748b', '#94a3b8'], ARRAY['abstract', 'geometric', 'wave'], ARRAY[1, 4], true, 14),
('open_peeps', 'Open Peeps', 'بيبس', 'Open style', ARRAY['#f43f5e', '#fb7185'], ARRAY['happy', 'serious', 'excited'], ARRAY[1, 3], true, 15)
ON CONFLICT (style) DO NOTHING;

-- ================================================================
-- SEED DATA: Packages
-- ================================================================
INSERT INTO public.packages (name, slug, description, type, price_monthly, price_yearly, features, max_projects, max_storage_mb, is_popular, is_active, display_order) VALUES
('Basic', 'basic', 'Perfect for small businesses getting started', 'starter', 99.00, 990.00, 
 '["Basic Website", "5 Pages", "Mobile Responsive", "Contact Form", "Basic Analytics"]', 1, 100, false, true, 1),
('Professional', 'professional', 'Best for growing businesses', 'professional', 199.00, 1990.00,
 '["Professional Website", "15 Pages", "SEO Optimization", "Advanced Analytics", "Priority Support", "Custom Domain", "Remove Watermark"]', 5, 500, true, true, 2),
('Enterprise', 'enterprise', 'Complete solution for large businesses', 'enterprise', 499.00, 4990.00,
 '["Full Website", "Unlimited Pages", "E-commerce", "API Access", "24/7 Support", "White Label", "Multi-user", "Advanced Security"]', -1, -1, false, true, 3)
ON CONFLICT (slug) DO NOTHING;

-- ================================================================
-- COMPLETE SCHEMA ENDS
-- ================================================================