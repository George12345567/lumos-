import { useCallback, useEffect, useState } from 'react';
import { getClientPricingRequests } from '@/services/pricingRequestService';
import type { PricingRequest } from '@/types/dashboard';

/**
 * Loads the logged-in client's pricing requests for the profile Projects/Requests
 * tracking view. RLS ensures the client can only read rows where
 * `pricing_requests.client_id = auth.uid()`.
 */
export function useClientPricingRequests(clientId: string | undefined) {
  const [requests, setRequests] = useState<PricingRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(clientId));
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!clientId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getClientPricingRequests(clientId);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  return { requests, loading, error, refetch: fetchRequests };
}
