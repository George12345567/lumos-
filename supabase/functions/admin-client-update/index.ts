import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type JsonBody = {
  success: boolean;
  error?: string;
  details?: string;
  client?: Record<string, unknown>;
};

type AdminClientPayload = {
  action?: unknown;
  clientId?: unknown;
  payload?: Record<string, unknown>;
};

const CLIENT_UPDATE_FIELDS = new Set([
  'username',
  'email',
  'phone',
  'phone_number',
  'company_name',
  'package_name',
  'status',
  'progress',
  'next_steps',
  'package_details',
  'subscription_config',
  'admin_notes',
  'active_offer',
  'active_offer_link',
  'logo_url',
  'avatar_url',
  'cover_gradient',
  'theme_accent',
  'brand_colors',
  'business_tagline',
  'full_contact_name',
  'website',
  'brand_feel',
  'industry',
  'services_needed',
  'budget_range',
  'timeline',
  'referral_source',
  'project_summary',
  'account_type',
  'is_verified',
  'verified_label',
  'verified_by',
  'verified_at',
]);

function json(status: number, body: JsonBody): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function cleanUpdatePayload(payload: Record<string, unknown>, userId: string) {
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (!CLIENT_UPDATE_FIELDS.has(key) || value === undefined) continue;
    next[key] = value;
  }

  if (Object.prototype.hasOwnProperty.call(next, 'is_verified')) {
    const verified = next.is_verified === true;
    next.is_verified = verified;
    next.verified_label = verified
      ? String(next.verified_label || 'Verified Lumos Client')
      : null;
    next.verified_by = verified ? userId : null;
    next.verified_at = verified ? new Date().toISOString() : null;
  }

  if (Object.prototype.hasOwnProperty.call(next, 'progress')) {
    const progress = Number(next.progress);
    next.progress = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  }

  next.updated_at = new Date().toISOString();
  return next;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return json(405, {
      success: false,
      error: 'method_not_allowed',
      details: 'admin-client-update only accepts POST requests.',
    });
  }

  let payload: AdminClientPayload = {};

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return json(500, {
        success: false,
        error: 'server_not_configured',
        details: 'Missing Supabase Edge Function environment variables.',
      });
    }

    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return json(401, {
        success: false,
        error: 'missing_authorization',
        details: 'Authorization Bearer token is required.',
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return json(401, {
        success: false,
        error: 'invalid_session',
        details: 'The supplied bearer token is not a valid Supabase session.',
      });
    }

    const { data: isAdmin, error: adminError } = await supabaseUser.rpc('is_admin');
    const { data: canEditClients, error: permissionError } = await supabaseUser.rpc(
      'has_admin_permission',
      { p_resource: 'clients', p_action: 'edit' },
    );

    if (adminError || permissionError || (isAdmin !== true && canEditClients !== true)) {
      return json(403, {
        success: false,
        error: 'not_authorized',
        details: 'You do not have permission to edit clients.',
      });
    }

    try {
      payload = await req.json();
    } catch {
      return json(400, {
        success: false,
        error: 'invalid_json',
        details: 'Request body must be valid JSON.',
      });
    }

    const action = typeof payload.action === 'string' ? payload.action : 'update';
    const clientId = typeof payload.clientId === 'string' ? payload.clientId.trim() : '';

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    if (action === 'update') {
      if (!clientId) {
        return json(400, {
          success: false,
          error: 'client_id_required',
          details: 'clientId is required for client updates.',
        });
      }

      const updatePayload = cleanUpdatePayload(payload.payload ?? {}, user.id);
      if (Object.keys(updatePayload).length <= 1) {
        return json(400, {
          success: false,
          error: 'empty_update',
          details: 'No supported client fields were provided.',
        });
      }

      const { data: client, error } = await supabaseAdmin
        .from('clients')
        .update(updatePayload)
        .eq('id', clientId)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('[admin-client-update]', { error, payload: { action, clientId, fields: Object.keys(updatePayload) } });
        return json(500, {
          success: false,
          error: 'client_update_failed',
          details: error.message,
        });
      }

      if (!client) {
        return json(404, {
          success: false,
          error: 'client_not_found',
          details: 'No client was found for the supplied clientId.',
        });
      }

      return json(200, { success: true, client });
    }

    if (action === 'delete') {
      if (!clientId) {
        return json(400, {
          success: false,
          error: 'client_id_required',
          details: 'clientId is required for client deletion.',
        });
      }

      const { error } = await supabaseAdmin.from('clients').delete().eq('id', clientId);
      if (error) {
        console.error('[admin-client-update]', { error, payload: { action, clientId } });
        return json(500, {
          success: false,
          error: 'client_delete_failed',
          details: error.message,
        });
      }

      return json(200, { success: true });
    }

    if (action === 'create') {
      const createPayload = cleanUpdatePayload(payload.payload ?? {}, user.id);
      delete createPayload.updated_at;

      if (!createPayload.email || !createPayload.username) {
        return json(400, {
          success: false,
          error: 'client_create_missing_fields',
          details: 'email and username are required.',
        });
      }

      const { data: client, error } = await supabaseAdmin
        .from('clients')
        .insert(createPayload)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('[admin-client-update]', { error, payload: { action, fields: Object.keys(createPayload) } });
        return json(500, {
          success: false,
          error: 'client_create_failed',
          details: error.message,
        });
      }

      return json(200, { success: true, client: client ?? undefined });
    }

    return json(400, {
      success: false,
      error: 'unsupported_action',
      details: `Unsupported action: ${action}`,
    });
  } catch (error) {
    console.error('[admin-client-update]', { error, payload });
    return json(500, {
      success: false,
      error: 'internal_error',
      details: error instanceof Error ? error.message : 'Unexpected server error.',
    });
  }
});
