import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type RequestBody = {
  mode?: 'test' | 'notification';
  notificationId?: string;
  userId?: string | null;
  clientId?: string | null;
  notification?: {
    title?: string;
    message?: string;
    actionUrl?: string | null;
    priority?: string | null;
  };
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function cleanText(value?: string | null) {
  return String(value ?? '').trim();
}

function appUrl() {
  return cleanText(Deno.env.get('LUMOS_APP_URL') || Deno.env.get('SITE_URL'));
}

function buildMessage(body: RequestBody) {
  if (body.mode === 'test') {
    return 'Lumos Telegram test notification is working.';
  }

  const title = cleanText(body.notification?.title) || 'Lumos notification';
  const message = cleanText(body.notification?.message);
  const actionUrl = cleanText(body.notification?.actionUrl);
  const baseUrl = appUrl();
  const url = actionUrl
    ? /^https?:\/\//i.test(actionUrl)
      ? actionUrl
      : `${baseUrl}${actionUrl.startsWith('/') ? actionUrl : `/${actionUrl}`}`
    : '';

  return [title, message, url ? `Open: ${url}` : ''].filter(Boolean).join('\n\n');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (request.method !== 'POST') {
      return json({ success: false, error: 'method_not_allowed' }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ success: false, error: 'missing_edge_function_env' }, 500);
    }

    const authHeader = request.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) {
      return json({ success: false, error: 'missing_authorization' }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser(jwt);
    if (userError || !userData.user?.id) {
      return json({ success: false, error: 'invalid_authorization' }, 401);
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const callerId = userData.user.id;
    const targetUserId = cleanText(body.userId) || callerId;
    const targetClientId = cleanText(body.clientId);

    const { data: callerProfile } = await adminClient
      .from('clients')
      .select('id,is_admin,role,email')
      .eq('id', callerId)
      .maybeSingle();

    const callerIsAdmin = Boolean(callerProfile?.is_admin || ['owner', 'admin'].includes(cleanText(callerProfile?.role)));
    if (!callerIsAdmin && targetUserId !== callerId && targetClientId !== callerId) {
      return json({ success: false, error: 'not_allowed' }, 403);
    }

    let query = adminClient
      .from('notification_integrations')
      .select('id,user_id,client_id,bot_token,chat_id,enabled')
      .eq('provider', 'telegram')
      .eq('enabled', true);

    if (targetClientId) {
      query = query.or(`user_id.eq.${targetUserId},client_id.eq.${targetClientId}`);
    } else {
      query = query.eq('user_id', targetUserId);
    }

    const { data: integrations, error: integrationError } = await query.limit(1);
    if (integrationError) {
      return json({ success: false, error: integrationError.message }, 500);
    }

    const integration = integrations?.[0];
    if (!integration?.bot_token || !integration?.chat_id) {
      return json({ success: false, error: 'telegram_not_configured' }, 200);
    }

    const telegramResponse = await fetch(`https://api.telegram.org/bot${integration.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: integration.chat_id,
        text: buildMessage(body),
        disable_web_page_preview: true,
      }),
    });

    const telegramBody = await telegramResponse.json().catch(() => null);
    if (!telegramResponse.ok || telegramBody?.ok !== true) {
      return json({
        success: false,
        error: telegramBody?.description || 'telegram_api_failed',
        status: telegramResponse.status,
      }, 200);
    }

    return json({ success: true });
  } catch (error) {
    console.error('[send-telegram-notification] Unhandled error', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
