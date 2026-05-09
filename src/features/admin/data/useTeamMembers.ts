import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Client, TeamMember } from '@/types/dashboard';
import { toast } from 'sonner';
import { logSupabaseError, supabaseErrorMessage } from '@/services/supabaseErrorLogger';

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name', { ascending: true });
      if (error) {
        logSupabaseError('useTeamMembers.refresh', error, {
          table: 'team_members',
          query: 'team members list',
        });
        throw error;
      }
      setMembers((data as TeamMember[]) || []);
    } catch (err) {
      logSupabaseError('useTeamMembers.refresh.catch', err, {
        table: 'team_members',
        query: 'team members list',
      });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createMember = useCallback(
    async (input: Partial<TeamMember>) => {
      try {
        const insertPayload: Record<string, unknown> = {
          name: input.name || '',
          email: input.email || null,
          phone: input.phone || null,
          role: input.role || 'sales',
          avatar_url: input.avatar_url || null,
          is_active: input.is_active ?? true,
        };
        if (input.client_id) insertPayload.client_id = input.client_id;
        if (input.user_id) insertPayload.user_id = input.user_id;
        if (input.job_title) insertPayload.job_title = input.job_title;
        if (input.permissions) insertPayload.permissions = input.permissions;

        const { error } = await supabase.from('team_members').insert([insertPayload]);
        if (error) {
          logSupabaseError('useTeamMembers.createMember', error, insertPayload);
          throw error;
        }
        toast.success('Team member added');
        await refresh();
        return { success: true as const };
      } catch (err) {
        const message = supabaseErrorMessage(err, 'Failed to add member');
        toast.error(message);
        return { success: false as const, error: message };
      }
    },
    [refresh],
  );

  const updateMember = useCallback(
    async (id: string, updates: Partial<TeamMember>) => {
      try {
        const { error } = await supabase
          .from('team_members')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) {
          logSupabaseError('useTeamMembers.updateMember', error, {
            id,
            payload: { ...updates, updated_at: new Date().toISOString() },
          });
          throw error;
        }
        toast.success('Team member updated');
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
        return { success: true as const };
      } catch (err) {
        const message = supabaseErrorMessage(err, 'Failed to update member');
        toast.error(message);
        return { success: false as const, error: message };
      }
    },
    [],
  );

  const deleteMember = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from('team_members').delete().eq('id', id);
        if (error) {
          logSupabaseError('useTeamMembers.deleteMember', error, { id });
          throw error;
        }
        toast.success('Team member removed');
        setMembers((prev) => prev.filter((m) => m.id !== id));
        return { success: true as const };
      } catch (err) {
        const message = supabaseErrorMessage(err, 'Failed to remove member');
        toast.error(message);
        return { success: false as const, error: message };
      }
    },
    [],
  );

  /**
   * Promote an existing client into a team member, or update the existing
   * link if one already exists. Prevents duplicates by checking `client_id`
   * first, then a case-insensitive email match as a secondary key.
   */
  const linkClientAsMember = useCallback(
    async (
      client: Client,
      input: {
        role: TeamMember['role'];
        job_title?: string;
        is_active?: boolean;
        permissions?: TeamMember['permissions'];
      },
    ) => {
      try {
        const existingByLink = members.find((m) => m.client_id === client.id);
        const existingByEmail = !existingByLink && client.email
          ? members.find((m) => (m.email || '').toLowerCase() === client.email!.toLowerCase())
          : null;
        const existing = existingByLink || existingByEmail;

        if (existing) {
          // Update existing record (and ensure the link is set).
          const updates: Partial<TeamMember> = {
            role: input.role,
            job_title: input.job_title ?? existing.job_title,
            is_active: input.is_active ?? existing.is_active,
            permissions: input.permissions ?? existing.permissions,
            client_id: client.id,
            avatar_url: existing.avatar_url || client.avatar_url || null,
          };
          const { error } = await supabase
            .from('team_members')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (error) {
            logSupabaseError('useTeamMembers.linkClientAsMember.updateExisting', error, {
              id: existing.id,
              payload: updates,
            });
            throw error;
          }
          toast.success('Team member updated');
          await refresh();
          return { success: true as const, memberId: existing.id, mode: 'updated' as const };
        }

        const insertPayload: Record<string, unknown> = {
          name: client.full_contact_name || client.username || client.company_name || client.email || 'Team member',
          email: client.email || null,
          phone: client.phone || client.phone_number || null,
          avatar_url: client.avatar_url || null,
          role: input.role,
          job_title: input.job_title || null,
          is_active: input.is_active ?? true,
          client_id: client.id,
          permissions: input.permissions ?? {},
        };
        const { data, error } = await supabase
          .from('team_members')
          .insert([insertPayload])
          .select('id')
          .maybeSingle();
        if (error) {
          logSupabaseError('useTeamMembers.linkClientAsMember.insert', error, insertPayload);
          throw error;
        }
        toast.success('Client added as team member');
        await refresh();
        return {
          success: true as const,
          memberId: (data as { id: string } | null)?.id,
          mode: 'created' as const,
        };
      } catch (err) {
        const message = supabaseErrorMessage(err, 'Failed to link client');
        toast.error(message);
        return { success: false as const, error: message };
      }
    },
    [members, refresh],
  );

  const memberByClientId = useMemo(() => {
    const map = new Map<string, TeamMember>();
    for (const m of members) {
      if (m.client_id) map.set(m.client_id, m);
    }
    return map;
  }, [members]);

  const findByEmail = useCallback(
    (email?: string | null) => {
      if (!email) return null;
      const lower = email.toLowerCase();
      return members.find((m) => (m.email || '').toLowerCase() === lower) || null;
    },
    [members],
  );

  return {
    members,
    loading,
    refresh,
    createMember,
    updateMember,
    deleteMember,
    linkClientAsMember,
    memberByClientId,
    findByEmail,
  };
}
