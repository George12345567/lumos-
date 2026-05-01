import type { ProfileData } from '@/services/profileService';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface ProfileSnapshot {
  client: {
    id: string;
    username: string;
    email?: string;
    phone_number?: string;
    company_name?: string;
    package_name?: string;
    progress?: number;
    status?: string;
    next_steps?: string;
    role?: 'admin' | 'client';
  };
  profile: ProfileData;
}

export type ProfileField = keyof ProfileData;

export type ProfileUpdater = <K extends ProfileField>(field: K, value: ProfileData[K]) => void;
