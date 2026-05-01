-- ================================================================
-- MISSING TABLES - Add to existing database
-- These tables are referenced in the code but not in the main schema
-- ================================================================

-- ================================================================
-- TABLE: phone_verifications (SMS OTP_verification)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON public.phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at ON public.phone_verifications(expires_at);

-- ================================================================
-- TABLE: avatar_presets (Avatar Style Presets)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.avatar_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    style TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    default_colors TEXT[],
    available_patterns TEXT[],
    complexity_range NUMERIC[],
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avatar_presets_style ON public.avatar_presets(style);
CREATE INDEX IF NOT EXISTS idx_avatar_presets_is_active ON public.avatar_presets(is_active);

-- ================================================================
-- Seed data for avatar_presets
-- ================================================================
INSERT INTO public.avatar_presets (style, name, description, default_colors, available_patterns, complexity_range, is_active, display_order) VALUES
('nanoBanana', 'Nano Banana', 'Playful banana-shaped avatars', ARRAY['#FFE135', '#FFAC33', '#8B4513'], ARRAY['solid', 'gradient', 'striped'], ARRAY[1, 5], true, 1),
('cosmicDust', 'Cosmic Dust', 'Space-themed with stars and nebulas', ARRAY['#667EEA', '#764BA2', '#1A1A2E'], ARRAY['stars', 'nebula', 'galaxy', 'aurora'], ARRAY[1, 10], true, 2),
('liquidMetal', 'Liquid Metal', 'Metallic fluid appearance', ARRAY['#C0C0C0', '#A9A9A9', '#808080'], ARRAY['chrome', 'brushed', 'mirror'], ARRAY[1, 3], true, 3),
('crystalFacet', 'Crystal Facet', 'Geometric crystalline shapes', ARRAY['#00D4FF', '#0099CC', '#006699'], ARRAY['diamond', 'prism', 'gem'], ARRAY[1, 8], true, 4),
('neonPulse', 'Neon Pulse', 'Glowing neon style', ARRAY['#FF00FF', '#00FFFF', '#FF0080'], ARRAY['glow', 'pulse', 'wave'], ARRAY[1, 5], true, 5),
('holographic', 'Holographic', '3D holographic effect', ARRAY['#FF6B6B', '#4ECDC4', '#45B7D1'], ARRAY['rainbow', 'iridescent', 'shimmer'], ARRAY[1, 6], true, 6),
('origami', 'Origami', 'Paper fold art style', ARRAY['#E74C3C', '#3498DB', '#2ECC71'], ARRAY['bird', 'flower', 'heart', 'star'], ARRAY[1, 4], true, 7),
('photo', 'Photo', 'Real photo upload', ARRAY['#000000'], ARRAY['original', 'filter'], ARRAY[1, 1], true, 8),
('mesh', 'Mesh', 'Mesh network patterns', ARRAY['#3498DB', '#E74C3C', '#F39C12'], ARRAY['web', 'grid', 'nodes'], ARRAY[1, 5], true, 9),
('abstract', 'Abstract', 'Abstract art shapes', ARRAY['#9B59B6', '#E91E63', '#00BCD4'], ARRAY['waves', 'circles', 'blobs'], ARRAY[1, 10], true, 10),
('glass', 'Glass', 'Glass morphism effect', ARRAY['#FFFFFF', '#E0E0E0', '#BDBDBD'], ARRAY['frost', 'clear', 'tinted'], ARRAY[1, 3], true, 11),
('monogram', 'Monogram', 'Initials-based design', ARRAY['#2C3E50', '#34495E', '#1ABC9C'], ARRAY['circle', 'square', 'shield'], ARRAY[1, 2], true, 12),
('geometric', 'Geometric', 'Clean geometric shapes', ARRAY['#FF5722', '#795548', '#607D8B'], ARRAY['hexagon', 'triangle', 'circle'], ARRAY[1, 5], true, 13),
('pixel', 'Pixel', 'Retro pixel art', ARRAY['#FF0000', '#00FF00', '#0000FF'], ARRAY['8bit', '16bit', 'retro'], ARRAY[1, 4], true, 14)
ON CONFLICT (style) DO NOTHING;

-- ================================================================
-- Add missing columns to existing tables
-- ================================================================

-- Add user_id to auth_events (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_events' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.auth_events ADD COLUMN user_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add event column (if not exists - since code uses 'event')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_events' AND column_name = 'event'
    ) THEN
        ALTER TABLE public.auth_events ADD COLUMN event TEXT;
    END IF;
END $$;

-- Add key column to rate_limits (if not exists - since code uses 'key')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rate_limits' AND column_name = 'key'
    ) THEN
        ALTER TABLE public.rate_limits ADD COLUMN key TEXT;
    END IF;
END $$;

-- ================================================================
-- PACKAGES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    duration_days INTEGER,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_is_active ON public.packages(is_active);
CREATE INDEX IF NOT EXISTS idx_packages_price ON public.packages(price);

-- Seed data for packages
INSERT INTO public.packages (name, description, price, currency, duration_days, features, is_active, display_order) VALUES
('Starter', 'Perfect for small businesses', 99.00, 'USD', 30, ARRAY['Basic Website', '5 Pages', 'Mobile Responsive', 'Contact Form'], true, 1),
('Professional', 'Best for growing businesses', 199.00, 'USD', 30, ARRAY['Pro Website', '15 Pages', 'SEO Optimization', 'Analytics', 'Priority Support'], true, 2),
('Enterprise', 'Complete business solution', 499.00, 'USD', 365, ARRAY['Full Website', 'Unlimited Pages', 'E-commerce', 'Custom Domain', '24/7 Support', 'API Access'], true, 3)
ON CONFLICT DO NOTHING;

-- ================================================================
-- DISCOUNTS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS public.discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10,2) NOT NULL,
    min_order_amount NUMERIC(10,2),
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discounts_code ON public.discounts(code);
CREATE INDEX IF NOT EXISTS idx_discounts_is_active ON public.discounts(is_active);

-- ================================================================
-- REVIEWS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    item_id UUID,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_item_id ON public.reviews(item_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);