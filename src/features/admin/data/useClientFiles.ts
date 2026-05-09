import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export interface AdminClientFile {
  id: string;
  client_id: string;
  file_name: string;
  file_url: string;
  /** Optional, may not exist on older schemas. */
  file_type?: string | null;
  file_size?: number | null;
  category?: string | null;
  note?: string | null;
  storage_path?: string | null;
  uploaded_by?: string | null;
  uploaded_by_type?: 'admin' | 'team' | 'client' | string | null;
  asset_type?: string | null;
  identity_category?: string | null;
  is_identity_asset?: boolean | null;
  sort_order?: number | null;
  is_downloadable?: boolean | null;
  visibility?: 'client' | 'admin_only' | string | null;
  client_visible?: boolean | null;
  placement_project_hub?: boolean | null;
  placement_action_center?: boolean | null;
  placement_files_library?: boolean | null;
  placement_brand_kit?: boolean | null;
  /** Confirmed column. */
  created_at?: string | null;
  /** Optional/legacy column on older schemas. */
  uploaded_at?: string | null;
}

const BUCKET = 'client-assets';

function safeName(name: string): string {
  return name.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'file';
}

/** Best timestamp for display/sort with both schema variants present. */
export function fileTimestamp(f: Pick<AdminClientFile, 'created_at' | 'uploaded_at'>): string | null {
  return f.created_at || f.uploaded_at || null;
}

/** Derive a display type from file_type, file_name, or file_url. */
export function fileDisplayType(f: Pick<AdminClientFile, 'file_type' | 'file_name' | 'file_url'>): string {
  if (f.file_type) return f.file_type;
  const source = (f.file_name || f.file_url || '').toLowerCase();
  const ext = source.split('?')[0].split('#')[0].split('.').pop() || '';
  if (!ext || ext.length > 5) return '';
  return ext;
}

export function isImageFile(f: Pick<AdminClientFile, 'file_type' | 'file_name' | 'file_url'>): boolean {
  if (f.file_type) return f.file_type.startsWith('image/');
  const ext = fileDisplayType(f).toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp'].includes(ext);
}

interface UploadInput {
  clientId: string;
  file: File;
  category?: string;
  note?: string;
}

export function useClientFiles() {
  const [files, setFiles] = useState<AdminClientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Prevent the realtime subscription from re-firing refresh once an
  // initial fetch has failed — that would spam the network with 400s.
  const failedRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Order by created_at (confirmed). Sort client-side as a fallback
      // for legacy rows where created_at might be null and uploaded_at is
      // populated instead.
      const { data, error: queryError } = await supabase
        .from('client_assets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (queryError) throw queryError;
      const sorted = ((data as AdminClientFile[]) || []).slice().sort((a, b) => {
        const ad = fileTimestamp(a) || '';
        const bd = fileTimestamp(b) || '';
        return bd.localeCompare(ad);
      });
      setFiles(sorted);
      failedRef.current = false;
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Failed to load files';
      console.error('useClientFiles refresh failed:', m);
      setFiles([]);
      setError(m);
      failedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    let cancelled = false;
    const channel = supabase
      .channel('admin-client-assets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_assets' }, () => {
        // Stop auto-refresh once we know the initial fetch failed: the user
        // must hit the manual Refresh to retry. This prevents 400-spam loops.
        if (cancelled || failedRef.current) return;
        void refresh();
      })
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const upload = useCallback(
    async ({ clientId, file, category = 'general', note }: UploadInput) => {
      const ts = Date.now();
      const path = `${clientId}/files/${category}/${ts}-${safeName(file.name)}`;
      try {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;

        const { data: signed, error: signedError } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signedError) throw signedError;

        const { data: sessionData } = await supabase.auth.getSession();
        const uploaderId = sessionData?.session?.user?.id ?? null;

        // Build the insert payload from confirmed columns only. file_type is
        // only sent when the schema is known to have it; if the row's table
        // lacks file_type, omitting the field is safe.
        const insertPayload: Record<string, unknown> = {
          client_id: clientId,
          file_name: file.name,
          file_url: signed?.signedUrl || '',
          file_size: file.size,
          category,
          note: note || null,
          storage_path: path,
          uploaded_by: uploaderId,
          uploaded_by_type: 'admin',
        };
        if (file.type) {
          insertPayload.file_type = file.type;
        }

        const { error: insertError } = await supabase.from('client_assets').insert([insertPayload]);
        if (insertError) {
          // If the insert failed because file_type doesn't exist on this
          // schema, retry without it.
          const msg = insertError.message || '';
          if (/file_type/i.test(msg)) {
            const { file_type: _ignored, ...withoutType } = insertPayload;
            void _ignored;
            const { error: retryError } = await supabase.from('client_assets').insert([withoutType]);
            if (retryError) throw retryError;
          } else {
            throw insertError;
          }
        }

        toast.success('File uploaded');
        await refresh();
        return { success: true as const, signedUrl: signed?.signedUrl };
      } catch (err) {
        const m = err instanceof Error ? err.message : 'Upload failed';
        toast.error(m);
        return { success: false as const, error: m };
      }
    },
    [refresh],
  );

  const remove = useCallback(async (file: AdminClientFile) => {
    try {
      if (file.storage_path) {
        await supabase.storage.from(BUCKET).remove([file.storage_path]);
      }
      const { error } = await supabase.from('client_assets').delete().eq('id', file.id);
      if (error) throw error;
      toast.success('File removed');
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Failed to remove';
      toast.error(m);
    }
  }, []);

  const getSignedUrl = useCallback(async (path: string) => {
    const { data, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 5);
    if (signedError) {
      toast.error('Could not generate download URL');
      return null;
    }
    return data?.signedUrl ?? null;
  }, []);

  const byClient = useMemo(() => {
    const map = new Map<string, AdminClientFile[]>();
    for (const f of files) {
      const arr = map.get(f.client_id) ?? [];
      arr.push(f);
      map.set(f.client_id, arr);
    }
    return map;
  }, [files]);

  return { files, byClient, loading, error, refresh, upload, remove, getSignedUrl };
}
