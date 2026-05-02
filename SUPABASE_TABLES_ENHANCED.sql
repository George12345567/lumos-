-- ═══════════════════════════════════════════════════════════════════════════
-- LUMOS DIGITAL ASCENT - Enhanced Database Schema
-- Version: 2.0
-- Created: 2026-05-02
-- Description: Complete database schema for pricing system, admin dashboard, and client management
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: DROP EXISTING TABLES (Clean Install)
-- ═══════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS discount_codes CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS pricing_requests CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS request_type_enum;
DROP TYPE IF EXISTS request_status_enum;
DROP TYPE IF EXISTS request_priority_enum;
DROP TYPE IF EXISTS team_role_enum;
DROP TYPE IF EXISTS discount_type_enum;
DROP TYPE IF EXISTS notification_type_enum;
DROP TYPE IF EXISTS audit_action_enum;
DROP TYPE IF EXISTS order_status_enum;
DROP TYPE IF EXISTS payment_status_enum;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: ENUM TYPES (Better than TEXT + CHECK)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE request_type_enum AS ENUM ('package', 'custom');
CREATE TYPE request_status_enum AS ENUM ('new', 'reviewing', 'approved', 'converted', 'rejected');
CREATE TYPE request_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE team_role_enum AS ENUM ('admin', 'sales', 'designer', 'manager');
CREATE TYPE discount_type_enum AS ENUM ('percentage', 'fixed');
CREATE TYPE notification_type_enum AS ENUM (
    'pricing_request_new', 
    'pricing_request_status_changed', 
    'pricing_request_assigned', 
    'pricing_request_approved', 
    'pricing_request_rejected', 
    'pricing_request_converted', 
    'pricing_request_follow_up', 
    'general'
);
CREATE TYPE audit_action_enum AS ENUM ('created', 'updated', 'deleted', 'status_changed', 'assigned', 'notes_added', 'converted', 'reviewed');
CREATE TYPE order_status_enum AS ENUM ('pending', 'processing', 'completed', 'cancelled', 'refunded');
CREATE TYPE payment_status_enum AS ENUM ('unpaid', 'partial', 'paid');

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: team_members (فريق العمل)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role team_role_enum NOT NULL,
    phone TEXT NOT NULL,
    email TEXT UNIQUE,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    notification_preferences JSONB DEFAULT '{"email": true, "whatsapp": true, "in_app": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_members_role ON team_members(role);
CREATE INDEX idx_team_members_active ON team_members(is_active) WHERE is_active = true;
CREATE INDEX idx_team_members_email ON team_members(email) WHERE email IS NOT NULL;

-- Insert default team members
INSERT INTO team_members (name, role, phone, email) VALUES
    ('Mariam', 'sales', '+201277636616', 'mariam@lumos.studio'),
    ('Sarah', 'admin', '+201000000001', 'sarah@lumos.studio'),
    ('Nour', 'designer', '+201000000002', 'nour@lumos.studio')
ON CONFLICT (email) DO UPDATE SET 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone;

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: discount_codes (أكواد الخصم)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    description_ar TEXT,
    discount_type discount_type_enum NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value >= 0),
    min_order_value NUMERIC(12,2) DEFAULT 0 CHECK (min_order_value >= 0),
    max_discount NUMERIC(12,2) CHECK (max_discount IS NULL OR max_discount >= 0),
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ CHECK (valid_until IS NULL OR valid_until > valid_from),
    usage_limit INT CHECK (usage_limit IS NULL OR usage_limit > 0),
    usage_count INT DEFAULT 0 CHECK (usage_count >= 0),
    applicable_categories TEXT[],
    created_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_active ON discount_codes(is_active) WHERE is_active = true;
CREATE INDEX idx_discount_codes_valid ON discount_codes(valid_until) WHERE valid_until IS NOT NULL AND is_active = true;

-- Insert sample discount codes
INSERT INTO discount_codes (code, description, description_ar, discount_type, discount_value, is_active) VALUES
    ('WELCOME20', 'Welcome discount 20%', 'خصم ترحيبي 20%', 'percentage', 20, true),
    ('LUMOS10', 'Lumos loyal customer 10%', 'عميل لوموس المميز 10%', 'percentage', 10, true),
    ('SAVE50', 'Fixed 50 EGP off', 'خصم ثابت 50 جنيه', 'fixed', 50, true)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: pricing_requests (طلبات التسعير)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE pricing_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID,
    request_type request_type_enum NOT NULL DEFAULT 'package',
    status request_status_enum NOT NULL DEFAULT 'new',
    priority request_priority_enum DEFAULT 'medium',
    assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
    package_id TEXT,
    package_name TEXT,
    selected_services JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_subtotal NUMERIC(12,2) NOT NULL CHECK (estimated_subtotal >= 0),
    estimated_total NUMERIC(12,2) NOT NULL CHECK (estimated_total >= 0),
    price_currency TEXT NOT NULL DEFAULT 'EGP',
    discount_breakdown JSONB DEFAULT '{"base_discount": 0, "promo_discount": 0, "reward_discount": 0, "total_discount_percent": 0}'::jsonb,
    applied_promo_code TEXT REFERENCES discount_codes(code) ON DELETE SET NULL,
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

