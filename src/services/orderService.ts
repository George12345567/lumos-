import { supabase } from '@/lib/supabaseClient';

export interface Order {
  id: string;
  client_id: string;
  order_type?: string;
  package_name?: string;
  status: string;
  total_price: number;
  price_currency?: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
  selected_services?: { name: string; nameAr?: string; price: number; category?: string }[];
  admin_notes?: string;
}

export async function fetchOrdersByClient(clientId: string): Promise<{ orders: Order[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) return { orders: null, error: error.message };
    return { orders: data as Order[], error: null };
  } catch (err) {
    return { orders: null, error: err instanceof Error ? err.message : 'Failed to fetch orders' };
  }
}

export const orderService = {
  fetchByClient: fetchOrdersByClient,
};