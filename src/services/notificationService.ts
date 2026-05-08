import { supabase } from '@/lib/supabaseClient';
import type { Notification, NotificationEntityType, NotificationType } from '@/types/dashboard';

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
type NotificationUserType = 'client' | 'team_member' | 'admin';
type NotificationScope = 'client' | 'admin';

const SYSTEM_NOTIFICATION_USER_ID = '00000000-0000-0000-0000-000000000000';
const DEDUPE_WINDOW_MS = 2 * 60 * 1000;

interface CreateNotificationParams {
  userId: string;
  userType: NotificationUserType;
  type: NotificationType;
  title: string;
  titleAr?: string | null;
  message: string;
  messageAr?: string | null;
  recipientUserId?: string | null;
  clientId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  entityType?: NotificationEntityType | null;
  entityId?: string | number | null;
  actionType?: string | null;
  actionId?: string | number | null;
  actionUrl?: string | null;
  priority?: NotificationPriority;
}

interface FetchNotificationCenterParams {
  scope: NotificationScope;
  userId?: string | null;
  includeRead?: boolean;
  limit?: number;
}

function cleanText(value?: string | number | null): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function normalizeNotificationPayload(params: CreateNotificationParams) {
  const entityId = cleanText(params.entityId);
  const actionId = cleanText(params.actionId) || entityId;
  const entityType = cleanText(params.entityType);
  const actionType = cleanText(params.actionType) || entityType || params.type;
  const clientId = cleanText(params.clientId) || (params.userType === 'client' ? params.userId : null);
  const recipientUserId = cleanText(params.recipientUserId) || (params.userType === 'client' ? params.userId : null);
  const fallbackActionUrl = (() => {
    if (params.userType === 'client') {
      if (entityType === 'client_message') return '/profile?tab=messages';
      if (entityType === 'client_asset') return params.type === 'identity' ? '/profile?tab=identity' : '/profile?tab=files';
      if (entityType === 'client_identity') return '/profile?tab=identity';
      if (entityType === 'order') return '/profile?tab=projects';
      if (entityType === 'pricing_request' || params.type === 'request' || params.type.startsWith('pricing_request')) return '/profile';
    }

    if (entityType === 'client_message' && clientId) return `/lumos-admin?section=messages&client=${clientId}`;
    if (entityType === 'pricing_request' || params.type === 'request' || params.type.startsWith('pricing_request')) return '/lumos-admin?section=requests';
    return null;
  })();

  return {
    user_id: params.userId,
    user_type: params.userType,
    recipient_user_id: recipientUserId,
    client_id: clientId,
    actor_id: cleanText(params.actorId),
    actor_name: cleanText(params.actorName),
    type: params.type,
    title: params.title,
    title_ar: params.titleAr ?? null,
    message: params.message,
    message_ar: params.messageAr ?? null,
    entity_type: entityType,
    entity_id: entityId,
    action_type: actionType,
    action_id: actionId,
    action_url: cleanText(params.actionUrl) || fallbackActionUrl,
    priority: params.priority || 'normal',
    is_read: false,
    created_at: new Date().toISOString(),
  };
}

function legacyNotificationPayload(payload: ReturnType<typeof normalizeNotificationPayload>) {
  return {
    user_id: payload.user_id,
    user_type: payload.user_type,
    type: payload.type,
    title: payload.title,
    title_ar: payload.title_ar,
    message: payload.message,
    message_ar: payload.message_ar,
    action_type: payload.action_type,
    action_id: payload.action_id,
    action_url: payload.action_url,
    priority: payload.priority,
    is_read: payload.is_read,
    created_at: payload.created_at,
  };
}

function isMissingExtendedColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error ?? '');
  return /recipient_user_id|client_id|actor_id|actor_name|entity_type|entity_id/i.test(message);
}

async function findRecentDuplicate(
  payload: ReturnType<typeof normalizeNotificationPayload>,
): Promise<Notification | null> {
  try {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', payload.user_id)
      .eq('user_type', payload.user_type)
      .eq('type', payload.type)
      .eq('title', payload.title)
      .eq('message', payload.message)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1);

    if (payload.action_id) {
      query = query.eq('action_id', payload.action_id);
    }

    const { data, error } = await query;
    if (error) return null;
    return ((data as Notification[] | null)?.[0]) ?? null;
  } catch {
    return null;
  }
}

