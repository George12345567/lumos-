/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authService, type AuthClient, type SignupResult } from "@/services/authService";
import { isSupabaseConfigured, isAdminEmail } from "@/config/auth";
import { supabase } from "@/lib/supabaseClient";
import type { TeamMember } from "@/types/dashboard";

/**
 * Auth state.
 *
 * `isAuthenticated` reflects the Supabase session — a transient profile fetch
 * failure must NOT log the user out. `profileError` surfaces such failures
 * separately so the profile UI can show a friendly empty/error state while
 * the session remains valid.
 *
 * `authConfigured` is false when env vars are missing; UI should disable
 * submits and show a config-error message instead of pretending auth works.
 */
interface AuthStateContextType {
  client: AuthClient | null;
  sessionEmail: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeamMember: boolean;
  teamMemberId: string | null;
  teamRole: string | null;
  teamJobTitle: string | null;
  teamPermissions: Record<string, unknown>;
  linkedClientId: string | null;
  loading: boolean;
  profileLoading: boolean;
  profileError: string | null;
  authConfigured: boolean;
  /** @deprecated use profileError */
  error: string | null;
}

interface AuthActionsContextType {
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (payload: Record<string, unknown>) => Promise<SignupResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

type AuthContextType = AuthStateContextType & AuthActionsContextType;

const AuthStateContext = createContext<AuthStateContextType | undefined>(undefined);
const AuthActionsContext = createContext<AuthActionsContextType | undefined>(undefined);
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const NULL_ACTION: AuthActionsContextType = {
  login: async () => ({ success: false, error: "Auth context unavailable" }),
  signup: async () => ({ success: false, error: "Auth context unavailable" }),
  logout: async () => {},
  refreshProfile: async () => {},
};

const NULL_STATE: AuthStateContextType = {
  client: null,
  sessionEmail: null,
  isAuthenticated: false,
  isAdmin: false,
  isTeamMember: false,
  teamMemberId: null,
  teamRole: null,
  teamJobTitle: null,
  teamPermissions: {},
  linkedClientId: null,
  loading: false,
  profileLoading: false,
  profileError: null,
  authConfigured: false,
  error: null,
};

const MAX_PROFILE_RETRIES = 3;
const PROFILE_RETRY_DELAY_MS = 800;
const PROFILE_SYNC_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function resolveActiveTeamMember(userId: string, email: string | null): Promise<TeamMember | null> {
  try {
    const attempts: Array<{ col: string; val: string }> = [{ col: 'user_id', val: userId }];
    if (email) attempts.push({ col: 'email', val: email });

    for (const { col, val } of attempts) {
      const q = supabase.from('team_members').select('*').eq('is_active', true);
      const { data, error } = await (col === 'email' ? q.ilike(col, val) : q.eq(col, val)).maybeSingle();
      if (!error && data) return data as TeamMember;
    }
  } catch {
    // ignore
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [client, setClient] = useState<AuthClient | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const mountedRef = useRef(true);
  const authConfigured = isSupabaseConfigured();

  const isAuthenticated = hasSession;
  const isAdmin = !!(sessionEmail && isAdminEmail(sessionEmail));

  const resolveProfile = useCallback(async (): Promise<AuthClient | null> => {
    return await withTimeout(authService.getClientProfile(), PROFILE_SYNC_TIMEOUT_MS, "profile_sync_timeout");
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!mountedRef.current) return;
    setProfileLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const [profile, tm] = await Promise.all([
        resolveProfile(),
        user ? resolveActiveTeamMember(user.id, user.email?.trim().toLowerCase() ?? null) : Promise.resolve(null),
      ]);
      if (!mountedRef.current) return;
      setClient(profile);
      setTeamMember(tm);
      setProfileError(profile ? null : "profile_fetch_failed");
    } catch {
      if (!mountedRef.current) return;
      setProfileError("profile_fetch_failed");
    } finally {
      if (mountedRef.current) setProfileLoading(false);
    }
  }, [resolveProfile]);

