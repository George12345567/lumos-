import { supabase } from '@/lib/supabaseClient';
import type { TeamMember } from '@/types/dashboard';

export const getTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as TeamMember[]) || [];
  } catch (error) {
    console.error('Error getting team members:', error);
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

    if (error) throw error;
    return data as TeamMember;
  } catch (error) {
    console.error('Error getting team member:', error);
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
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        ...memberData,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, id: data.id };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating team member:', error);
    return { success: false, error: errorMessage };
  }
};

export const updateTeamMember = async (
  id: string,
  updates: Partial<TeamMember>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('team_members')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating team member:', error);
    return { success: false, error: errorMessage };
  }
};

export const deactivateTeamMember = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('team_members')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deactivating team member:', error);
    return { success: false, error: errorMessage };
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

    if (error) throw error;
    return data as TeamMember;
  } catch (error) {
    console.error('Error getting team member by email:', error);
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