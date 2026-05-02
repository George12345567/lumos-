export interface Order {
    id: string;
    client_name: string;
    phone: string;
    email?: string;
    package_type?: string;
    total_price: number;
    original_price?: number;
    discount_amount?: number;
    plan_details: Record<string, unknown> | null;
    auto_collected_data: Record<string, unknown> | null;
    location_url: string;
    package_payload?: Record<string, unknown> | null;
    client_id?: string;
    notes?: string;
    status: 'pending' | 'processing' | 'completed' | 'cancelled';
    created_at: string;
    updated_at?: string;
}

export interface Contact {
    id: string;
    name: string;
    email?: string;
    phone: string;
    business_name?: string;
    industry?: string;
    service_needed?: string;
    message: string;
    source?: string;
    auto_collected_data: Record<string, unknown> | null;
    location_url: string;
    status: 'new' | 'read' | 'contacted' | 'resolved';
    created_at: string;
    updated_at?: string;
}

export interface PricingRequestItem {
    id: string;
    name: string;
    nameAr: string;
    price: number;
    category: string;
    is_free?: boolean;
    reward_id?: string;
}

export interface DiscountBreakdown {
    base_discount: number;
    promo_discount: number;
    reward_discount: number;
    total_discount_percent: number;
}

export interface StatusHistoryEntry {
    status: string;
    changed_at: string;
    changed_by: string | null;
    note?: string;
}

export interface FollowUpAction {
    action: string;
    date: string;
    done: boolean;
}

export interface PricingRequest {
    id: string;
    client_id?: string | null;
    request_type: 'package' | 'custom';
    status: 'new' | 'reviewing' | 'approved' | 'converted' | 'rejected';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assigned_to?: string | null;
    request_source?: string;
    package_id?: string | null;
    package_name?: string | null;
    selected_services: PricingRequestItem[];
    estimated_subtotal: number;
    estimated_total: number;
    price_currency: string;
    discount_breakdown?: DiscountBreakdown;
    applied_promo_code?: string | null;
    guest_name?: string | null;
    guest_phone?: string | null;
    guest_email?: string | null;
    company_name?: string | null;
    client_snapshot?: Record<string, unknown> | null;
    request_notes?: string | null;
    admin_notes?: string | null;
    status_history?: StatusHistoryEntry[];
    follow_up_actions?: FollowUpAction[];
    converted_order_id?: string | null;
    location_url?: string | null;
    auto_collected_data?: Record<string, unknown> | null;
    created_at: string;
    updated_at?: string;
    reviewed_at?: string | null;
    assigned_to_name?: string;
    assigned_to_role?: string;
}

export interface Client {
    id: string;
    username: string;
    email?: string;
    phone?: string;
    phone_number?: string;
    company_name?: string;
    security_question?: string;
    security_answer?: string;
    package_name?: string;
    status?: string;
    progress?: number;
    next_steps?: string;
    package_details?: Record<string, unknown> | null;
    subscription_config?: Record<string, unknown> | null;
    admin_notes?: string;
    active_offer?: string;
    active_offer_link?: string;
    logo_url?: string;
    avatar_url?: string;
    cover_gradient?: string;
    theme_accent?: string;
    brand_colors?: string[];
    created_at: string;
}

export interface ClientUpdate {
    id: string;
    client_id: string;
    title: string;
    type: 'milestone' | 'update' | 'action' | string;
    update_date: string;
}

export interface DashboardStats {
    totalOrders: number;
    totalRevenue: number;
    totalContacts: number;
    totalPricingRequests: number;
    pendingOrders: number;
    completedOrders: number;
    newContacts: number;
    newPricingRequests: number;
    avgOrderValue: number;
    unreadMessages: number;
    totalDesigns: number;
}

export interface SavedDesign {
    id: string;
    business_name: string;
    service_type: string;
    selected_theme: string;
    custom_theme: {
        primary: string;
        accent: string;
        gradient: string;
    };
    selected_template: string;
    is_dark_mode: boolean;
    glass_effect: boolean;
    active_texture: string;
    font_size: number;
    view_mode: string;
    device_view: string;
    enable_3d: boolean;
    rotation_x: number;
    rotation_y: number;
    show_ratings: boolean;
    show_time: boolean;
    show_featured: boolean;
    image_quality: string;
    sort_by: string;
    custom_items: Array<Record<string, unknown>>;
    cart_items: Record<string, number>;
    favorites: number[];
    client_id?: string;
    visitor_name?: string;
    visitor_email?: string;
    visitor_phone?: string;
    visitor_note?: string;
    browser_data?: Record<string, unknown> | null;
    status: 'active' | 'archived' | 'featured';
    view_count: number;
    created_at: string;
    updated_at: string;
}

export interface TeamMember {
    id: string;
    name: string;
    role: 'admin' | 'sales' | 'designer' | 'manager';
    phone?: string;
    email?: string;
    avatar_url?: string;
    is_active: boolean;
    notification_preferences?: {
        email: boolean;
        whatsapp: boolean;
        in_app: boolean;
    };
    created_at?: string;
    updated_at?: string;
}

export interface Notification {
    id: string;
    user_id: string;
    user_type: 'client' | 'team_member';
    type: 'pricing_request_new' | 'pricing_request_status_changed' | 'pricing_request_assigned' | 'pricing_request_approved' | 'pricing_request_rejected' | 'pricing_request_converted' | 'pricing_request_follow_up' | 'general';
    title: string;
    title_ar: string;
    message: string;
    message_ar: string;
    action_type?: string;
    action_id?: string;
    action_url?: string;
    is_read: boolean;
    read_at?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    created_at: string;
}

export interface AuditLog {
    id: string;
    entity_type: 'pricing_request' | 'client' | 'discount_code' | 'team_member' | 'order';
    entity_id: string;
    changed_by?: string;
    changed_by_type?: 'team_member' | 'client' | 'system';
    action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'notes_added' | 'converted' | 'reviewed';
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    change_summary?: string;
    change_summary_ar?: string;
    ip_address?: string;
    user_agent?: string;
    location_url?: string;
    created_at: string;
}

export interface DiscountCode {
    id: string;
    code: string;
    description?: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_value?: number;
    max_discount?: number;
    is_active: boolean;
    valid_from?: string;
    valid_until?: string;
    usage_limit?: number;
    usage_count?: number;
    applicable_categories?: string[];
    created_at?: string;
    updated_at?: string;
}

export interface Order {
    id: string;
    pricing_request_id?: string;
    client_id?: string;
    guest_name?: string;
    guest_phone?: string;
    guest_email?: string;
    company_name?: string;
    order_type?: string;
    package_id?: string;
    package_name?: string;
    selected_services?: PricingRequestItem[];
    total_price: number;
    price_currency: string;
    discount_amount?: number;
    status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
    payment_status?: 'unpaid' | 'partial' | 'paid';
    payment_method?: string;
    paid_amount?: number;
    notes?: string;
    admin_notes?: string;
    created_at: string;
    updated_at?: string;
    completed_at?: string;
}
