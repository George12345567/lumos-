import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type JsonResponseBody = {
  success: boolean;
  error?: string;
};

function json(status: number, body: JsonResponseBody): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isStrongTemporaryPassword(value: string): boolean {
  if (value.length < 8) return false;
  if (!/[a-z]/.test(value)) return false;
  if (!/[A-Z]/.test(value)) return false;
  if (!/\d/.test(value)) return false;
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return json(405, { success: false, error: 'method_not_allowed' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return json(500, { success: false, error: 'server_not_configured' });
    }

    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return json(401, { success: false, error: 'missing_authorization' });
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
      return json(401, { success: false, error: 'invalid_session' });
    }

    const { data: isAdmin, error: adminError } = await supabaseUser.rpc('is_admin');
    if (adminError || isAdmin !== true) {
      return json(403, { success: false, error: 'not_admin' });
    }

    let payload: { clientId?: unknown; newPassword?: unknown };
    try {
      payload = await req.json();
    } catch {
      return json(400, { success: false, error: 'invalid_json' });
    }

    const clientId = typeof payload.clientId === 'string' ? payload.clientId.trim() : '';
    const newPassword = typeof payload.newPassword === 'string' ? payload.newPassword : '';

    if (!clientId) {
      return json(400, { success: false, error: 'client_id_required' });
    }

    if (!newPassword) {
      return json(400, { success: false, error: 'password_required' });
    }

    if (!isStrongTemporaryPassword(newPassword)) {
      return json(400, { success: false, error: 'weak_password' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .maybeSingle();

    if (clientError) {
      return json(500, { success: false, error: 'client_lookup_failed' });
    }

    if (!client) {
      return json(404, { success: false, error: 'client_not_found' });
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(clientId, {
      password: newPassword,
    });

    if (authError) {
      const message = (authError.message ?? '').toLowerCase();
      if (message.includes('not found')) {
        return json(404, { success: false, error: 'auth_user_not_found' });
      }
      return json(500, { success: false, error: 'auth_password_update_failed' });
    }

    const { error: profileError } = await supabaseAdmin
      .from('clients')
      .update({
        auth_password_pending: false,
        password_must_change: true,
        password_updated_by_admin_at: new Date().toISOString(),
        password_updated_by_admin_by: user.id,
      })
      .eq('id', clientId);

    if (profileError) {
      return json(500, { success: false, error: 'client_profile_update_failed' });
    }

    return json(200, { success: true });
  } catch (error) {
    console.error('admin-set-client-password failed', error);
    return json(500, { success: false, error: 'internal_error' });
  }
});
