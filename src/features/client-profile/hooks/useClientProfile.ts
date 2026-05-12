import { useCallback, useEffect, useState } from 'react';
import { profileService, type ProfileData } from '@/services/profileService';
import { useClient, useAuthActions } from '@/context/AuthContext';

const EMPTY_PROFILE: ProfileData = {
  avatar_style: '',
  avatar_seed: '',
  avatar_config: { style: 'monogram', seed: '', colors: [] },
  avatar_url: '',
  display_name: '',
  bio: '',
  tagline: '',
  business_tagline: '',
  full_contact_name: '',
  website: '',
  location: '',
  timezone: '',
  social_links: {},
  services_needed: [],
  budget_range: '',
  timeline: '',
  referral_source: '',
  project_summary: '',
  brand_feel: '',
  brand_colors: [],
  logo_url: '',
  cover_gradient: '',
  theme_accent: '',
  profile_visibility: 'private',
  package_details: null,
};

const profileCache = new Map<string, ProfileData>();

export function useClientProfile() {
  const client = useClient();
  const { refreshProfile } = useAuthActions();
  const cachedProfile = client?.id ? profileCache.get(client.id) : undefined;
  const [profile, setProfile] = useState<ProfileData | null>(() => cachedProfile ?? null);
  const [loading, setLoading] = useState(() => Boolean(client?.id && !cachedProfile));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client?.id) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(!profileCache.has(client.id));
    setError(null);
    try {
      const data = await profileService.getProfile(client.id);
      const nextProfile = { ...EMPTY_PROFILE, ...(data ?? {}) };
      profileCache.set(client.id, nextProfile);
      setProfile(nextProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      setProfile({ ...EMPTY_PROFILE });
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = useCallback(<K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [field]: value };
      if (client?.id) profileCache.set(client.id, next);
      return next;
    });
  }, [client?.id]);

  const reload = useCallback(async () => {
    await load();
    await refreshProfile();
  }, [load, refreshProfile]);

  return { client, profile, setProfile, setField, loading, error, reload };
}

export { EMPTY_PROFILE };
