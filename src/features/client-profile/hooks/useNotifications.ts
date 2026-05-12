import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getNotifications, markNotificationAsRead } from '@/services/notificationService';
import type { Notification } from '@/types/dashboard';

const notificationsCache = new Map<string, Notification[]>();

export function useNotifications(clientId: string | undefined) {
  const cached = clientId ? notificationsCache.get(clientId) : undefined;
  const [notifications, setNotifications] = useState<Notification[]>(() => cached ?? []);
  const [loading, setLoading] = useState(() => Boolean(clientId && !cached));
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setLoading(!notificationsCache.has(clientId));
    setError(null);
    try {
      const data = await getNotifications(clientId, true, 20);
      notificationsCache.set(clientId, data);
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      const nextCached = notificationsCache.get(clientId);
      setNotifications(nextCached ?? []);
      setLoading(!nextCached);
    } else {
      setNotifications([]);
      setLoading(false);
    }
    void fetchNotifications();
  }, [clientId, fetchNotifications]);

  useEffect(() => {
    if (!clientId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(`notifications:${clientId}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${clientId}` },
          (payload) => {
            setNotifications((prev) => {
              const next = [payload.new as Notification, ...prev];
              notificationsCache.set(clientId, next);
              return next;
            });
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
      setNotifications((prev) => {
        const next = prev.map((n) => n.id === notifId ? { ...n, is_read: true } : n);
        notificationsCache.set(clientId, next);
        return next;
      });
    } catch {
      // silently fail
    }
  }, [clientId]);

  return { notifications, loading, error, markAsRead, refetch: fetchNotifications };
}
