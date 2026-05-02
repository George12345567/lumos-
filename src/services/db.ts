import { supabase } from '@/lib/supabaseClient';

export async function saveContact(data: {
  name: string;
  phone: string;
  message?: string;
  business_name?: string;
  industry?: string;
  service_needed?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const contactData = {
      name: data.name,
      phone: data.phone.replace(/\D/g, ''), // Clean phone
      email: data.business_name?.includes('@') ? data.business_name : null,
      business_name: data.business_name?.includes('@') ? undefined : data.business_name,
      industry: data.industry,
      service_needed: data.service_needed,
      message: data.message,
      status: 'new',
      source: 'contact_form',
      location_url: typeof window !== 'undefined' ? window.location.href : null,
      auto_collected_data: {
        timestamp: new Date().toISOString(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      },
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('contacts')
      .insert(contactData);

    if (error) {
      console.error('Supabase contact save error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Contact save error:', error);
    return { success: false, error: 'Failed to save contact' };
  }
}

export async function getContacts(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return [];
  }
}

export async function updateContactStatus(
  id: string,
  status: 'new' | 'read' | 'contacted' | 'resolved'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('contacts')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

export async function deleteContact(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}