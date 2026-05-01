export interface ProfileData {
  id: string;
  username: string;
  email?: string;
  company_name?: string;
}

export interface SocialLinks {
  website?: string;
  instagram?: string;
  facebook?: string;
}

export const profileService = {
  getProfile: async (): Promise<ProfileData | null> => null,
  updateProfile: async (data: Partial<ProfileData>): Promise<{ success: boolean }> => ({ success: false }),
  uploadAvatar: async (file: File): Promise<{ url: string } | null> => null,
};