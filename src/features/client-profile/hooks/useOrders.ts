import { useEffect, useState, useCallback } from 'react';
import { fetchOrdersByClient, type Order } from '@/services/orderService';

export type ClientOrder = Order;

export function useOrders(clientId: string | undefined) {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOrdersByClient(clientId);
      if (result.error) {
        setError(result.error);
      } else {
        setOrders(result.orders ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders };
}