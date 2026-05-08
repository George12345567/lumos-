import { supabase } from '@/lib/supabaseClient';
import type { DashboardStats, PricingRequest, Contact, Order, Client, TeamMember, SavedDesign } from '@/types/dashboard';
import { updatePricingRequestStatus, convertPricingRequestToOrder, deletePricingRequest } from './pricingRequestService';

/**
 * Whitelist of `pricing_requests` columns the dashboard is allowed to update,
 * paired with normalisation rules. Anything not on this list is dropped to
 * avoid 400 errors from Supabase / PostgREST when the UI sends fields that
 * either don't exist or violate type constraints (e.g. empty strings into
 * UUID columns).
 */
const ALLOWED_STATUSES: ReadonlyArray<PricingRequest['status']> = [
  'new', 'reviewing', 'approved', 'converted', 'rejected',
];
const ALLOWED_PRIORITIES: ReadonlyArray<PricingRequest['priority']> = [
  'low', 'medium', 'high', 'urgent',
];

/** UUID columns: empty string must become null. */
const UUID_FIELDS = new Set<keyof PricingRequest>(['client_id', 'assigned_to', 'package_id', 'converted_order_id']);
/** Free-text columns where empty string should fold into null. */
const NULLABLE_TEXT_FIELDS = new Set<keyof PricingRequest>([
  'invoice_number', 'package_name', 'guest_name', 'guest_email', 'guest_phone',
  'company_name', 'request_notes', 'admin_notes', 'applied_promo_code',
  'request_source', 'location_url', 'delete_reason',
]);
/** Columns that must be sent as numbers. */
const NUMBER_FIELDS = new Set<keyof PricingRequest>(['estimated_subtotal', 'estimated_total', 'edit_count']);
/** Columns the UI may set on update. Everything else is dropped. */
const UPDATABLE_FIELDS = new Set<keyof PricingRequest>([
  'invoice_number', 'status', 'priority', 'assigned_to', 'package_id', 'package_name',
  'selected_services', 'estimated_subtotal', 'estimated_total', 'price_currency',
  'discount_breakdown', 'applied_promo_code', 'guest_name', 'guest_phone', 'guest_email',
  'company_name', 'client_id', 'client_snapshot', 'request_notes', 'admin_notes',
  'status_history', 'follow_up_actions', 'converted_order_id', 'request_source',
  'location_url', 'reviewed_at',
]);

export function sanitizePricingRequestUpdate(updates: Partial<PricingRequest>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(updates)) {
    if (raw === undefined) continue;
    const k = key as keyof PricingRequest;
    if (!UPDATABLE_FIELDS.has(k)) continue;

    let value: unknown = raw;

    if (UUID_FIELDS.has(k)) {
      // Treat empty string and 'null' literal as actual null.
      if (typeof value === 'string' && value.trim() === '') value = null;
    }
    if (NULLABLE_TEXT_FIELDS.has(k)) {
      if (typeof value === 'string' && value.trim() === '') value = null;
    }
    if (NUMBER_FIELDS.has(k)) {
      const n = Number(value);
      value = Number.isFinite(n) ? n : 0;
    }
    if (k === 'status' && typeof value === 'string') {
      if (!ALLOWED_STATUSES.includes(value as PricingRequest['status'])) continue;
    }
    if (k === 'priority' && typeof value === 'string') {
      if (!ALLOWED_PRIORITIES.includes(value as PricingRequest['priority'])) continue;
    }
    if (k === 'price_currency' && typeof value === 'string') {
      const trimmed = value.trim().toUpperCase();
      value = trimmed || 'EGP';
    }

    out[k] = value;
  }
  return out;
}

