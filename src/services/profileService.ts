import { supabase } from '@/lib/supabaseClient';

export interface ProfileData {
  id: string;
  username: string;
  email?: string;
  company_name?: string;
  phone_number?: string;
  display_name?: string;
  bio?: string;
  tagline?: string;
  website?: string;
  location?: string;
  timezone?: string;
  avatar_style?: string;
  avatar_seed?: string;
  avatar_config?: Record<string, unknown>;
  avatar_url?: string;
  brand_colors?: string[];
  logo_url?: string;
  cover_url?: string;
  cover_gradient?: string;
  theme_accent?: string;
  profile_visibility?: string;
  social_links?: Record<string, string>;
  industry?: string;
  role?: string;
  is_verified?: boolean;
  package_name?: string;
  progress?: number;
  status?: string;
  next_steps?: string;
}

export interface SocialLinks {
  website?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  behance?: string;
  dribbble?: string;
  github?: string;
}

export const profileService = {
  getProfile: async (clientId: string): Promise<ProfileData | null> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (error || !data) return null;
      return data as ProfileData;
    } catch {
      return null;
    }
  },

  updateProfile: async (clientId: string, data: Partial<ProfileData>): Promise<{ success: boolean }> => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', clientId);
      return { success: !error };
    } catch {
      return { success: false };
    }
  },

  /**
   * Upload an avatar to the private `client-assets` bucket.
   *
   * Path layout matches the storage RLS policy installed by
   * `supabase/migrations/20260507120300_storage_rls_client_assets.sql`:
   *
   *   <auth.uid()>/avatars/<safe-file-name>
   *
   * The first folder segment MUST equal the caller's auth uid; otherwise the
   * upload is rejected by RLS. The bucket is private, so we return both the
   * stored object path (to persist on the row) and a short-lived signed URL
   * for immediate display.
   */
  uploadAvatar: async (
    file: File,
    clientId: string,
  ): Promise<{ path: string; url: string } | null> => {
    try {
      const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${clientId}/avatars/${Date.now()}-${safeBase}`;

      const { error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (uploadError) return null;

      const { data: signed, error: signError } = await supabase.storage
        .from('client-assets')
        .createSignedUrl(path, 60 * 60); // 1 hour
      if (signError || !signed?.signedUrl) return null;

      return { path, url: signed.signedUrl };
    } catch {
      return null;
    }
  },

  /**
   * Resolve a fresh signed URL for a previously-uploaded avatar.
   *
   * Returns `null` (not an error) when:
   *   - `path` is empty/missing
   *   - the path is an absolute http(s) URL (legacy public-bucket layout —
   *     the caller should use it directly)
   *   - the bucket / file is unreachable (e.g. file removed, RLS blocks it)
   *
   * Callers should treat `null` as "no avatar" and fall back to initials.
   */
  getAvatarUrl: async (path?: string | null): Promise<string | null> => {
    const trimmed = (path ?? '').trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    try {
      const { data, error } = await supabase.storage
        .from('client-assets')
        .createSignedUrl(trimmed, 60 * 60);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  },

  getAvatarPresets: async (): Promise<unknown[]> => {
    return [
      { id: 'preset-1', style: 'photo', preview_url: '/avatars/avatar-1.jpg' },
      { id: 'preset-2', style: 'photo', preview_url: '/avatars/avatar-2.jpg' },
      { id: 'preset-3', style: 'photo', preview_url: '/avatars/avatar-3.jpg' },
      { id: 'preset-4', style: 'photo', preview_url: '/avatars/avatar-4.jpg' },
      { id: 'preset-5', style: 'photo', preview_url: '/avatars/avatar-5.jpg' },
      { id: 'preset-6', style: 'photo', preview_url: '/avatars/avatar-6.jpg' },
      { id: 'preset-7', style: 'photo', preview_url: '/avatars/avatar-7.jpg' },
      { id: 'preset-8', style: 'photo', preview_url: '/avatars/avatar-8.jpg' },
      { id: 'preset-9', style: 'photo', preview_url: '/avatars/avatar-9.jpg' },
    ];
  },
};