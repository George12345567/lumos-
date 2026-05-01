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
}

export interface PricingRequest {
    id: string;
    client_id?: string | null;
    request_type: 'package' | 'custom';
    status: 'new' | 'reviewing' | 'approved' | 'converted' | 'rejected';
    request_source?: string;
    package_id?: string | null;
    package_name?: string | null;
    selected_services: PricingRequestItem[];
    estimated_subtotal: number;
    estimated_total: number;
    price_currency: string;
    guest_name?: string | null;
    guest_phone?: string | null;
    guest_email?: string | null;
    company_name?: string | null;
    client_snapshot?: Record<string, unknown> | null;
    request_notes?: string | null;
    admin_notes?: string | null;
    converted_order_id?: string | null;
    location_url?: string | null;
    auto_collected_data?: Record<string, unknown> | null;
    created_at: string;
    updated_at?: string;
    reviewed_at?: string | null;
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
