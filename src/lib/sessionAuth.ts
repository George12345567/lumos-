interface SessionLike {
    session_token?: string;
}

const SESSION_KEY = 'lumos_client_v2';

type SupabaseStoredAuth = {
    access_token?: string;
    expires_at?: number;
};

const parseSession = (raw: string | null): SessionLike | null => {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as SessionLike;
    } catch {
        return null;
    }
};

const parseSupabaseAuth = (raw: string | null): SupabaseStoredAuth | null => {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as SupabaseStoredAuth;
    } catch {
        return null;
    }
};

const getSupabaseAccessTokenFromStorage = (): string => {
    try {
        const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (!key) return '';
        const parsed = parseSupabaseAuth(localStorage.getItem(key));
        if (!parsed?.access_token) return '';
        // If it's expired, let Supabase refresh it asynchronously elsewhere
        const expiresAt = parsed.expires_at ?? 0;
        if (expiresAt && Date.now() / 1000 >= expiresAt) return '';
        return parsed.access_token;
    } catch {
        return '';
    }
};

export const getSessionToken = (): string => {
    const local = parseSession(localStorage.getItem(SESSION_KEY));
    if (local?.session_token) return local.session_token;

    const session = parseSession(sessionStorage.getItem(SESSION_KEY));
    if (session?.session_token) return session.session_token;

    const supabaseAccessToken = getSupabaseAccessTokenFromStorage();
    if (supabaseAccessToken) return supabaseAccessToken;

    return '';
};
