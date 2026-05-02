# Lumos Pricing System - Database Schema

## Overview
Complete database schema for the Pricing Modal system with:
- Enhanced pricing requests tracking
- Team member management (women team)
- Discount codes system
- Audit logging for all changes
- Notifications system

---

## 1. pricing_requests Table

```sql
CREATE TABLE pricing_requests (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Client & Request Info
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('package', 'custom')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'approved', 'converted', 'rejected')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

    -- Assignment
    assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,

    -- Package Info
    package_id TEXT,
    package_name TEXT,

    -- Services (JSON array)
    selected_services JSONB NOT NULL DEFAULT '[]',

    -- Pricing
    estimated_subtotal NUMERIC(12,2) NOT NULL,
    estimated_total NUMERIC(12,2) NOT NULL,
    price_currency TEXT NOT NULL DEFAULT 'EGP',

    -- Discount Breakdown
    discount_breakdown JSONB DEFAULT '{"base_discount": 0, "promo_discount": 0, "reward_discount": 0, "total_discount_percent": 0}',
    applied_promo_code TEXT,

    -- Guest Contact Info
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    company_name TEXT,

    -- Notes
    request_notes TEXT,
    admin_notes TEXT,

    -- Status History (Audit Trail)
    status_history JSONB DEFAULT '[]',

    -- Follow-up Actions
    follow_up_actions JSONB DEFAULT '[]',

    -- Conversion
    converted_order_id UUID,

    -- Source
    location_url TEXT,
    request_source TEXT DEFAULT 'pricing_modal',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_pricing_requests_client_id ON pricing_requests(client_id);
CREATE INDEX idx_pricing_requests_status ON pricing_requests(status);
CREATE INDEX idx_pricing_requests_assigned_to ON pricing_requests(assigned_to);
CREATE INDEX idx_pricing_requests_created_at ON pricing_requests(created_at DESC);
CREATE INDEX idx_pricing_requests_priority ON pricing_requests(priority);

-- RLS (Row Level Security)
ALTER TABLE pricing_requests ENABLE ROW LEVEL SECURITY;

-- Allow clients to read their own requests
CREATE POLICY "clients_can_read_own_requests" ON pricing_requests
    FOR SELECT USING (client_id = auth.uid());

-- Allow team members to read all requests
CREATE POLICY "team_can_read_all_requests" ON pricing_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM team_members WHERE id = auth.uid() AND is_active = true)
    );

-- Allow team members to insert/update/delete
CREATE POLICY "team_can_manage_requests" ON pricing_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM team_members WHERE id = auth.uid() AND is_active = true)
    );

-- Allow public to create new requests (guest submissions)
CREATE POLICY "anyone_can_create_request" ON pricing_requests
    FOR INSERT WITH CHECK (true);
```

---

## 2. team_members Table

```sql
CREATE TABLE team_members (
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

-- Add team_member_id to auth.users for easy linking
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES team_members(id);

-- Insert default team members (women team)
INSERT INTO team_members (name, role, phone, email) VALUES
    ('Mariam', 'sales', '+201277636616', 'mariam@lumos.studio'),
    ('Sarah', 'admin', '+201000000001', 'sarah@lumos.studio'),
    ('Nour', 'designer', '+201000000002', 'nour@lumos.studio');
```

---

## 3. discount_codes Table

```sql
CREATE TABLE discount_codes (
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
    applicable_categories TEXT[], -- Which categories can use this code
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_active ON discount_codes(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_validate_codes" ON discount_codes FOR SELECT USING (is_active = true);
CREATE POLICY "team_can_manage_codes" ON discount_codes FOR ALL USING (
    EXISTS (SELECT 1 FROM team_members WHERE id = auth.uid() AND is_active = true)
);
```

---

