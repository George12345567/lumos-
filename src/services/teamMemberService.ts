import { supabase } from '@/lib/supabaseClient';
import type { TeamMember } from '@/types/dashboard';
import { logSupabaseError, supabaseErrorMessage } from '@/services/supabaseErrorLogger';

export const getTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      logSupabaseError('teamMemberService.getTeamMembers', error, {
        table: 'team_members',
        query: 'active team members ordered by name',
      });
      throw error;
    }
    return (data as TeamMember[]) || [];
  } catch (error) {
    logSupabaseError('teamMemberService.getTeamMembers.catch', error, {
      table: 'team_members',
      query: 'active team members ordered by name',
    });
    return [];
  }
};

export const getTeamMemberById = async (id: string): Promise<TeamMember | null> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logSupabaseError('teamMemberService.getTeamMemberById', error, {
        table: 'team_members',
        query: 'team member by id',
        id,
      });
      throw error;
    }
    return data as TeamMember;
  } catch (error) {
    logSupabaseError('teamMemberService.getTeamMemberById.catch', error, {
      table: 'team_members',
      query: 'team member by id',
      id,
    });
    return null;
  }
};

export const createTeamMember = async (memberData: {
  name: string;
  role: 'admin' | 'sales' | 'designer' | 'manager';
  phone: string;
  email?: string;
  avatar_url?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const payload = {
      ...memberData,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('team_members')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logSupabaseError('teamMemberService.createTeamMember', error, payload);
      throw error;
    }

    return { success: true, id: data.id };
  } catch (error: unknown) {
    return { success: false, error: supabaseErrorMessage(error, 'team_member_create_failed') };
  }
};

export const updateTeamMember = async (
  id: string,
  updates: Partial<TeamMember>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('team_members')
      .update(payload)
      .eq('id', id);

    if (error) {
      logSupabaseError('teamMemberService.updateTeamMember', error, {
        id,
        payload,
      });
      throw error;
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: supabaseErrorMessage(error, 'team_member_update_failed') };
  }
};

export const deactivateTeamMember = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload = {
      is_active: false,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('team_members')
      .update(payload)
      .eq('id', id);

    if (error) {
      logSupabaseError('teamMemberService.deactivateTeamMember', error, {
        id,
        payload,
      });
      throw error;
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: supabaseErrorMessage(error, 'team_member_deactivate_failed') };
  }
};

export const getTeamMemberByEmail = async (email: string): Promise<TeamMember | null> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error) {
      logSupabaseError('teamMemberService.getTeamMemberByEmail', error, {
        table: 'team_members',
        query: 'active team member by email',
        email,
      });
      throw error;
    }
    return data as TeamMember;
  } catch (error) {
    logSupabaseError('teamMemberService.getTeamMemberByEmail.catch', error, {
      table: 'team_members',
      query: 'active team member by email',
      email,
    });
    return null;
  }
};

export const teamMemberService = {
  getAll: getTeamMembers,
  getById: getTeamMemberById,
  getByEmail: getTeamMemberByEmail,
  create: createTeamMember,
  update: updateTeamMember,
  deactivate: deactivateTeamMember
};

export default teamMemberService;
