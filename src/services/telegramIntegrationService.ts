import { supabase } from '@/lib/supabaseClient';
import type { Notification } from '@/types/dashboard';
import { logSupabaseError, supabaseErrorMessage } from '@/services/supabaseErrorLogger';

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
const TELEGRAM_SKIP_COOLDOWN_MS = 5 * 60 * 1000;
const INFO_ERRORS = new Set(['telegram_not_configured', 'telegram_disabled', 'missing_authenticated_user']);
let telegramSkipUntil = 0;
let lastInfoLogKey = '';

function cleanText(value?: string | null) {
  return String(value ?? '').trim();
}

function logTelegramInfoOnce(key: string, payload: Record<string, unknown>) {
  if (lastInfoLogKey === key) return;
  lastInfoLogKey = key;
  console.info(`[telegramIntegrationService] ${key}`, payload);
}

function edgeErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const maybeContext = error as { message?: string; context?: { status?: number } };
    return [maybeContext.context?.status, maybeContext.message].filter(Boolean).join(': ') || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

async function getSessionAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) return null;
  return data.session.access_token;
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
    logSupabaseError('telegramIntegrationService.getTelegramIntegration', error, {
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
      logSupabaseError('telegramIntegrationService.saveTelegramIntegration', error, {
        table: 'notification_integrations',
        query: 'upsert telegram integration',
        userId,
        clientId: input.clientId,
        payload: {
          ...payload,
          bot_token: token ? '[redacted]' : undefined,
        },
      });
      throw error;
    }

    return { success: true, settings: data as TelegramIntegrationSettings };
  } catch (error) {
    return {
      success: false,
      error: supabaseErrorMessage(error, 'telegram_settings_save_failed'),
    };
  }
}

export async function sendTelegramTestNotification(
  clientId?: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getSessionAccessToken();
    if (!accessToken) {
      return { success: false, error: 'missing_authenticated_user' };
    }

    const { data, error } = await supabase.functions.invoke('send-telegram-notification', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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
    console.error('[telegramIntegrationService.sendTelegramTestNotification] Edge Function error', {
      message: edgeErrorMessage(error, 'telegram_test_failed'),
      error,
    });
    return { success: false, error: edgeErrorMessage(error, 'telegram_test_failed') };
  }
}

export async function sendTelegramNotificationForNotification(
  notification: Notification,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (Date.now() < telegramSkipUntil) {
      return { success: false, error: 'telegram_temporarily_skipped' };
    }

    const accessToken = await getSessionAccessToken();
    if (!accessToken) {
      telegramSkipUntil = Date.now() + TELEGRAM_SKIP_COOLDOWN_MS;
      logTelegramInfoOnce('missing_authenticated_user', {
        notificationId: notification.id,
        userId: notification.user_id,
        clientId: notification.client_id,
      });
      return { success: false, error: 'missing_authenticated_user' };
    }

    const { data, error } = await supabase.functions.invoke('send-telegram-notification', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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
      const code = typeof data.error === 'string' ? data.error : 'telegram_send_failed';
      if (INFO_ERRORS.has(code)) {
        telegramSkipUntil = Date.now() + TELEGRAM_SKIP_COOLDOWN_MS;
        logTelegramInfoOnce(code, {
          notificationId: notification.id,
          userId: notification.user_id,
          clientId: notification.client_id,
          details: 'details' in data ? data.details : undefined,
        });
      }
      return {
        success: false,
        error: code,
      };
    }
    return { success: true };
  } catch (error) {
    console.error('[telegramIntegrationService.sendTelegramNotificationForNotification] Edge Function error', {
      notificationId: notification.id,
      userId: notification.user_id,
      clientId: notification.client_id,
      message: edgeErrorMessage(error, 'telegram_send_failed'),
      error,
    });
    telegramSkipUntil = Date.now() + TELEGRAM_SKIP_COOLDOWN_MS;
    return { success: false, error: edgeErrorMessage(error, 'telegram_send_failed') };
  }
}

export const telegramIntegrationService = {
  get: getTelegramIntegration,
  save: saveTelegramIntegration,
  test: sendTelegramTestNotification,
  sendForNotification: sendTelegramNotificationForNotification,
};

export default telegramIntegrationService;