## 4. notifications Table

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Recipient
    user_id UUID, -- can be client_id or team_member_id
    user_type TEXT NOT NULL CHECK (user_type IN ('client', 'team_member')),

    -- Notification Content
    type TEXT NOT NULL CHECK (type IN (
        'pricing_request_new',
        'pricing_request_status_changed',
        'pricing_request_assigned',
        'pricing_request_approved',
        'pricing_request_rejected',
        'pricing_request_converted',
        'pricing_request_follow_up',
        'general'
    )),

    title TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    message TEXT NOT NULL,
    message_ar TEXT NOT NULL,

    -- Action Link
    action_type TEXT, -- 'pricing_request', 'client', 'order'
    action_id TEXT,
    action_url TEXT,

    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Priority
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_type ON notifications(user_type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_read_own_notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "team_can_read_all_notifications" ON notifications
    FOR SELECT USING (
        user_type = 'team_member' AND
        EXISTS (SELECT 1 FROM team_members WHERE id = auth.uid() AND is_active = true)
    );
CREATE POLICY "system_can_create_notifications" ON notifications
    FOR INSERT WITH CHECK (true);
```

---

## 5. audit_logs Table (Complete Change Tracking)

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was changed
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'pricing_request',
        'client',
        'discount_code',
        'team_member',
        'order'
    )),
    entity_id UUID NOT NULL,

    -- Who made the change
    changed_by UUID, -- team_member or client
    changed_by_type TEXT CHECK (changed_by_type IN ('team_member', 'client', 'system')),

    -- What changed
    action TEXT NOT NULL CHECK (action IN (
        'created',
        'updated',
        'deleted',
        'status_changed',
        'assigned',
        'notes_added',
        'converted',
        'reviewed'
    )),

    -- Before and After (JSON)
    old_values JSONB,
    new_values JSONB,

    -- Change summary
    change_summary TEXT,
    change_summary_ar TEXT,

    -- Metadata
    ip_address INET,
    user_agent TEXT,
    location_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS - Team can read all, clients can read their own
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_can_read_all_audit_logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM team_members WHERE id = auth.uid() AND is_active = true)
    );
CREATE POLICY "clients_can_read_own_audit" ON audit_logs
    FOR SELECT USING (
        changed_by = auth.uid() OR
        entity_type = 'pricing_request' AND entity_id IN (
            SELECT id FROM pricing_requests WHERE client_id = auth.uid()
        )
    );
```

---

## 6. orders Table (For converted requests)

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to original request
    pricing_request_id UUID REFERENCES pricing_requests(id),

    -- Client
    client_id UUID REFERENCES clients(id),
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    company_name TEXT,

    -- Order Details
    order_type TEXT NOT NULL DEFAULT 'pricing_converted',
    package_id TEXT,
    package_name TEXT,
    selected_services JSONB,

    -- Pricing
    total_price NUMERIC(12,2) NOT NULL,
    price_currency TEXT NOT NULL DEFAULT 'EGP',
    discount_amount NUMERIC(12,2) DEFAULT 0,

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'refunded')),

    -- Payment
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    payment_method TEXT,
    paid_amount NUMERIC(12,2) DEFAULT 0,

    -- Notes
    notes TEXT,
    admin_notes TEXT,

    -- Timeline
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_pricing_request_id ON orders(pricing_request_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
```

---

## Functions & Triggers

### 1. Auto-update updated_at timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_pricing_requests_updated_at BEFORE UPDATE ON pricing_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON discount_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Function to add status history entry

```sql
CREATE OR REPLACE FUNCTION add_status_history_entry(
    request_id UUID,
    new_status TEXT,
    changed_by_id UUID,
    note TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    current_history JSONB;
    new_entry JSONB;
BEGIN
    SELECT status_history INTO current_history FROM pricing_requests WHERE id = request_id;

    new_entry := jsonb_build_object(
        'status', new_status,
        'changed_at', NOW()::timestamptz,
        'changed_by', changed_by_id,
        'note', note
    );

    IF current_history IS NULL THEN
        current_history := '[]'::jsonb;
    END IF;

    UPDATE pricing_requests
    SET status_history = current_history || new_entry,
        status = new_status,
        updated_at = NOW(),
        reviewed_at = CASE WHEN new_status IN ('reviewing', 'approved', 'rejected') THEN NOW() ELSE reviewed_at END
    WHERE id = request_id;
END;
$$ LANGUAGE plpgsql;
```

### 3. Function to log audit changes

```sql
CREATE OR REPLACE FUNCTION log_audit_change(
    p_entity_type TEXT,
    p_entity_id UUID,
    p_changed_by UUID,
    p_changed_by_type TEXT,
    p_action TEXT,
    p_old_values JSONB,
    p_new_values JSONB,
    p_change_summary TEXT,
    p_change_summary_ar TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        entity_type, entity_id, changed_by, changed_by_type,
        action, old_values, new_values, change_summary, change_summary_ar,
        created_at
    ) VALUES (
        p_entity_type, p_entity_id, p_changed_by, p_changed_by_type,
        p_action, p_old_values, p_new_values, p_change_summary, p_change_summary_ar,
        NOW()
    );
END;
$$ LANGUAGE plpgsql;
```

### 4. Function to create notification

```sql
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_user_type TEXT,
    p_type TEXT,
    p_title TEXT,
    p_title_ar TEXT,
    p_message TEXT,
    p_message_ar TEXT,
    p_action_type TEXT DEFAULT NULL,
    p_action_id TEXT DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL,
    p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, user_type, type, title, title_ar, message, message_ar,
        action_type, action_id, action_url, priority, created_at
    ) VALUES (
        p_user_id, p_user_type, p_type, p_title, p_title_ar, p_message, p_message_ar,
        p_action_type, p_action_id, p_action_url, p_priority, NOW()
    )
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;
```

### 5. Trigger to auto-log pricing request changes

```sql
CREATE OR REPLACE FUNCTION log_pricing_request_changes()
RETURNS TRIGGER AS $$
DECLARE
    change_summary TEXT;
    change_summary_ar TEXT;
BEGIN
    IF NEW.status <> OLD.status THEN
        change_summary := 'Status changed from ' || OLD.status || ' to ' || NEW.status;
        change_summary_ar := 'تم تغيير الحالة من ' || OLD.status || ' إلى ' || NEW.status;

        PERFORM log_audit_change(
            'pricing_request',
            NEW.id,
            NEW.assigned_to,
            'team_member',
            'status_changed',
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            change_summary,
            change_summary_ar
        );

        -- Create notification for client
        IF NEW.client_id IS NOT NULL THEN
            PERFORM create_notification(
                NEW.client_id,
                'client',
                'pricing_request_status_changed',
                'Request Status Update',
                'تحديث حالة الطلب',
                'Your pricing request status has been updated to: ' || NEW.status,
                'تم تحديث حالة طلب التسعير الخاص بك إلى: ' || NEW.status,
                'pricing_request',
                NEW.id::text,
                '/dashboard/requests',
                'normal'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pricing_request_changes
    AFTER UPDATE ON pricing_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_pricing_request_changes();
```

---

## Sample Queries

### Get all requests with status history
```sql
SELECT
    pr.*,
    tm.name as assigned_to_name,
    tm.role as assigned_to_role
FROM pricing_requests pr
LEFT JOIN team_members tm ON pr.assigned_to = tm.id
ORDER BY pr.created_at DESC;
```

### Get notifications for a client
```sql
SELECT * FROM notifications
WHERE user_id = 'client-uuid' AND user_type = 'client'
ORDER BY created_at DESC
LIMIT 20;
```

### Get audit trail for a request
```sql
SELECT * FROM audit_logs
WHERE entity_type = 'pricing_request' AND entity_id = 'request-uuid'
ORDER BY created_at DESC;
```

### Get pending requests assigned to a team member
```sql
SELECT * FROM pricing_requests
WHERE assigned_to = 'team-member-uuid'
AND status IN ('new', 'reviewing')
ORDER BY priority DESC, created_at ASC;
```

---

## Summary of Features

| Feature | Description |
|---------|-------------|
| **Enhanced Pricing Requests** | Priority, assignment, detailed discount breakdown, status history |
| **Team Management** | Track who handles which request |
| **Discount Codes** | Full promo code system with usage limits |
| **Notifications** | Auto-notify clients on status changes |
| **Audit Logs** | Complete history of all changes |
| **Orders** | Convert requests to actual orders |