  const refreshProfileWithRetry = useCallback(async (retries = MAX_PROFILE_RETRIES): Promise<void> => {
    if (!mountedRef.current) return;
    setProfileLoading(true);
    try {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const [profile, tm] = await Promise.all([
            resolveProfile(),
            user ? resolveActiveTeamMember(user.id, user.email?.trim().toLowerCase() ?? null) : Promise.resolve(null),
          ]);
          if (!mountedRef.current) return;
          setClient(profile);
          setTeamMember(tm);
          setProfileError(profile ? null : "profile_fetch_failed");
          if (profile) return;
        } catch {
          if (attempt < retries && mountedRef.current) {
            await new Promise(r => setTimeout(r, PROFILE_RETRY_DELAY_MS * attempt));
            continue;
          }
          if (mountedRef.current) {
            setProfileError("profile_fetch_failed");
          }
        }
      }
    } finally {
      if (mountedRef.current) setProfileLoading(false);
    }
  }, [resolveProfile]);

  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      try {
        const session = await withTimeout(
          authService.getSession(),
          PROFILE_SYNC_TIMEOUT_MS,
          "session_check_timeout",
        );
        if (!mountedRef.current) return;
        if (session) {
          setHasSession(true);
          setSessionEmail((session.user?.email ?? null) || null);
          setProfileLoading(true);
          // Profile fetch happens in parallel; failure does not affect auth state.
          void refreshProfileWithRetry();
        } else {
          setHasSession(false);
          setSessionEmail(null);
          setClient(null);
          setProfileError(null);
        }
      } catch {
        if (mountedRef.current) {
          setHasSession(false);
          setSessionEmail(null);
          setClient(null);
          setProfileError(null);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = authService.onAuthStateChange(async (_event, session) => {
      if (!mountedRef.current) return;
      if (session) {
        setHasSession(true);
        setSessionEmail((session.user?.email ?? null) || null);
        setProfileLoading(true);
        void refreshProfileWithRetry();
      } else {
        setHasSession(false);
        setSessionEmail(null);
        setClient(null);
        setTeamMember(null);
        setProfileError(null);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [refreshProfileWithRetry]);

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    const result = await authService.login(usernameOrEmail, password);
    // Auth state listener will pick up the new session and refresh the profile.
    return result;
  }, []);

  const signup = useCallback(async (payload: Record<string, unknown>) => {
    const result = await authService.signup(payload);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    if (mountedRef.current) {
      setHasSession(false);
      setSessionEmail(null);
      setClient(null);
      setTeamMember(null);
      setProfileError(null);
      setLoading(false);
    }
    // Clear cached app data so the next user does not see leaked state.
    try {
      queryClient.clear();
    } catch {
      // No-op if React Query isn't initialised yet.
    }
  }, [queryClient]);

  const stateValue = useMemo<AuthStateContextType>(() => ({
    client,
    sessionEmail,
    isAuthenticated,
    isAdmin,
    isTeamMember: Boolean(teamMember?.is_active),
    teamMemberId: teamMember?.id ?? null,
    teamRole: (teamMember?.role as string) ?? null,
    teamJobTitle: teamMember?.job_title ?? null,
    teamPermissions: (teamMember?.permissions as Record<string, unknown>) ?? {},
    linkedClientId: teamMember?.client_id ?? null,
    loading,
    profileLoading,
    profileError,
    authConfigured,
    error: profileError,
  }), [client, sessionEmail, isAuthenticated, isAdmin, teamMember, loading, profileLoading, profileError, authConfigured]);

  const actionsValue = useMemo<AuthActionsContextType>(() => ({
    login,
    signup,
    logout,
    refreshProfile,
  }), [login, signup, logout, refreshProfile]);

  const compositeValue = useMemo<AuthContextType>(() => ({
    ...stateValue,
    ...actionsValue,
  }), [stateValue, actionsValue]);

  return (
    <AuthStateContext.Provider value={stateValue}>
      <AuthActionsContext.Provider value={actionsValue}>
        <AuthContext.Provider value={compositeValue}>
          {children}
        </AuthContext.Provider>
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return {
      ...NULL_STATE,
      ...NULL_ACTION,
    };
  }
  return context;
}

export function useAuthState() {
  const context = useContext(AuthStateContext);
  return context ?? NULL_STATE;
}

export function useAuthActions() {
  const context = useContext(AuthActionsContext);
  return context ?? NULL_ACTION;
}

export function useIsAuthenticated() {
  const { isAuthenticated } = useAuthState();
  return isAuthenticated;
}

export function useIsAdmin() {
  const { isAdmin } = useAuthState();
  return isAdmin;
}

export function useAuthLoading() {
  const { loading } = useAuthState();
  return loading;
}

export function useClient() {
  const { client } = useAuthState();
  return client;
}

export function useAuthError() {
  const { profileError } = useAuthState();
  return profileError;
}

export function useAuthConfigured() {
  const { authConfigured } = useAuthState();
  return authConfigured;
}

export function useSessionEmail() {
  const { sessionEmail } = useAuthState();
  return sessionEmail;
}

export function useProfileLoading() {
  const { profileLoading } = useAuthState();
  return profileLoading;
}

export function useProfileError() {
  const { profileError } = useAuthState();
  return profileError;
}

export function useIsTeamMember() {
  const { isTeamMember } = useAuthState();
  return isTeamMember;
}

export function useTeamRole() {
  const { teamRole } = useAuthState();
  return teamRole;
}

export function useTeamMemberId() {
  const { teamMemberId } = useAuthState();
  return teamMemberId;
}

export function useTeamPermissions() {
  const { teamPermissions } = useAuthState();
  return teamPermissions;
}
