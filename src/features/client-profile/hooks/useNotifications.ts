import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getNotifications, markNotificationAsRead } from '@/services/notificationService';

export interface ClientNotification {
  id: string;
  message: string;
  messageAr?: string;
  type: 'info' | 'milestone' | 'alert' | 'update';
  created_at: string;
  is_read: boolean;
}

export function useNotifications(clientId: string | undefined) {
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications(clientId, true, 20);
      setNotifications(data as ClientNotification[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!clientId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(`notifications:${clientId}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${clientId}` },
          (payload) => {
            setNotifications((prev) => [payload.new as ClientNotification, ...prev]);
          })
        .subscribe();
    } catch {
      // Realtime not available (stub mode)
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore cleanup errors
      }
    };
  }, [clientId]);

  const markAsRead = useCallback(async (notifId: string) => {
    if (!clientId) return;
    try {
      await markNotificationAsRead(notifId, clientId);
      setNotifications((prev) => prev.map((n) => n.id === notifId ? { ...n, is_read: true } : n));
    } catch {
      // silently fail
    }
  }, [clientId]);

  return { notifications, loading, error, markAsRead, refetch: fetchNotifications };
}