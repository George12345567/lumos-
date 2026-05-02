import { supabase } from '@/lib/supabaseClient';
import type { DashboardStats, PricingRequest, Contact, Order, Client, TeamMember, SavedDesign } from '@/types/dashboard';
import { updatePricingRequestStatus, convertPricingRequestToOrder, deletePricingRequest } from './pricingRequestService';

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
      const { error } = await supabase
        .from('pricing_requests')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error updating pricing request:', error);
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

export default adminDashboardService;