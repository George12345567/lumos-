import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthState } from '@/context/AuthContext';
import type { Notification } from '@/types/dashboard';
import {
  getNotificationCenterItems,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/notificationService';

export type NotificationCenterScope = 'client' | 'admin';

export function useNotificationCenter(scopeOverride?: NotificationCenterScope) {
  const { client, isAdmin, isAuthenticated, loading: authLoading } = useAuthState();
  const scope: NotificationCenterScope = scopeOverride ?? (isAdmin ? 'admin' : 'client');
  const userId = scope === 'client' ? client?.id : null;
  const canLoad = isAuthenticated && (scope === 'admin' ? isAdmin : Boolean(userId));

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(canLoad);
  const [error, setError] = useState<string | null>(null);
  const failedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!canLoad) {
      setNotifications([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getNotificationCenterItems({
        scope,
        userId,
        includeRead: true,
        limit: 60,
      });
      setNotifications(data);
      failedRef.current = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(message);
      setNotifications([]);
      failedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [canLoad, scope, userId]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  useEffect(() => {
    if (!canLoad || failedRef.current) return;

    const channelName = scope === 'client'
      ? `notification-center-client-${userId}`
      : 'notification-center-admin';

    const clientFilter = scope === 'client' && userId ? `user_id=eq.${userId}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          ...(clientFilter ? { filter: clientFilter } : {}),
        },
        (payload) => {
          const next = payload.new as Notification;
          if (scope === 'client' && next.user_type !== 'client') return;
          if (scope === 'admin' && next.user_type === 'client') return;

          setNotifications((prev) => {
            if (prev.some((item) => item.id === next.id)) return prev;
            return [next, ...prev].slice(0, 60);
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          ...(clientFilter ? { filter: clientFilter } : {}),
        },
        (payload) => {
          const next = payload.new as Notification;
          setNotifications((prev) => prev.map((item) => (item.id === next.id ? { ...item, ...next } : item)));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          ...(clientFilter ? { filter: clientFilter } : {}),
        },
        (payload) => {
          const oldRow = payload.old as Notification;
          setNotifications((prev) => prev.filter((item) => item.id !== oldRow.id));
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          failedRef.current = true;
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [canLoad, scope, userId]);

  const markRead = useCallback(async (id: string) => {
    if (!canLoad) return false;
    const result = await markNotificationAsRead(id, userId, { scope });
    if (result.success) {
      setNotifications((prev) => prev.map((item) => (
        item.id === id
          ? { ...item, is_read: true, read_at: item.read_at || new Date().toISOString() }
          : item
      )));
    }
    return result.success;
  }, [canLoad, scope, userId]);

  const markAllRead = useCallback(async () => {
    if (!canLoad) return false;
    const result = await markAllNotificationsAsRead(userId, { scope });
    if (result.success) {
      const readAt = new Date().toISOString();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true, read_at: item.read_at || readAt })));
    }
    return result.success;
  }, [canLoad, scope, userId]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  return {
    scope,
    canLoad,
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  };
}
