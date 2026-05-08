import { supabase } from '@/lib/supabaseClient';
import type { Notification } from '@/types/dashboard';

export interface TelegramIntegrationSettings {
  id: string;
  user_id: string;
  client_id?: string | null;
  provider: 'telegram';
  chat_id: string;
  enabled: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SaveTelegramIntegrationInput {
  clientId?: string | null;
  botToken?: string;
  chatId: string;
  enabled: boolean;
}

const SAFE_COLUMNS = 'id,user_id,client_id,provider,chat_id,enabled,created_at,updated_at';

function cleanText(value?: string | null) {
  return String(value ?? '').trim();
}

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

export async function getTelegramIntegration(): Promise<TelegramIntegrationSettings | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('notification_integrations')
    .select(SAFE_COLUMNS)
    .eq('provider', 'telegram')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[telegramIntegrationService.getTelegramIntegration] Supabase error', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      table: 'notification_integrations',
      query: 'own telegram integration',
      userId,
    });
    throw error;
  }

  return (data as TelegramIntegrationSettings | null) ?? null;
}

export async function saveTelegramIntegration(
  input: SaveTelegramIntegrationInput,
): Promise<{ success: boolean; settings?: TelegramIntegrationSettings; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'missing_authenticated_user' };

    const token = cleanText(input.botToken);
    const payload: Record<string, unknown> = {
      user_id: userId,
      client_id: cleanText(input.clientId) || null,
      provider: 'telegram',
      chat_id: cleanText(input.chatId),
      enabled: input.enabled,
    };

    if (token) {
      payload.bot_token = token;
    }

    const { data, error } = await supabase
      .from('notification_integrations')
      .upsert(payload, { onConflict: 'provider,user_id' })
      .select(SAFE_COLUMNS)
      .single();

    if (error) {
      console.error('[telegramIntegrationService.saveTelegramIntegration] Supabase error', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        table: 'notification_integrations',
        query: 'upsert telegram integration',
        userId,
        clientId: input.clientId,
      });
      throw error;
    }

    return { success: true, settings: data as TelegramIntegrationSettings };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'telegram_settings_save_failed',
    };
  }
}

export async function sendTelegramTestNotification(
  clientId?: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-telegram-notification', {
      body: {
        mode: 'test',
        clientId: cleanText(clientId) || null,
      },
    });

    if (error) throw error;
    if (data && typeof data === 'object' && 'success' in data && data.success !== true) {
      return {
        success: false,
        error: typeof data.error === 'string' ? data.error : 'telegram_test_failed',
      };
    }
    return { success: true };
  } catch (error) {
    console.error('[telegramIntegrationService.sendTelegramTestNotification] Edge Function error', error);
    return { success: false, error: error instanceof Error ? error.message : 'telegram_test_failed' };
  }
}

export async function sendTelegramNotificationForNotification(
  notification: Notification,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-telegram-notification', {
      body: {
        mode: 'notification',
        notificationId: notification.id,
        userId: notification.user_id,
        clientId: notification.client_id ?? null,
        notification: {
          title: notification.title,
          message: notification.message,
          actionUrl: notification.action_url ?? null,
          priority: notification.priority ?? 'normal',
        },
      },
    });

    if (error) throw error;
    if (data && typeof data === 'object' && 'success' in data && data.success !== true) {
      return {
        success: false,
        error: typeof data.error === 'string' ? data.error : 'telegram_send_failed',
      };
    }
    return { success: true };
  } catch (error) {
    console.error('[telegramIntegrationService.sendTelegramNotificationForNotification] Edge Function error', {
      notificationId: notification.id,
      userId: notification.user_id,
      clientId: notification.client_id,
      error,
    });
    return { success: false, error: error instanceof Error ? error.message : 'telegram_send_failed' };
  }
}

export const telegramIntegrationService = {
  get: getTelegramIntegration,
  save: saveTelegramIntegration,
  test: sendTelegramTestNotification,
  sendForNotification: sendTelegramNotificationForNotification,
};

export default telegramIntegrationService;
