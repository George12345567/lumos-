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

function fail(status: number, error: string, details: string) {
  return json({ success: false, error, details }, status);
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

async function getCallerAuth(params: {
  adminClient: ReturnType<typeof createClient>;
  authClient: ReturnType<typeof createClient>;
  callerId: string;
  callerEmail?: string | null;
}) {
  const { adminClient, authClient, callerId, callerEmail } = params;

  const [isAdminRpc, projectViewRpc, clientsViewRpc] = await Promise.all([
    authClient.rpc('is_admin').catch(() => ({ data: false, error: null })),
    authClient.rpc('has_admin_permission', { p_resource: 'projects', p_action: 'view' }).catch(() => ({ data: false, error: null })),
    authClient.rpc('has_admin_permission', { p_resource: 'clients', p_action: 'view' }).catch(() => ({ data: false, error: null })),
  ]);

  const clientFilters = [`id.eq.${callerId}`];
  if (callerEmail) clientFilters.push(`email.eq.${callerEmail}`);
  const { data: clientRows } = await adminClient
    .from('clients')
    .select('id,is_admin,role,email')
    .or(clientFilters.join(','))
    .limit(2);

  const teamFilters = [`user_id.eq.${callerId}`, `client_id.eq.${callerId}`];
  if (callerEmail) teamFilters.push(`email.eq.${callerEmail}`);
  const { data: teamRows } = await adminClient
    .from('team_members')
    .select('id,user_id,client_id,email,role,is_active,permissions')
    .or(teamFilters.join(','))
    .limit(2);

  const clientAdmin = (clientRows ?? []).some((row) =>
    Boolean(row?.is_admin) || ['owner', 'admin'].includes(cleanText(row?.role)),
  );
  const teamAdmin = (teamRows ?? []).some((row) =>
    row?.is_active !== false && ['owner', 'admin', 'manager'].includes(cleanText(row?.role)),
  );

  return {
    isAdmin: Boolean(isAdminRpc.data || projectViewRpc.data || clientsViewRpc.data || clientAdmin || teamAdmin),
    clientIds: new Set((clientRows ?? []).map((row) => cleanText(row?.id)).filter(Boolean)),
  };
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
      return fail(405, 'method_not_allowed', 'Only POST is supported.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return fail(500, 'missing_edge_function_env', 'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY must be configured.');
    }

    const authHeader = request.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) {
      return fail(401, 'missing_authorization', 'Authorization Bearer token is required.');
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser(jwt);
    if (userError || !userData.user?.id) {
      return fail(401, 'invalid_authorization', userError?.message || 'The supplied JWT is not valid.');
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    if (body.mode !== 'test' && body.mode !== 'notification') {
      return fail(400, 'invalid_payload', 'mode must be "test" or "notification".');
    }

    const callerId = userData.user.id;
    const callerEmail = userData.user.email ?? null;
    const targetUserId = cleanText(body.userId) || callerId;
    const targetClientId = cleanText(body.clientId);

    const callerAuth = await getCallerAuth({ adminClient, authClient, callerId, callerEmail });
    const callerOwnsTarget = targetUserId === callerId || targetClientId === callerId || callerAuth.clientIds.has(targetClientId);
    if (!callerAuth.isAdmin && !callerOwnsTarget) {
      return fail(403, 'not_authorized', 'Authenticated user cannot send Telegram notifications for this user/client.');
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
      console.error('[send-telegram-notification] integration lookup failed', {
        code: integrationError.code,
        message: integrationError.message,
        details: integrationError.details,
        hint: integrationError.hint,
        targetUserId,
        targetClientId,
      });
      return fail(500, 'integration_lookup_failed', integrationError.message);
    }

    const integration = integrations?.[0];
    if (integration && integration.enabled !== true) {
      return json({ success: false, error: 'telegram_disabled', details: 'Telegram integration is disabled.' }, 200);
    }
    if (!integration?.bot_token || !integration?.chat_id) {
      return json({ success: false, error: 'telegram_not_configured', details: 'No enabled Telegram integration with bot token and chat id was found.' }, 200);
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
        error: 'telegram_api_failed',
        details: telegramBody?.description || 'Telegram API returned a failure response.',
        status: telegramResponse.status,
      }, 200);
    }

    return json({ success: true });
  } catch (error) {
    console.error('[send-telegram-notification] Unhandled error', error);
    return json({
      success: false,
      error: 'edge_function_failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
