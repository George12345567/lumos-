import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  useIsAuthenticated,
  useAuthLoading,
  useAuthConfigured,
  useClient,
  useProfileLoading,
  useIsTeamMember,
} from "@/context/AuthContext";
import { ROUTES } from "@/lib/constants";
import { LoadingFallback } from "@/components/shared";
import { resolveAdminAccess } from "@/services/adminAccessService";

/**
 * Build a safe internal redirect target. Only relative paths starting with "/"
 * (and not "//" which would be protocol-relative) are accepted. Anything else
 * is dropped to avoid open-redirect vulnerabilities.
 */
function buildLoginRedirect(pathname: string, search: string): string {
  // Same hardening as LogInPage.safeRedirectPath: reject protocol-relative
  // ("//...") and backslash-containing paths that some browsers normalise.
  if (
    !pathname ||
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname.includes("\\")
  ) {
    return ROUTES.CLIENT_LOGIN;
  }
  const target = `${pathname}${search || ""}`;
  return `${ROUTES.CLIENT_LOGIN}?redirectTo=${encodeURIComponent(target)}`;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const loading = useAuthLoading();
  const profileLoading = useProfileLoading();
  const client = useClient();
  const isTeamMember = useIsTeamMember();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (loading || (isAuthenticated && profileLoading && !client)) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to={buildLoginRedirect(location.pathname, location.search)} replace />;
  }

  if (
    client?.password_must_change &&
    location.pathname !== ROUTES.CHANGE_PASSWORD
  ) {
    return <Navigate to={ROUTES.CHANGE_PASSWORD} replace />;
  }

  if (isTeamMember && location.pathname === ROUTES.CLIENT_PROFILE && searchParams.get('mode') !== 'client') {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

  return <>{children}</>;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const loading = useAuthLoading();

  if (loading) {
    return <LoadingFallback />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AccessDenied() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background text-foreground px-4"
      role="alert"
      aria-live="polite"
    >
      <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center mb-5">
          <span className="text-2xl font-black text-destructive">403</span>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Access denied</h1>
        <p className="text-sm text-muted-foreground mb-6">
          You do not have permission to view the admin dashboard. If you believe this is a
          mistake, contact a Lumos administrator.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-full px-5 h-10 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}

/**
 * AdminRoute is a UX gate. It does NOT replace server-side authorization.
 * Real protection of admin data must come from Supabase RLS policies that
 * verify a server-trusted role/claim. See SUPABASE_SECURITY_SETUP.md.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const loading = useAuthLoading();
  const authConfigured = useAuthConfigured();
  const location = useLocation();
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAllowed(null);

    if (loading || !authConfigured || !isAuthenticated) {
      setCheckingAccess(false);
      return () => {
        cancelled = true;
      };
    }

    setCheckingAccess(true);
    void resolveAdminAccess()
      .then((access) => {
        if (!cancelled) setAllowed(access.allowed);
      })
      .catch(() => {
        if (!cancelled) setAllowed(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingAccess(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authConfigured, isAuthenticated, loading]);

  if (loading || checkingAccess || (isAuthenticated && allowed === null)) {
    return <LoadingFallback />;
  }

  if (!authConfigured) {
    return <AccessDenied />;
  }

  if (!isAuthenticated) {
    return <Navigate to={buildLoginRedirect(location.pathname, location.search)} replace />;
  }

  if (!allowed) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
