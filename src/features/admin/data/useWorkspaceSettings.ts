import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export interface WorkspaceSettings {
  id: number;
  agency_name: string;
  default_currency: string;
  timezone: string;
  default_language: 'en' | 'ar';
  date_format: string;
  default_dashboard_view: string;
  notify_email_on_request: boolean;
  notify_email_on_message: boolean;
  notify_email_on_file: boolean;
  notify_email_on_admin_activity: boolean;
  default_request_status: string;
  default_priority: string;
  follow_up_days: number;
  allow_client_uploads: boolean;
  allow_client_messages: boolean;
  require_profile_completion: boolean;
  default_profile_visibility: string;
  allowed_file_types: string;
  max_upload_mb: number;
  default_file_categories: string[];
  updated_at?: string | null;
  updated_by?: string | null;
}

const DEFAULTS: WorkspaceSettings = {
  id: 1,
  agency_name: 'Lumos Studio',
  default_currency: 'EGP',
  timezone: 'Africa/Cairo',
  default_language: 'en',
  date_format: 'YYYY-MM-DD',
  default_dashboard_view: 'overview',
  notify_email_on_request: true,
  notify_email_on_message: true,
  notify_email_on_file: false,
  notify_email_on_admin_activity: false,
  default_request_status: 'new',
  default_priority: 'medium',
  follow_up_days: 3,
  allow_client_uploads: true,
  allow_client_messages: true,
  require_profile_completion: false,
  default_profile_visibility: 'private',
  allowed_file_types: 'image/*,application/pdf,text/*',
  max_upload_mb: 25,
  default_file_categories: ['brand', 'designs', 'contracts', 'invoices', 'general'],
};

export function useWorkspaceSettings() {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) {
        // Table doesn't exist yet — surface a UX-friendly empty state instead of crashing.
        if (/relation .* does not exist/i.test(error.message)) {
          setMissingTable(true);
          setSettings(DEFAULTS);
          return;
        }
        throw error;
      }
      const merged = { ...DEFAULTS, ...(data || {}) };
      // Normalize jsonb default_file_categories to a string array.
      if (data?.default_file_categories && !Array.isArray(data.default_file_categories)) {
        merged.default_file_categories = DEFAULTS.default_file_categories;
      }
      setSettings(merged);
      setMissingTable(false);
    } catch (err) {
      console.error('useWorkspaceSettings refresh failed:', err);
      setSettings(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (updates: Partial<WorkspaceSettings>) => {
    if (missingTable) {
      toast.error('workspace_settings table is missing. Apply the migration first.');
      return { success: false as const };
    }
    try {
      const { error } = await supabase
        .from('workspace_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
      toast.success('Settings saved');
      setSettings((prev) => (prev ? { ...prev, ...updates } : prev));
      return { success: true as const };
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Failed to save';
      toast.error(m);
      return { success: false as const, error: m };
    }
  }, [missingTable]);

  return { settings, loading, missingTable, refresh, save };
}
