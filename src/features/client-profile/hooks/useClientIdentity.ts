import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  fetchClientIdentitySnapshot,
  type ClientIdentity,
  type ClientIdentityAsset,
} from '@/services/clientIdentityService';

export function useClientIdentity(clientId: string | undefined) {
  const [identity, setIdentity] = useState<ClientIdentity | null>(null);
  const [assets, setAssets] = useState<ClientIdentityAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const failedRef = useRef(false);

  const reload = useCallback(async () => {
    if (!clientId) return;

    setLoading(true);
    setError(null);
    try {
      const snapshot = await fetchClientIdentitySnapshot(clientId);
      setIdentity(snapshot.identity);
      setAssets(snapshot.assets);
      failedRef.current = false;
    } catch (err) {
      setIdentity(null);
      setAssets([]);
      setError(err instanceof Error ? err.message : 'Failed to load identity data');
      failedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    setIdentity(null);
    setAssets([]);
    setError(null);

    if (!clientId) return;
    void reload();
  }, [clientId, reload]);

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    const channel = supabase
      .channel(`client-identity:${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_identity', filter: `client_id=eq.${clientId}` }, () => {
        if (cancelled || failedRef.current) return;
        void reload();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_assets', filter: `client_id=eq.${clientId}` }, () => {
        if (cancelled || failedRef.current) return;
        void reload();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [clientId, reload]);

  return { identity, assets, loading, error, reload };
}
