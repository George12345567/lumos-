import { supabase } from '@/lib/supabaseClient';

export interface AdminSetClientPasswordResult {
  success: boolean;
  error?: string;
}

export async function adminSetClientTemporaryPassword(
  clientId: string,
  newPassword: string,
): Promise<AdminSetClientPasswordResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { success: false, error: 'missing_admin_session' };
  }

  const { data, error } = await supabase.functions.invoke('admin-set-client-password', {
    body: {
      clientId,
      newPassword,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const payload = await context.json().catch(() => null);
      if (payload && typeof payload.error === 'string') {
        return { success: false, error: payload.error };
      }
    }
    return { success: false, error: error.message || 'edge_function_failed' };
  }

  if (!data?.success) {
    return {
      success: false,
      error: typeof data?.error === 'string' ? data.error : 'temporary_password_failed',
    };
  }

  return { success: true };
}
