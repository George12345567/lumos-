import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/config/auth';
import type { Client, TeamMember } from '@/types/dashboard';
import type { AdminRole } from '@/features/admin/types';

export interface AdminAccessProfile {
  allowed: boolean;
  role: AdminRole;
  client: Client | null;
  teamMember: TeamMember | null;
  email: string | null;
  reason?: 'not_authenticated' | 'not_admin_or_team';
}

async function getClientRow(userId: string): Promise<Client | null> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) return null;
    return (data as Client | null) ?? null;
  } catch {
    return null;
  }
}

async function getTeamMember(userId: string, email: string | null): Promise<TeamMember | null> {
  const attempts: Array<{ column: 'user_id' | 'client_id' | 'email'; value: string; caseInsensitive?: boolean }> = [
    { column: 'user_id', value: userId },
    { column: 'client_id', value: userId },
  ];

  if (email) attempts.push({ column: 'email', value: email, caseInsensitive: true });

  for (const attempt of attempts) {
    try {
      const base = supabase
        .from('team_members')
        .select('*')
        .eq('is_active', true);
      const query = attempt.caseInsensitive
        ? base.ilike(attempt.column, attempt.value)
        : base.eq(attempt.column, attempt.value);
      const { data, error } = await query.maybeSingle();
      if (!error && data) return data as TeamMember;
    } catch {
      // Try the next resolver.
    }
  }

  return null;
}

export async function resolveAdminAccess(): Promise<AdminAccessProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      allowed: false,
      role: 'viewer',
      client: null,
      teamMember: null,
      email: null,
      reason: 'not_authenticated',
    };
  }

  const email = user.email?.trim().toLowerCase() || null;
  const [client, teamMember] = await Promise.all([
    getClientRow(user.id),
    getTeamMember(user.id, email),
  ]);

  const clientRole = (client?.role || '').toLowerCase();
  if (clientRole === 'owner' || isAdminEmail(email)) {
    return { allowed: true, role: 'owner', client, teamMember, email };
  }

  if (clientRole === 'admin') {
    return { allowed: true, role: 'admin', client, teamMember, email };
  }

  if (teamMember?.is_active) {
    return {
      allowed: true,
      role: (teamMember.role || 'viewer') as AdminRole,
      client,
      teamMember,
      email,
    };
  }

  return {
    allowed: false,
    role: 'viewer',
    client,
    teamMember: null,
    email,
    reason: 'not_admin_or_team',
  };
}

export const adminAccessService = {
  resolveAdminAccess,
};

export default adminAccessService;
