import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { profileService, type ProfileData } from '@/services/profileService';
import { useAuth } from '@/context/AuthContext';
import type { SaveState } from '../types';

const DEBOUNCE_MS = 600;

interface Options {
  onSaved?: () => void;
}

export function useProfileMutation({ onSaved }: Options = {}) {
  const { client, refreshProfile } = useAuth();
  const [state, setState] = useState<SaveState>('idle');
  const pending = useRef<Partial<ProfileData>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  const flush = useCallback(async (): Promise<boolean> => {
    if (!client?.id) return false;
    const updates = pending.current;
    if (Object.keys(updates).length === 0) return true;
    if (inFlight.current) return false;

    pending.current = {};
    inFlight.current = true;
    setState('saving');
    try {
      const ok = await profileService.updateProfile(client.id, updates);
      if (!ok) throw new Error('save_failed');
      setState('saved');
      onSaved?.();
      void refreshProfile();
      return true;
    } catch (err) {
      console.error('[useProfileMutation] save error:', err);
      setState('error');
      toast.error('Could not save changes. Please try again.');
      // restore unsaved updates so user can retry
      pending.current = { ...updates, ...pending.current };
      return false;
    } finally {
      inFlight.current = false;
    }
  }, [client?.id, onSaved, refreshProfile]);

  const queue = useCallback(<K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    pending.current = { ...pending.current, [field]: value };
    setState('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush();
    }, DEBOUNCE_MS);
  }, [flush]);

  const saveNow = useCallback(async (patch?: Partial<ProfileData>): Promise<boolean> => {
    if (patch) pending.current = { ...pending.current, ...patch };
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    return flush();
  }, [flush]);

  // Reset 'saved' chip after a moment
  useEffect(() => {
    if (state !== 'saved') return;
    const id = setTimeout(() => setState('idle'), 1800);
    return () => clearTimeout(id);
  }, [state]);

  // Flush on unload to avoid losing the last edit
  useEffect(() => {
    const handler = () => {
      if (Object.keys(pending.current).length > 0) {
        void flush();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [flush]);

  return { state, queue, saveNow, flush };
}