export const createNotification = async (
  params: CreateNotificationParams,
): Promise<{ success: boolean; id?: string; error?: string; deduped?: boolean }> => {
  try {
    const payload = normalizeNotificationPayload(params);
    const duplicate = await findRecentDuplicate(payload);
    if (duplicate?.id) {
      return { success: true, id: duplicate.id, deduped: true };
    }

    let result = await supabase
      .from('notifications')
      .insert(payload)
      .select()
      .single();

    if (result.error && isMissingExtendedColumnError(result.error)) {
      result = await supabase
        .from('notifications')
        .insert(legacyNotificationPayload(payload))
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return { success: true, id: (result.data as Notification).id };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating notification:', error);
    return { success: false, error: errorMessage };
  }
};

export const createClientNotification = async (params: {
  clientId: string;
  type: NotificationType;
  title: string;
  titleAr?: string | null;
  message: string;
  messageAr?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  entityType?: NotificationEntityType | null;
  entityId?: string | number | null;
  actionUrl?: string | null;
  priority?: NotificationPriority;
}) => createNotification({
  userId: params.clientId,
  userType: 'client',
  recipientUserId: params.clientId,
  clientId: params.clientId,
  type: params.type,
  title: params.title,
  titleAr: params.titleAr,
  message: params.message,
  messageAr: params.messageAr,
  actorId: params.actorId,
  actorName: params.actorName,
  entityType: params.entityType,
  entityId: params.entityId,
  actionUrl: params.actionUrl,
  priority: params.priority,
});

export const createAdminNotification = async (params: {
  clientId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  type: NotificationType;
  title: string;
  titleAr?: string | null;
  message: string;
  messageAr?: string | null;
  entityType?: NotificationEntityType | null;
  entityId?: string | number | null;
  actionUrl?: string | null;
  priority?: NotificationPriority;
}) => createNotification({
  userId: cleanText(params.actorId) || cleanText(params.clientId) || SYSTEM_NOTIFICATION_USER_ID,
  userType: 'team_member',
  clientId: cleanText(params.clientId),
  actorId: cleanText(params.actorId),
  actorName: cleanText(params.actorName),
  type: params.type,
  title: params.title,
  titleAr: params.titleAr,
  message: params.message,
  messageAr: params.messageAr,
  entityType: params.entityType,
  entityId: params.entityId,
  actionUrl: params.actionUrl,
  priority: params.priority,
});

export const getNotifications = async (
  userId: string,
  includeRead: boolean = false,
  limit: number = 20,
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

export const getNotificationCenterItems = async ({
  scope,
  userId,
  includeRead = true,
  limit = 50,
}: FetchNotificationCenterParams): Promise<Notification[]> => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (scope === 'client') {
      if (!userId) return [];
      query = query.eq('user_type', 'client').eq('user_id', userId);
    } else {
      query = query.neq('user_type', 'client');
    }

    if (!includeRead) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Notification[]) || [];
  } catch (error) {
    console.error('Error getting notification center items:', error);
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
  userId?: string | null,
  options: { scope?: NotificationScope } = {},
): Promise<{ success: boolean; error?: string }> => {
  try {
    let query = supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (options.scope !== 'admin' && userId) {
      query = query.eq('user_id', userId).eq('user_type', 'client');
    } else if (options.scope === 'admin') {
      query = query.neq('user_type', 'client');
    }

    const { error } = await query;

    if (error) throw error;

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error marking notification as read:', error);
    return { success: false, error: errorMessage };
  }
};

export const markAllNotificationsAsRead = async (
  userId?: string | null,
  options: { scope?: NotificationScope } = {},
): Promise<{ success: boolean; error?: string }> => {
  try {
    let query = supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('is_read', false);

    if (options.scope === 'admin') {
      query = query.neq('user_type', 'client');
    } else if (userId) {
      query = query.eq('user_id', userId).eq('user_type', 'client');
    } else {
      return { success: false, error: 'missing_user_id' };
    }

    const { error } = await query;

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
  userId?: string | null,
  options: { scope?: NotificationScope } = {},
): Promise<{ success: boolean; error?: string }> => {
  try {
    let query = supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (options.scope === 'admin') {
      query = query.neq('user_type', 'client');
    } else if (userId) {
      query = query.eq('user_id', userId).eq('user_type', 'client');
    } else {
      return { success: false, error: 'missing_user_id' };
    }

    const { error } = await query;

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
  limit: number = 50,
): Promise<Notification[]> => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', teamMemberId)
      .neq('user_type', 'client')
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
  notifications: CreateNotificationParams[],
): Promise<{ success: boolean; sentCount: number; error?: string }> => {
  try {
    const results = await Promise.all(notifications.map((item) => createNotification(item)));
    const sentCount = results.filter((result) => result.success).length;
    const failed = results.find((result) => !result.success);

    return {
      success: sentCount === notifications.length,
      sentCount,
      error: failed?.error,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending bulk notifications:', error);
    return { success: false, sentCount: 0, error: errorMessage };
  }
};

export const notificationService = {
  create: createNotification,
  createForClient: createClientNotification,
  createForAdmin: createAdminNotification,
  getAll: getNotifications,
  getCenterItems: getNotificationCenterItems,
  getUnreadCount: getUnreadNotificationCount,
  markAsRead: markNotificationAsRead,
  markAllAsRead: markAllNotificationsAsRead,
  delete: deleteNotification,
  getTeamNotifications,
  sendBulk: sendBulkNotifications,
};

export default notificationService;
