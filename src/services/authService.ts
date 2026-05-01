export interface LoginResult {
  success: boolean;
  error?: string;
}

export interface SignupResult {
  success: boolean;
  error?: string;
}

export interface SecurityVerifyResult {
  success: boolean;
  error?: string;
}

export interface AuthClient {
  id: string;
  username: string;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  return { success: false, error: "Auth removed" };
}

export async function signup(payload: any): Promise<SignupResult> {
  return { success: false, error: "Auth removed" };
}

export async function verifySecurity(clientId: string, answer: string): Promise<SecurityVerifyResult> {
  return { success: false, error: "Auth removed" };
}

export async function logout(): Promise<void> {}

export async function refreshProfile(): Promise<AuthClient | null> {
  return null;
}

export const authService = {
  login,
  signup,
  verifySecurity,
  logout,
  refreshProfile,
  checkIfPhoneIsRegistered: async (): Promise<boolean> => false,
};