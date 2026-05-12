import { useCallback, useEffect, useState } from 'react';
import { getClientPricingRequests } from '@/services/pricingRequestService';
import type { PricingRequest } from '@/types/dashboard';

const pricingRequestsCache = new Map<string, PricingRequest[]>();

/**
 * Loads the logged-in client's pricing requests for the profile Projects/Requests
 * tracking view. RLS ensures the client can only read rows where
 * `pricing_requests.client_id = auth.uid()`.
 */
export function useClientPricingRequests(clientId: string | undefined) {
  const cached = clientId ? pricingRequestsCache.get(clientId) : undefined;
  const [requests, setRequests] = useState<PricingRequest[]>(() => cached ?? []);
  const [loading, setLoading] = useState<boolean>(() => Boolean(clientId && !cached));
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!clientId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(!pricingRequestsCache.has(clientId));
    setError(null);
    try {
      const data = await getClientPricingRequests(clientId);
      pricingRequestsCache.set(clientId, data);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      const nextCached = pricingRequestsCache.get(clientId);
      setRequests(nextCached ?? []);
      setLoading(!nextCached);
    }
    void fetchRequests();
  }, [clientId, fetchRequests]);

  return { requests, loading, error, refetch: fetchRequests };
}
