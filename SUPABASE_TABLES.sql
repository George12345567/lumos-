 -- Lumos Pricing System - Database Tables
-- Run this in Supabase SQL Editor

-- 1. PRICING_REQUESTS TABLE
CREATE TABLE IF NOT EXISTS pricing_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID,
    request_type TEXT NOT NULL CHECK (request_type IN ('package', 'custom')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'approved', 'converted', 'rejected')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID,
    package_id TEXT,
    package_name TEXT,
    selected_services JSONB NOT NULL DEFAULT '[]',
    estimated_subtotal NUMERIC(12,2) NOT NULL,
    estimated_total NUMERIC(12,2) NOT NULL,
    price_currency TEXT NOT NULL DEFAULT 'EGP',
    discount_breakdown JSONB DEFAULT '{"base_discount": 0, "promo_discount": 0, "reward_discount": 0, "total_discount_percent": 0}',
    applied_promo_code TEXT,
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    company_name TEXT,
    request_notes TEXT,
    admin_notes TEXT,
    status_history JSONB DEFAULT '[]',
    follow_up_actions JSONB DEFAULT '[]',
    converted_order_id UUID,
    location_url TEXT,
    request_source TEXT DEFAULT 'pricing_modal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pricing_requests_client_id ON pricing_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_pricing_requests_status ON pricing_requests(status);
CREATE INDEX IF NOT EXISTS idx_pricing_requests_assigned_to ON pricing_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pricing_requests_created_at ON pricing_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_requests_priority ON pricing_requests(priority);

-- 2. TEAM_MEMBERS TABLE
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'sales', 'designer', 'manager')),
    phone TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    notification_preferences JSONB DEFAULT '{"email": true, "whatsapp": true, "in_app": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default team members
INSERT INTO team_members (name, role, phone, email) VALUES
    ('Mariam', 'sales', '+201277636616', 'mariam@lumos.studio'),
    ('Sarah', 'admin', '+201000000001', 'sarah@lumos.studio'),
    ('Nour', 'designer', '+201000000002', 'nour@lumos.studio')
ON CONFLICT DO NOTHING;

-- 3. DISCOUNT_CODES TABLE
CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10,2) NOT NULL,
    min_order_value NUMERIC(12,2) DEFAULT 0,
    max_discount NUMERIC(12,2),
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    usage_limit INT,
    usage_count INT DEFAULT 0,
    applicable_categories TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active) WHERE is_active = true;

-- Insert sample discount codes
INSERT INTO discount_codes (code, description, discount_type, discount_value, is_active) VALUES
    ('WELCOME20', 'Welcome discount 20%', 'percentage', 20, true),
    ('LUMOS10', 'Lumos loyal customer 10%', 'percentage', 10, true),
    ('SAVE50', 'Fixed 50 EGP off', 'fixed', 50, true)
ON CONFLICT DO NOTHING;

-- 4. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('client', 'team_member')),
    type TEXT NOT NULL CHECK (type IN ('pricing_request_new', 'pricing_request_status_changed', 'pricing_request_assigned', 'pricing_request_approved', 'pricing_request_rejected', 'pricing_request_converted', 'pricing_request_follow_up', 'general')),
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

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 5. AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('pricing_request', 'client', 'discount_code', 'team_member', 'order')),
    entity_id UUID NOT NULL,
    changed_by UUID,
    changed_by_type TEXT CHECK (changed_by_type IN ('team_member', 'client', 'system')),
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'assigned', 'notes_added', 'converted', 'reviewed')),
    old_values JSONB,
    new_values JSONB,
    change_summary TEXT,
    change_summary_ar TEXT,
    ip_address INET,
    user_agent TEXT,
    location_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pricing_request_id UUID REFERENCES pricing_requests(id),
    client_id UUID,
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    company_name TEXT,
    order_type TEXT NOT NULL DEFAULT 'pricing_converted',
    package_id TEXT,
    package_name TEXT,
    selected_services JSONB,
    total_price NUMERIC(12,2) NOT NULL,
    price_currency TEXT NOT NULL DEFAULT 'EGP',
    discount_amount NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'refunded')),
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    payment_method TEXT,
    paid_amount NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_pricing_request_id ON orders(pricing_request_id);

-- ENABLE RLS (Row Level Security)
ALTER TABLE pricing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR PRICING_REQUESTS
CREATE POLICY "Team can manage pricing requests" ON pricing_requests FOR ALL USING (true);
CREATE POLICY "Public can create requests" ON pricing_requests FOR INSERT WITH CHECK (true);

-- RLS POLICIES FOR DISCOUNT_CODES
CREATE POLICY "Anyone can validate codes" ON discount_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Team can manage codes" ON discount_codes FOR ALL USING (true);

-- RLS POLICIES FOR NOTIFICATIONS
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (true);

-- RLS POLICIES FOR AUDIT_LOGS
CREATE POLICY "Team can read all audit logs" ON audit_logs FOR SELECT USING (true);

-- RLS POLICIES FOR ORDERS
CREATE POLICY "Team can manage orders" ON orders FOR ALL USING (true);

-- RLS POLICIES FOR TEAM_MEMBERS
CREATE POLICY "Team can manage members" ON team_members FOR ALL USING (true);

-- AUTO-UPDATE TIMESTAMP FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_pricing_requests_updated_at 
    BEFORE UPDATE ON pricing_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discount_codes_updated_at 
    BEFORE UPDATE ON discount_codes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at 
    BEFORE UPDATE ON team_members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key to pricing_requests for team_members
ALTER TABLE pricing_requests ADD CONSTRAINT fk_team_member 
    FOREIGN KEY (assigned_to) REFERENCES team_members(id) ON DELETE SET NULL;

-- Add foreign key to pricing_requests for clients (if exists)
-- ALTER TABLE pricing_requests ADD CONSTRAINT fk_client 
--     FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Add foreign key to orders for clients (if exists)
-- ALTER TABLE orders ADD CONSTRAINT fk_order_client 
--     FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

SELECT 'All tables created successfully!' as status;