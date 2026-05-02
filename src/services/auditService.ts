import { supabase } from '@/lib/supabaseClient';
import type { AuditLog } from '@/types/dashboard';

interface LogAuditChangeParams {
  entityType: 'pricing_request' | 'client' | 'discount_code' | 'team_member' | 'order';
  entityId: string;
  changedBy?: string | null;
  changedByType?: 'team_member' | 'client' | 'system';
  action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'notes_added' | 'converted' | 'reviewed';
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  changeSummary: string;
  changeSummaryAr?: string;
  locationUrl?: string;
}

export const logAuditChange = async (params: LogAuditChangeParams): Promise<void> => {
  try {
    const auditData = {
      entity_type: params.entityType,
      entity_id: params.entityId,
      changed_by: params.changedBy || null,
      changed_by_type: params.changedByType || 'system',
      action: params.action,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      change_summary: params.changeSummary,
      change_summary_ar: params.changeSummaryAr || params.changeSummary,
      location_url: params.locationUrl || (typeof window !== 'undefined' ? window.location.href : null),
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert(auditData);

    if (error) {
      console.warn('Failed to log audit change (table may not exist):', error.message);
    }
  } catch (error) {
    console.warn('Failed to log audit change:', error);
  }
};

export const getAuditLogs = async (
  entityType?: string,
  entityId?: string,
  limit: number = 50
): Promise<AuditLog[]> => {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (entityType && entityId) {
      query = query.eq('entity_type', entityType).eq('entity_id', entityId);
    } else if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data as AuditLog[]) || [];
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return [];
  }
};

export const getUserAuditLogs = async (
  userId: string,
  limit: number = 20
): Promise<AuditLog[]> => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('changed_by', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as AuditLog[]) || [];
  } catch (error) {
    console.error('Error getting user audit logs:', error);
    return [];
  }
};