import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchClientPortalSnapshot, sendMessage as sendMessageService, type PortalMessage, type PortalAsset } from '@/services/clientPortalService';
import { fetchDesignsByClient, deleteDesign as deleteDesignService } from '@/services/designService';
import type { SavedDesign } from '@/types/dashboard';
import { toast } from 'sonner';

export type { PortalMessage, PortalAsset };

function byCreatedAtAsc(a: PortalMessage, b: PortalMessage) {
  return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
}

function mergeMessages(current: PortalMessage[], incoming: PortalMessage[]) {
  const byId = new Map<string, PortalMessage>();

  [...current, ...incoming].forEach((message) => {
    if (!message?.id) return;
    byId.set(message.id, { ...(byId.get(message.id) ?? {}), ...message });
  });

  return Array.from(byId.values()).sort(byCreatedAtAsc);
}

type PortalCacheEntry = {
  messages: PortalMessage[];
  designs: SavedDesign[];
  assets: PortalAsset[];
};

const portalCache = new Map<string, PortalCacheEntry>();

export function usePortalData(clientId: string | undefined) {
  const cached = clientId ? portalCache.get(clientId) : undefined;
  const [messages, setMessages] = useState<PortalMessage[]>(() => cached?.messages ?? []);
  const [designs, setDesigns] = useState<SavedDesign[]>(() => cached?.designs ?? []);
  const [assets, setAssets] = useState<PortalAsset[]>(() => cached?.assets ?? []);
  const [loading, setLoading] = useState(() => Boolean(clientId && !cached));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!clientId) return;
    setLoading(!portalCache.has(clientId));
    setError(null);
    try {
      const [snapshot, designList] = await Promise.all([
        fetchClientPortalSnapshot(clientId),
        fetchDesignsByClient(clientId),
      ]);
      const nextAssets = (snapshot.assets as unknown as PortalAsset[]) ?? [];
      const nextDesigns = designList ?? [];
      const incomingMessages = (snapshot.messages as unknown as PortalMessage[]) ?? [];
      setMessages((prev) => {
        const nextMessages = mergeMessages(prev, incomingMessages);
        portalCache.set(clientId, {
          messages: nextMessages,
          assets: nextAssets,
          designs: nextDesigns,
        });
        return nextMessages;
      });
      setAssets(nextAssets);
      setDesigns(nextDesigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portal data');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!clientId) {
      setMessages([]);
      setAssets([]);
      setDesigns([]);
      setLoading(false);
      return;
    }

    const nextCached = portalCache.get(clientId);
    setMessages(nextCached?.messages ?? []);
    setAssets(nextCached?.assets ?? []);
    setDesigns(nextCached?.designs ?? []);
    setLoading(!nextCached);
    void reload();
  }, [clientId, reload]);

  useEffect(() => {
    if (!clientId) return;

    let msgSub: ReturnType<typeof supabase.channel> | null = null;
    let astSub: ReturnType<typeof supabase.channel> | null = null;

    try {
      msgSub = supabase.channel(`profile-msg:${clientId}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'client_messages', filter: `client_id=eq.${clientId}` },
          (payload) => setMessages((prev) => {
            const nextMessages = mergeMessages(prev, [payload.new as PortalMessage]);
            const current = portalCache.get(clientId);
            portalCache.set(clientId, {
              messages: nextMessages,
              assets: current?.assets ?? assets,
              designs: current?.designs ?? designs,
            });
            return nextMessages;
          }))
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
  }, [assets, clientId, designs, reload]);

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
      setDesigns((prev) => {
        const nextDesigns = prev.filter((d) => d.id !== id);
        if (clientId) {
          const current = portalCache.get(clientId);
          portalCache.set(clientId, {
            messages: current?.messages ?? messages,
            assets: current?.assets ?? assets,
            designs: nextDesigns,
          });
        }
        return nextDesigns;
      });
      toast.success('Design deleted');
    } catch (err) {
      console.error(err);
      toast.error('Could not delete the design');
    }
  }, [assets, clientId, messages]);

  const optimisticAddMessage = useCallback((msg: PortalMessage) => {
    setMessages((prev) => {
      const nextMessages = mergeMessages(prev, [msg]);
      if (clientId) {
        const current = portalCache.get(clientId);
        portalCache.set(clientId, {
          messages: nextMessages,
          assets: current?.assets ?? assets,
          designs: current?.designs ?? designs,
        });
      }
      return nextMessages;
    });
  }, [assets, clientId, designs]);

  return { messages, designs, assets, loading, error, reload, deleteDesign, optimisticAddMessage, sendMessage };
}