export const fetchAdminDashboardSnapshot = async () => {
  try {
    const [
      ordersData,
      contactsData,
      pricingRequestsData,
      clientsData,
    ] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('contacts').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('pricing_requests').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('clients').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    return {
      orders: (ordersData.data || []),
      contacts: (contactsData.data || []),
      pricingRequests: (pricingRequestsData.data || []),
      clients: (clientsData.data || []),
      designs: [],
      clientUpdates: [],
      unreadMessages: (contactsData.data || []).filter((c: Contact) => c.status === 'new').length + 
        (pricingRequestsData.data || []).filter((r: PricingRequest) => r.status === 'new').length
    };
  } catch (error) {
    console.error('Error fetching dashboard snapshot:', error);
    return {
      orders: [],
      contacts: [],
      pricingRequests: [],
      clients: [],
      designs: [],
      clientUpdates: [],
      unreadMessages: 0
    };
  }
};

export const adminDashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    try {
      const [
        { count: totalOrders },
        { data: ordersData },
        { count: totalContacts },
        { count: newContacts },
        { count: totalPricingRequests },
        { count: newPricingRequests },
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total_price'),
        supabase.from('contacts').select('*', { count: 'exact', head: true }),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('pricing_requests').select('*', { count: 'exact', head: true }),
        supabase.from('pricing_requests').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      ]);

      const totalRevenue = (ordersData || []).reduce((sum, order) => sum + (order.total_price || 0), 0);
      const completedOrders = (ordersData || []).filter(o => o.status === 'completed').length;

      return {
        totalOrders: totalOrders || 0,
        totalRevenue: totalRevenue || 0,
        totalContacts: totalContacts || 0,
        totalPricingRequests: totalPricingRequests || 0,
        pendingOrders: (totalOrders || 0) - completedOrders,
        completedOrders,
        newContacts: newContacts || 0,
        newPricingRequests: newPricingRequests || 0,
        avgOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
        unreadMessages: (newContacts || 0) + (newPricingRequests || 0),
        totalDesigns: 0,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        totalContacts: 0,
        totalPricingRequests: 0,
        pendingOrders: 0,
        completedOrders: 0,
        newContacts: 0,
        newPricingRequests: 0,
        avgOrderValue: 0,
        unreadMessages: 0,
        totalDesigns: 0,
      };
    }
  },

  getRecentClients: async (limit: number = 10): Promise<Client[]> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as Client[]) || [];
    } catch (error) {
      console.error('Error getting recent clients:', error);
      return [];
    }
  },

  getRecentOrders: async (limit: number = 10): Promise<Order[]> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as Order[]) || [];
    } catch (error) {
      console.error('Error getting recent orders:', error);
      return [];
    }
  },

  getRecentContacts: async (limit: number = 10): Promise<Contact[]> => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as Contact[]) || [];
    } catch (error) {
      console.error('Error getting recent contacts:', error);
      return [];
    }
  },

  getPricingRequestsWithFilters: async (filters?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ requests: PricingRequest[]; total: number }> => {
    try {
      let query = supabase
        .from('pricing_requests')
        .select('*', { count: 'exact' });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`guest_name.ilike.${searchTerm},guest_email.ilike.${searchTerm},guest_phone.ilike.${searchTerm},company_name.ilike.${searchTerm},package_name.ilike.${searchTerm}`);
      }

      query = query.order('created_at', { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      return {
        requests: (data as PricingRequest[]) || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error getting pricing requests with filters:', error);
      return { requests: [], total: 0 };
    }
  },

  getTeamMembers: async (): Promise<TeamMember[]> => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data as TeamMember[]) || [];
    } catch (error) {
      console.error('Error getting team members:', error);
      return [];
    }
  },

  updatePricingRequest: async (
    requestId: string,
    updates: Partial<PricingRequest>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const sanitized = sanitizePricingRequestUpdate(updates);
      const { error } = await supabase
        .from('pricing_requests')
        .update({
          ...sanitized,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error updating pricing request:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  bulkUpdatePricingRequests: async (
    requestIds: string[],
    updates: Partial<PricingRequest>
  ): Promise<{ success: boolean; updatedCount: number; error?: string }> => {
    try {
      const { error } = await supabase
        .from('pricing_requests')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .in('id', requestIds);

      if (error) throw error;

      return { success: true, updatedCount: requestIds.length };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error bulk updating pricing requests:', error);
      return { success: false, updatedCount: 0, error: errorMessage };
    }
  },

  getOrdersByStatus: async (status: string): Promise<Order[]> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Order[]) || [];
    } catch (error) {
      console.error('Error getting orders by status:', error);
      return [];
    }
  },

  getContactsByStatus: async (status: string): Promise<Contact[]> => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Contact[]) || [];
    } catch (error) {
      console.error('Error getting contacts by status:', error);
      return [];
    }
  },

  searchAll: async (searchTerm: string): Promise<{
    clients: Client[];
    pricingRequests: PricingRequest[];
    orders: Order[];
    contacts: Contact[];
  }> => {
    try {
      const searchPattern = `%${searchTerm}%`;

      const [clientsRes, requestsRes, ordersRes, contactsRes] = await Promise.all([
        supabase.from('clients').select('*').or(`username.ilike.${searchPattern},email.ilike.${searchPattern},company_name.ilike.${searchPattern}`).limit(10),
        supabase.from('pricing_requests').select('*').or(`guest_name.ilike.${searchPattern},guest_email.ilike.${searchPattern},guest_phone.ilike.${searchPattern}`).limit(10),
        supabase.from('orders').select('*').or(`guest_name.ilike.${searchPattern},guest_email.ilike.${searchPattern},company_name.ilike.${searchPattern}`).limit(10),
        supabase.from('contacts').select('*').or(`name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`).limit(10),
      ]);

      return {
        clients: (clientsRes.data as Client[]) || [],
        pricingRequests: (requestsRes.data as PricingRequest[]) || [],
        orders: (ordersRes.data as Order[]) || [],
        contacts: (contactsRes.data as Contact[]) || [],
      };
    } catch (error) {
      console.error('Error searching all:', error);
      return { clients: [], pricingRequests: [], orders: [], contacts: [] };
    }
  },

  adminUpdatePricingRequestStatus: async (id: string, status: PricingRequest['status'], adminNotes?: string): Promise<{ success: boolean; error?: string }> => {
    return updatePricingRequestStatus(id, status, undefined, adminNotes);
  },

  adminConvertPricingRequest: async (request: PricingRequest): Promise<{ success: boolean; error?: string }> => {
    const result = await convertPricingRequestToOrder(request.id);
    return { success: result.success, error: result.error };
  },

  adminDeletePricingRequest: async (id: string): Promise<{ success: boolean; error?: string }> => {
    return deletePricingRequest(id);
  },

  adminDeleteContact: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },

  adminUpdateContactStatus: async (id: string, status: Contact['status']): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },

  adminDeleteOrder: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },

  adminUpdateOrderStatus: async (id: string, status: Order['status']): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status, 
          updated_at: new Date().toISOString(),
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },

  adminDeleteDesign: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('saved_designs').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },

  adminUpdateDesignStatus: async (id: string, status: SavedDesign['status']): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('saved_designs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },
};

// Named re-exports so callers can import individual functions (used by
// `useAdminDashboard`). Keep these aligned with the object methods above.
export const adminUpdatePricingRequestStatus = adminDashboardService.adminUpdatePricingRequestStatus;
export const adminConvertPricingRequest = adminDashboardService.adminConvertPricingRequest;
export const adminDeletePricingRequest = adminDashboardService.adminDeletePricingRequest;
export const adminDeleteContact = adminDashboardService.adminDeleteContact;
export const adminUpdateContactStatus = adminDashboardService.adminUpdateContactStatus;
export const adminDeleteOrder = adminDashboardService.adminDeleteOrder;
export const adminUpdateOrderStatus = adminDashboardService.adminUpdateOrderStatus;
export const adminDeleteDesign = adminDashboardService.adminDeleteDesign;
export const adminUpdateDesignStatus = adminDashboardService.adminUpdateDesignStatus;

export default adminDashboardService;