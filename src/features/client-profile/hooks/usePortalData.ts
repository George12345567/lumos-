import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchClientPortalSnapshot } from '@/services/clientPortalService';
import { fetchDesignsByClient, deleteDesign as deleteDesignService } from '@/services/designService';
import type { SavedDesign } from '@/types/dashboard';
import { toast } from 'sonner';

export interface PortalMessage {
  id: string;
  client_id: string;
  message: string;
  sender: 'client' | 'team' | string;
  created_at: string;
}

export interface PortalAsset {
  id: string;
  name?: string;
  asset_url?: string;
  asset_type?: string;
  created_at?: string;
}

export function usePortalData(clientId: string | undefined) {
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [assets, setAssets] = useState<PortalAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [snapshot, designList] = await Promise.all([
        fetchClientPortalSnapshot(clientId),
        fetchDesignsByClient(clientId),
      ]);
      setMessages((snapshot.messages as unknown as PortalMessage[]) ?? []);
      setAssets((snapshot.assets as unknown as PortalAsset[]) ?? []);
      setDesigns(designList ?? []);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Realtime — same channels as old monolith.
  useEffect(() => {
    if (!clientId) return;
    const msgSub = supabase.channel(`profile-msg:${clientId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'client_messages', filter: `client_id=eq.${clientId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as PortalMessage]))
      .subscribe();
    const astSub = supabase.channel(`profile-ast:${clientId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'client_assets', filter: `client_id=eq.${clientId}` },
        () => { void reload(); })
      .subscribe();
    return () => {
      supabase.removeChannel(msgSub);
      supabase.removeChannel(astSub);
    };
  }, [clientId, reload]);

  const deleteDesign = useCallback(async (id: string) => {
    if (!confirm('Delete this design?')) return;
    try {
      await deleteDesignService(id);
      setDesigns((prev) => prev.filter((d) => d.id !== id));
      toast.success('Design deleted');
    } catch (err) {
      console.error(err);
      toast.error('Could not delete the design');
    }
  }, []);

  const optimisticAddMessage = useCallback((msg: PortalMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  return { messages, designs, assets, loading, reload, deleteDesign, optimisticAddMessage };
}
