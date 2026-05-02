import { supabase } from '@/lib/supabaseClient';
import type { Notification } from '@/types/dashboard';
import { logAuditChange } from './auditService';

interface CreateNotificationParams {
  userId: string;
  userType: 'client' | 'team_member';
  type: Notification['type'];
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  actionType?: string;
  actionId?: string;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export const createNotification = async (params: CreateNotificationParams): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const notificationData = {
      user_id: params.userId,
      user_type: params.userType,
      type: params.type,
      title: params.title,
      title_ar: params.titleAr,
      message: params.message,
      message_ar: params.messageAr,
      action_type: params.actionType || null,
      action_id: params.actionId || null,
      action_url: params.actionUrl || null,
      priority: params.priority || 'normal',
      is_read: false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (error) throw error;

    return { success: true, id: data.id };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating notification:', error);
    return { success: false, error: errorMessage };
  }
};

export const getNotifications = async (
  userId: string,
  includeRead: boolean = false,
  limit: number = 20
): Promise<Notification[]> => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!includeRead) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data as Notification[]) || [];
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error marking notification as read:', error);
    return { success: false, error: errorMessage };
  }
};

export const markAllNotificationsAsRead = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: errorMessage };
  }
};

export const deleteNotification = async (
  notificationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting notification:', error);
    return { success: false, error: errorMessage };
  }
};

export const getTeamNotifications = async (
  teamMemberId: string,
  includeRead: boolean = false,
  limit: number = 50
): Promise<Notification[]> => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', teamMemberId)
      .eq('user_type', 'team_member')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!includeRead) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data as Notification[]) || [];
  } catch (error) {
    console.error('Error getting team notifications:', error);
    return [];
  }
};

export const sendBulkNotifications = async (
  notifications: CreateNotificationParams[]
): Promise<{ success: boolean; sentCount: number; error?: string }> => {
  try {
    const notificationsData = notifications.map(params => ({
      user_id: params.userId,
      user_type: params.userType,
      type: params.type,
      title: params.title,
      title_ar: params.titleAr,
      message: params.message,
      message_ar: params.messageAr,
      action_type: params.actionType || null,
      action_id: params.actionId || null,
      action_url: params.actionUrl || null,
      priority: params.priority || 'normal',
      is_read: false,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notificationsData);

    if (error) throw error;

    return { success: true, sentCount: notifications.length };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending bulk notifications:', error);
    return { success: false, sentCount: 0, error: errorMessage };
  }
};

export const notificationService = {
  create: createNotification,
  getAll: getNotifications,
  getUnreadCount: getUnreadNotificationCount,
  markAsRead: markNotificationAsRead,
  markAllAsRead: markAllNotificationsAsRead,
  delete: deleteNotification,
  getTeamNotifications,
  sendBulk: sendBulkNotifications
};

export default notificationService;