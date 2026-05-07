import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchClientPortalSnapshot, sendMessage as sendMessageService, type PortalMessage, type PortalAsset } from '@/services/clientPortalService';
import { fetchDesignsByClient, deleteDesign as deleteDesignService } from '@/services/designService';
import type { SavedDesign } from '@/types/dashboard';
import { toast } from 'sonner';

export type { PortalMessage, PortalAsset };

export function usePortalData(clientId: string | undefined) {
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [assets, setAssets] = useState<PortalAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const [snapshot, designList] = await Promise.all([
        fetchClientPortalSnapshot(clientId),
        fetchDesignsByClient(clientId),
      ]);
      setMessages((snapshot.messages as unknown as PortalMessage[]) ?? []);
      setAssets((snapshot.assets as unknown as PortalAsset[]) ?? []);
      setDesigns(designList ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portal data');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!clientId) return;

    let msgSub: ReturnType<typeof supabase.channel> | null = null;
    let astSub: ReturnType<typeof supabase.channel> | null = null;

    try {
      msgSub = supabase.channel(`profile-msg:${clientId}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'client_messages', filter: `client_id=eq.${clientId}` },
          (payload) => setMessages((prev) => [...prev, payload.new as PortalMessage]))
        .subscribe();
      astSub = supabase.channel(`profile-ast:${clientId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'client_assets', filter: `client_id=eq.${clientId}` },
          () => { void reload(); })
        .subscribe();
    } catch {
      // Realtime not available (stub mode) — polling fallback handled by reload
    }

    return () => {
      try {
        if (msgSub) supabase.removeChannel(msgSub);
        if (astSub) supabase.removeChannel(astSub);
      } catch {
        // ignore cleanup errors
      }
    };
  }, [clientId, reload]);

  const sendMessage = useCallback(async (message: string): Promise<boolean> => {
    if (!clientId || !message.trim()) return false;
    try {
      const result = await sendMessageService(clientId, message);
      if (!result.success) {
        toast.error('Failed to send message');
        return false;
      }
      await reload();
      return true;
    } catch {
      toast.error('Failed to send message');
      return false;
    }
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

  return { messages, designs, assets, loading, error, reload, deleteDesign, optimisticAddMessage, sendMessage };
}