CREATE INDEX idx_pricing_requests_client ON pricing_requests(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_pricing_requests_status ON pricing_requests(status);
CREATE INDEX idx_pricing_requests_priority ON pricing_requests(priority);
CREATE INDEX idx_pricing_requests_assigned ON pricing_requests(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_pricing_requests_created ON pricing_requests(created_at DESC);
CREATE INDEX idx_pricing_requests_email ON pricing_requests(guest_email) WHERE guest_email IS NOT NULL;
CREATE INDEX idx_pricing_requests_phone ON pricing_requests(guest_phone) WHERE guest_phone IS NOT NULL;
CREATE INDEX idx_pricing_requests_composite ON pricing_requests(status, priority, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: contacts (جهات الاتصال)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone TEXT CHECK (phone IS NULL OR phone ~ '^01[0-9]{9}$'),
    company_name TEXT,
    service_interest TEXT,
    message TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'archived')),
    source TEXT DEFAULT 'website',
    assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_created ON contacts(created_at DESC);
CREATE INDEX idx_contacts_assigned ON contacts(assigned_to) WHERE assigned_to IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: orders (الطلبات/الشاريع)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pricing_request_id UUID REFERENCES pricing_requests(id) ON DELETE SET NULL,
    client_id UUID,
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    company_name TEXT,
    order_type TEXT NOT NULL DEFAULT 'pricing_converted',
    package_id TEXT,
    package_name TEXT,
    selected_services JSONB,
    total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
    price_currency TEXT NOT NULL DEFAULT 'EGP',
    discount_amount NUMERIC(12,2) DEFAULT 0 CHECK (discount_amount >= 0),
    status order_status_enum DEFAULT 'pending',
    payment_status payment_status_enum DEFAULT 'unpaid',
    payment_method TEXT,
    paid_amount NUMERIC(12,2) DEFAULT 0 CHECK (paid_amount >= 0),
    notes TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_client ON orders(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment ON orders(payment_status);
CREATE INDEX idx_orders_pricing_request ON orders(pricing_request_id) WHERE pricing_request_id IS NOT NULL;
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: notifications (الإشعارات)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('client', 'team_member')),
    type notification_type_enum NOT NULL,
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

CREATE INDEX idx_notifications_user ON notifications(user_id, user_type);
CREATE INDEX idx_notifications_unread ON notifications(is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: audit_logs (سجل التغييرات)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('pricing_request', 'client', 'discount_code', 'team_member', 'order', 'contact')),
    entity_id UUID NOT NULL,
    changed_by UUID,
    changed_by_type TEXT CHECK (changed_by_type IN ('team_member', 'client', 'system')),
    action audit_action_enum NOT NULL,
    old_values JSONB,
    new_values JSONB,
    change_summary TEXT,
    change_summary_ar TEXT,
    ip_address INET,
    user_agent TEXT,
    location_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_changed_by ON audit_logs(changed_by) WHERE changed_by IS NOT NULL;
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: ROW LEVEL SECURITY (RLS) - سياسات الأمان
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Team Members Policies
DROP POLICY IF EXISTS "Team can manage members" ON team_members;
CREATE POLICY "Team can manage members" ON team_members FOR ALL USING (true);

-- Discount Codes Policies
DROP POLICY IF EXISTS "Anyone can validate codes" ON discount_codes;
DROP POLICY IF EXISTS "Team can manage codes" ON discount_codes;
CREATE POLICY "Anyone can validate codes" ON discount_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Team can manage codes" ON discount_codes FOR ALL USING (true);

-- Pricing Requests Policies
DROP POLICY IF EXISTS "Team can manage pricing requests" ON pricing_requests;
DROP POLICY IF EXISTS "Public can create requests" ON pricing_requests;
CREATE POLICY "Team can manage pricing requests" ON pricing_requests FOR ALL USING (true);
CREATE POLICY "Public can create requests" ON pricing_requests FOR INSERT WITH CHECK (true);

-- Contacts Policies
DROP POLICY IF EXISTS "Anyone can submit contact form" ON contacts;
DROP POLICY IF EXISTS "Team can manage contacts" ON contacts;
CREATE POLICY "Anyone can submit contact form" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Team can manage contacts" ON contacts FOR ALL USING (true);

-- Orders Policies
DROP POLICY IF EXISTS "Team can manage orders" ON orders;
CREATE POLICY "Team can manage orders" ON orders FOR ALL USING (true);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (true);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Team can read all audit logs" ON audit_logs;
CREATE POLICY "Team can read all audit logs" ON audit_logs FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: HELPER FUNCTIONS (دوال مساعدة)
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to add status history entry
CREATE OR REPLACE FUNCTION add_status_history(
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
    return p_history || jsonb_build_array(entry);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate final price with discount
CREATE OR REPLACE FUNCTION calculate_final_price(
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

-- Function to validate discount code
CREATE OR REPLACE FUNCTION validate_discount_code(
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
            WHEN NOT dc.is_active THEN false
            WHEN dc.valid_until IS NOT NULL AND dc.valid_until < NOW() THEN false
            WHEN dc.usage_limit IS NOT NULL AND dc.usage_count >= dc.usage_limit THEN false
            WHEN p_order_value < dc.min_order_value THEN false
            ELSE true
        END,
        dc.discount_type::TEXT,
        dc.discount_value,
        dc.max_discount,
        CASE 
            WHEN NOT dc.is_active THEN 'Code is inactive'
            WHEN dc.valid_until IS NOT NULL AND dc.valid_until < NOW() THEN 'Code has expired'
            WHEN dc.usage_limit IS NOT NULL AND dc.usage_count >= dc.usage_limit THEN 'Code usage limit reached'
            WHEN p_order_value < dc.min_order_value THEN 'Minimum order value not met'
            ELSE NULL
        END
    FROM discount_codes dc
    WHERE dc.code = p_code;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit entry
CREATE OR REPLACE FUNCTION log_audit(
    p_entity_type TEXT,
    p_entity_id UUID,
    p_action audit_action_enum,
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
    INSERT INTO audit_logs (
        entity_type, entity_id, action, changed_by, changed_by_type,
        old_values, new_values, change_summary, change_summary_ar, location_url
    ) VALUES (
        p_entity_type, p_entity_id, p_action, p_changed_by, p_changed_by_type,
        p_old_values, p_new_values, p_change_summary, p_change_summary_ar, p_location_url
    );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: DATABASE TRIGGERS (مشغلات تلقائية)
-- ═══════════════════════════════════════════════════════════════════════════

-- Triggers for updated_at
CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discount_codes_updated_at
    BEFORE UPDATE ON discount_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_requests_updated_at
    BEFORE UPDATE ON pricing_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7: DASHBOARD VIEWS (عرض البيانات للتحليل)
-- ═══════════════════════════════════════════════════════════════════════════

-- View: Dashboard Statistics (إحصائيات لوحة التحكم)
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM pricing_requests) AS total_pricing_requests,
    (SELECT COUNT(*) FROM pricing_requests WHERE status = 'new') AS new_pricing_requests,
    (SELECT COUNT(*) FROM pricing_requests WHERE status = 'converted') AS converted_requests,
    (SELECT COUNT(*) FROM contacts) AS total_contacts,
    (SELECT COUNT(*) FROM contacts WHERE status = 'new') AS new_contacts,
    (SELECT COUNT(*) FROM orders) AS total_orders,
    (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending_orders,
    (SELECT COUNT(*) FROM orders WHERE status = 'completed') AS completed_orders,
    (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE payment_status = 'paid') AS total_revenue,
    (SELECT COALESCE(AVG(total_price), 0) FROM orders WHERE status = 'completed') AS avg_order_value,
    (SELECT COUNT(*) FROM notifications WHERE is_read = false) AS unread_notifications;

-- View: Recent Pricing Requests (أحدث طلبات التسعير)
CREATE OR REPLACE VIEW recent_pricing_requests AS
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
FROM pricing_requests pr
LEFT JOIN team_members tm ON pr.assigned_to = tm.id
ORDER BY pr.created_at DESC
LIMIT 20;

-- View: Recent Contacts (أحدث جهات الاتصال)
CREATE OR REPLACE VIEW recent_contacts AS
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
FROM contacts c
LEFT JOIN team_members tm ON c.assigned_to = tm.id
ORDER BY c.created_at DESC
LIMIT 20;

-- View: Revenue by Month (الإيرادات الشهرية)
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT 
    DATE_TRUNC('month', created_at)::date AS month,
    COUNT(*) AS order_count,
    SUM(total_price) AS total_revenue,
    SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END) AS collected
FROM orders
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8: FINALIZE
-- ═══════════════════════════════════════════════════════════════════════════

COMMIT;

-- Verify tables created
SELECT 
    'Tables created successfully!' AS status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS table_count;

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;