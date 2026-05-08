import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export interface AdminNotification {
  id: string;
  user_id: string;
  user_type: 'client' | 'team_member';
  type: string;
  title: string;
  title_ar?: string;
  message: string;
  message_ar?: string;
  is_read: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setNotifications((data as AdminNotification[]) || []);
    } catch (err) {
      console.error('useAdminNotifications failed:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error('markRead failed:', err);
      toast.error('Failed to mark as read');
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('markAllRead failed:', err);
      toast.error('Failed to mark all as read');
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('remove notification failed:', err);
      toast.error('Failed to delete notification');
    }
  }, []);

  return { notifications, loading, refresh, markRead, markAllRead, remove };
}
