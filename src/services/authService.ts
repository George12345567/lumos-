import { supabase } from "@/lib/supabaseClient";
import { isSupabaseConfigured } from "@/config/auth";

// ─── Types ──────────────────────────────────────────────────────────────

type JsonRecord = Record<string, unknown>;

interface ClientSignupProfile {
  business_tagline?: string;
  full_contact_name?: string;
  website?: string;
  brand_feel?: string;
  security_question?: string;
  // NOTE: plaintext security_answer is intentionally NOT part of the profile.
  // We never persist the plaintext. See SUPABASE_SECURITY_SETUP.md.
  security_answer_hash?: string;
  auth_password_pending?: boolean;
  signup_completed_at?: string;
  signup_source?: string;
  industry?: string;
  services_needed?: unknown[];
  budget_range?: string;
  timeline?: string;
  referral_source?: string;
  project_summary?: string;
}

interface ClientPackageDetails extends JsonRecord {
  signup_profile?: ClientSignupProfile;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  session?: { accessToken: string; refreshToken: string } | null;
  needsConfirmation?: boolean;
}

export interface SignupResult {
  success: boolean;
  error?: string;
  needsConfirmation?: boolean;
}

export interface SecurityVerifyResult {
  success: boolean;
  error?: string;
  hasSecurityQuestion?: boolean;
  question?: string;
}

export interface AuthClient {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  company_name?: string;
  phone?: string;
  phone_number?: string;
  industry?: string;
  role?: string;
  is_verified?: boolean;
  cover_url?: string;
  cover_gradient?: string;
  package_name?: string;
  progress?: number;
  status?: string;
  theme_accent?: string;
  brand_colors?: string[];
  next_steps?: string;
  security_question?: string;
  business_tagline?: string;
  full_contact_name?: string;
  website?: string;
  brand_feel?: string;
  auth_password_pending?: boolean;
  signup_completed_at?: string;
  signup_source?: string;
  package_details?: ClientPackageDetails | null;
}

export interface ForgotPasswordCheckResult {
  hasSecurityQuestion: boolean;
  securityQuestion?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  error?: string;
}

// ─── Login ──────────────────────────────────────────────────────────────

const CLIENT_PROFILE_SELECT =
  "id, username, email, avatar_url, company_name, phone, package_name, status, progress, next_steps, package_details, subscription_config, admin_notes, active_offer, active_offer_link, logo_url, cover_gradient, theme_accent, brand_colors, created_at, updated_at";

const CLIENT_LOOKUP_SELECT = "email";
const LOGIN_USERNAME_RE = /^[a-z][a-z0-9_-]{2,19}$/;
const LOGIN_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBrandColors(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const colors = value.map((item) => asString(item)).filter(Boolean);
    return colors.length ? colors : undefined;
  }

  if (typeof value === "string") {
    const colors = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return colors.length ? colors : undefined;
  }

  return undefined;
}

function getSignupProfile(source: unknown): ClientSignupProfile {
  if (!isRecord(source)) return {};

  const candidate: JsonRecord = isRecord(source.signup_profile)
    ? (source.signup_profile as JsonRecord)
    : source;

  return {
    business_tagline: asString(candidate.business_tagline) || undefined,
    full_contact_name: asString(candidate.full_contact_name) || undefined,
    website: asString(candidate.website) || undefined,
    brand_feel: asString(candidate.brand_feel) || undefined,
    security_question: asString(candidate.security_question) || undefined,
    security_answer_hash: asString(candidate.security_answer_hash) || undefined,
    auth_password_pending:
      typeof candidate.auth_password_pending === "boolean"
        ? candidate.auth_password_pending
        : undefined,
    signup_completed_at: asString(candidate.signup_completed_at) || undefined,
    signup_source: asString(candidate.signup_source) || undefined,
  };
}

/**
 * Strip any legacy plaintext security_answer that may exist in an existing
 * package_details payload before re-saving it. We never want to persist or
 * round-trip the plaintext answer.
 */
function stripLegacyPlaintextSecurityAnswer(details: ClientPackageDetails): ClientPackageDetails {
  const next: ClientPackageDetails = { ...details };
  const profile = isRecord(next.signup_profile)
    ? ({ ...(next.signup_profile as JsonRecord) } as ClientSignupProfile & { security_answer?: unknown })
    : undefined;
  if (profile && "security_answer" in profile) {
    delete (profile as Record<string, unknown>).security_answer;
    next.signup_profile = profile;
  }
  if ("security_answer" in next) {
    delete (next as Record<string, unknown>).security_answer;
  }
  return next;
}

function buildPackageDetails(
  payload: Record<string, unknown>,
  authPasswordPending: boolean,
  securityAnswerHash?: string,
): ClientPackageDetails {
  const rawExisting = isRecord(payload.package_details)
    ? (payload.package_details as ClientPackageDetails)
    : {};
  const existing = stripLegacyPlaintextSecurityAnswer(rawExisting);

  const signupProfile: ClientSignupProfile = {
    ...getSignupProfile(existing),
    business_tagline: asString(payload.businessTagline) || undefined,
    full_contact_name: asString(payload.contactName) || undefined,
    website: asString(payload.website) || undefined,
    brand_feel: asString(payload.brandIdentity) || undefined,
    security_question: asString(payload.securityQuestion) || undefined,
    security_answer_hash: securityAnswerHash,
    auth_password_pending: authPasswordPending,
    signup_completed_at: asString(payload.signupCompletedAt) || undefined,
    signup_source: asString(payload.signupSource) || undefined,
    industry: asString(payload.industry) || undefined,
    services_needed: Array.isArray(payload.servicesNeeded) ? payload.servicesNeeded : undefined,
    budget_range: asString(payload.budgetRange) || undefined,
    timeline: asString(payload.timeline) || undefined,
    referral_source: asString(payload.referralSource) || undefined,
    project_summary: asString(payload.projectSummary) || undefined,
  };

  return {
    ...existing,
    signup_profile: signupProfile,
  };
}

function isValidLoginEmail(value: string): boolean {
  return LOGIN_EMAIL_RE.test(value.trim());
}

function isValidLoginUsername(value: string): boolean {
  return LOGIN_USERNAME_RE.test(value.trim().toLowerCase());
}

export async function resolveAuthEmail(usernameOrEmail: string): Promise<string | null> {
  const input = usernameOrEmail.trim();
  if (!input) return null;

  if (input.includes("@")) {
    const email = input.toLowerCase();
    return isValidLoginEmail(email) ? email : null;
  }

  if (!isValidLoginUsername(input)) return null;

  try {
    const { data } = await supabase
      .from("clients")
      .select(CLIENT_LOOKUP_SELECT)
      .eq("username", input)
      .maybeSingle();

    const email = typeof data?.email === "string" ? data.email.trim() : "";
    if (email && isValidLoginEmail(email)) return email.toLowerCase();
  } catch {
    // Fall back to the legacy username@lumos.app assumption below.
  }

  const fallbackEmail = `${input.toLowerCase()}@lumos.app`;
  return isValidLoginEmail(fallbackEmail) ? fallbackEmail : null;
}

export async function login(usernameOrEmail: string, password: string): Promise<LoginResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "auth.not_configured" };
  }
  try {
    const email = await resolveAuthEmail(usernameOrEmail);
    if (!email) {
      return { success: false, error: "login.identifier_invalid" };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: mapAuthError(error) };
    }

    if (data.session) {
      return {
        success: true,
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        },
      };
    }

    return { success: false, error: "login.failed" };
  } catch {
    return { success: false, error: "login.unexpected_error" };
  }
}

// ─── Signup ──────────────────────────────────────────────────────────────

export async function signup(payload: Record<string, unknown>): Promise<SignupResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "auth.not_configured" };
  }
  try {
    const email = payload.email as string;
    const password = payload.password as string;
    const username = payload.username as string;
    const phone = asString(payload.phone);
    const securityAnswerHash = payload.securityAnswer
      ? await hashText(payload.securityAnswer as string)
      : undefined;

    const authPasswordPending = Boolean(payload.authPasswordPending);
    const packageDetails = buildPackageDetails(payload, authPasswordPending, securityAnswerHash);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          company_name: payload.companyName,
          contact_name: payload.contactName,
          phone,
          package_details: packageDetails,
        },
      },
    });

    if (error) {
      return { success: false, error: mapAuthError(error) };
    }

    if (data.user) {
      const clientId = data.user.id;
      const needsConfirmation = !data.session;

      const clientRecord: JsonRecord = {
        id: clientId,
        username,
        email,
        phone,
        company_name: payload.companyName,
        brand_colors: normalizeBrandColors(payload.brandColors),
        package_details: packageDetails,
      };

      const { error: clientError } = await supabase
        .from("clients")
        .upsert(clientRecord);

      if (clientError) {
        console.warn("Signup: clients sync deferred:", clientError.message);
      }

      return { success: true, needsConfirmation };
    }

    return { success: false, error: "signup.failed" };
  } catch (err) {
    console.error("Signup error:", err);
    return { success: false, error: "signup.unexpected_error" };
  }
}

// ─── Resend Confirmation Email ───────────────────────────────────────────

export async function resendConfirmationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "auth.not_configured" };
  }
  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      return { success: false, error: mapAuthError(error) };
    }

    return { success: true };
  } catch {
    return { success: false, error: "resend.unexpected_error" };
  }
}

// ─── Forgot Password ─────────────────────────────────────────────────────

/**
 * Returns whether this email has a security question on file. We deliberately
 * do not expose the plaintext answer or its hash from this endpoint.
 *
 * NOTE: The frontend security-question flow has been disabled — a server-only
 * Edge Function is required to verify a user-supplied answer against a salted
 * hash stored privately. See SUPABASE_SECURITY_SETUP.md.
 */
export async function forgotPasswordCheckEmail(email: string): Promise<ForgotPasswordCheckResult> {
  if (!isSupabaseConfigured()) {
    return { hasSecurityQuestion: false };
  }
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("id, package_details")
      .eq("email", email)
      .maybeSingle();

    if (error || !data) {
      return { hasSecurityQuestion: false };
    }

    // Even if a security question is configured, we always return false here
    // so the UI falls back to Supabase's email-based reset flow. A secure
    // verifier requires a server-side Edge Function.
    const _profile = getSignupProfile(data.package_details);
    void _profile;
    return { hasSecurityQuestion: false };
  } catch {
    return { hasSecurityQuestion: false };
  }
}

export async function forgotPasswordSendReset(
  email: string,
  redirectTo?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "auth.not_configured" };
  }
  try {
    const baseUrl = window.location.origin;
    const redirectUrl = redirectTo || `${baseUrl}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      return { success: false, error: mapAuthError(error) };
    }

    return { success: true };
  } catch {
    return { success: false, error: "forgot_password.unexpected_error" };
  }
}

/**
 * Disabled. Verifying a security answer against a stored hash on the frontend
 * leaks the hash to anyone who can read the clients row. This must be done by
 * a Supabase Edge Function with a server-only secret. See SUPABASE_SECURITY_SETUP.md.
 *
 * Until that Edge Function exists, this function always reports failure so the
 * forgot-password UX falls back to Supabase's email reset link.
 */
export async function verifySecurityQuestion(
  _email: string,
  _answer: string,
): Promise<SecurityVerifyResult> {
  return {
    success: false,
    error: "security.disabled_use_email_reset",
    hasSecurityQuestion: false,
  };
}

// ─── Reset Password (after clicking email link) ──────────────────────────

export async function resetPassword(newPassword: string): Promise<ResetPasswordResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "auth.not_configured" };
  }
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: mapAuthError(error) };
    }

    return { success: true };
  } catch {
    return { success: false, error: "reset_password.unexpected_error" };
  }
}

// ─── Session & Auth State ───────────────────────────────────────────────

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session;
}

export async function getClientProfile(): Promise<AuthClient | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("clients")
      .select(CLIENT_PROFILE_SELECT)
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("getClientProfile: query failed, attempting auto-create:", error.message);
      return await ensureClientRecord(user);
    }

    if (!data) {
      return await ensureClientRecord(user);
    }

    const signupProfile = getSignupProfile(data.package_details);

    return {
      id: data.id,
      username: data.username || user.email || "",
      email: data.email || user.email || "",
      avatar_url: data.avatar_url,
      company_name: data.company_name,
      phone: data.phone,
      phone_number: data.phone,
      cover_url: data.logo_url,
      cover_gradient: data.cover_gradient,
      package_name: data.package_name,
      progress: data.progress ?? 0,
      status: data.status,
      theme_accent: data.theme_accent,
      brand_colors: data.brand_colors,
      next_steps: data.next_steps,
      industry: signupProfile.industry,
      role: "client",
      is_verified: false,
      security_question: signupProfile.security_question,
      business_tagline: signupProfile.business_tagline,
      full_contact_name: signupProfile.full_contact_name,
      website: signupProfile.website,
      brand_feel: signupProfile.brand_feel,
      auth_password_pending: signupProfile.auth_password_pending,
      signup_completed_at: signupProfile.signup_completed_at,
      signup_source: signupProfile.signup_source,
      package_details: data.package_details as ClientPackageDetails | null,
    };
  } catch {
    return null;
  }
}

async function ensureClientRecord(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<AuthClient | null> {
  try {
    const meta = user.user_metadata || {};
    const signupProfile = getSignupProfile(meta.package_details ?? meta.signup_profile ?? meta);
    const baseRecord: Record<string, unknown> = {
      id: user.id,
      username: meta.username || user.email?.split("@")[0] || "",
      email: user.email || "",
      company_name: meta.company_name || "",
      phone: meta.phone || "",
      package_details: {
        signup_profile: {
          ...signupProfile,
          business_tagline: signupProfile.business_tagline || asString(meta.business_tagline) || undefined,
          full_contact_name: signupProfile.full_contact_name || asString(meta.contact_name) || undefined,
          website: signupProfile.website || asString(meta.website) || undefined,
          brand_feel: signupProfile.brand_feel || asString(meta.brand_identity) || undefined,
        },
      },
    };

    const { data, error } = await supabase
      .from("clients")
      .upsert(baseRecord)
      .select(CLIENT_PROFILE_SELECT)
      .maybeSingle();

    if (error || !data) {
      console.warn("ensureClientRecord: failed to create client record:", error?.message);
      return {
        id: user.id,
        username: meta.username as string || user.email?.split("@")[0] || "",
        email: user.email || "",
        progress: 0,
        phone: asString(meta.phone) || undefined,
        phone_number: asString(meta.phone) || undefined,
        industry: signupProfile.industry,
        role: "client",
        is_verified: false,
        package_details: baseRecord.package_details as ClientPackageDetails,
        security_question: signupProfile.security_question,
        business_tagline: signupProfile.business_tagline,
        full_contact_name: signupProfile.full_contact_name,
        website: signupProfile.website,
        brand_feel: signupProfile.brand_feel,
        auth_password_pending: signupProfile.auth_password_pending,
      };
    }

    const ensuredSignupProfile = getSignupProfile(data.package_details);

    return {
      id: data.id,
      username: data.username || user.email || "",
      email: data.email || user.email || "",
      avatar_url: data.avatar_url,
      company_name: data.company_name,
      phone: data.phone,
      phone_number: data.phone,
      cover_url: data.logo_url,
      cover_gradient: data.cover_gradient,
      package_name: data.package_name,
      progress: data.progress ?? 0,
      status: data.status,
      theme_accent: data.theme_accent,
      brand_colors: data.brand_colors,
      next_steps: data.next_steps,
      security_question: ensuredSignupProfile.security_question,
      business_tagline: ensuredSignupProfile.business_tagline,
      full_contact_name: ensuredSignupProfile.full_contact_name,
      website: ensuredSignupProfile.website,
      brand_feel: ensuredSignupProfile.brand_feel,
      auth_password_pending: ensuredSignupProfile.auth_password_pending,
      signup_completed_at: ensuredSignupProfile.signup_completed_at,
      signup_source: ensuredSignupProfile.signup_source,
      package_details: data.package_details as ClientPackageDetails | null,
    };
  } catch {
    const meta = user.user_metadata || {};
    return {
      id: user.id,
      username: user.email?.split("@")[0] || "",
      email: user.email || "",
      progress: 0,
      phone: asString(user.user_metadata?.phone),
      phone_number: asString(user.user_metadata?.phone),
      role: "client",
      is_verified: false,
      package_details: meta.package_details as ClientPackageDetails | undefined,
    };
  }
}

export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback);
}

// ─── Logout ──────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

// ─── Real-time Availability Checks ───────────────────────────────────────

export type AvailabilityStatus = "idle" | "checking" | "available" | "taken" | "unknown";

export async function checkUsernameAvailable(username: string): Promise<boolean | "unknown"> {
  if (!isSupabaseConfigured()) return "unknown";
  try {
    const { data, error } = await supabase.rpc("check_username_available", {
      p_username: username,
    });
    if (!error && typeof data === "boolean") return data;

    const { data: row, error: fallbackError } = await supabase
      .from("clients")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (fallbackError) {
      console.warn("checkUsernameAvailable fallback error:", fallbackError.message);
      return "unknown";
    }

    return !row;
  } catch {
    return "unknown";
  }
}

export async function checkEmailAvailable(email: string): Promise<boolean | "unknown"> {
  if (!isSupabaseConfigured()) return "unknown";
  try {
    const { data, error } = await supabase.rpc("check_email_available", {
      p_email: email,
    });
    if (!error && typeof data === "boolean") return data;

    const { data: row, error: fallbackError } = await supabase
      .from("clients")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (fallbackError) {
      console.warn("checkEmailAvailable fallback error:", fallbackError.message);
      return "unknown";
    }

    return !row;
  } catch {
    return "unknown";
  }
}

export async function checkPhoneAvailable(phone: string): Promise<boolean | "unknown"> {
  if (!isSupabaseConfigured()) return "unknown";
  try {
    const { data, error } = await supabase.rpc("check_phone_available", {
      p_phone: phone,
    });
    if (!error && typeof data === "boolean") return data;

    const { data: row, error: fallbackError } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (fallbackError) {
      console.warn("checkPhoneAvailable fallback error:", fallbackError.message);
      return "unknown";
    }

    return !row;
  } catch {
    return "unknown";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function mapAuthError(error: { message: string; status?: number }): string {
  const m = (error.message || "").toLowerCase();
  const status = error.status;

  if (m === "auth.not_configured") return "auth.not_configured";
  if (status === 429 || m.includes("rate limit") || m.includes("too many requests")) return "login.rate_limited";
  if (status === 403 || m.includes("forbidden") || m.includes("row-level security") || m.includes("violates row-level security policy")) return "login.forbidden";
  if (status === 401 || m.includes("invalid login") || m.includes("invalid credentials")) return "login.invalid_credentials";
  if (status === 400 || m.includes("email not confirmed") || m.includes("email_not_confirmed") || m.includes("user not found") || m.includes("invalid request")) return "login.email_not_confirmed";
  if (m.includes("user already registered")) return "signup.email_exists";
  if (m.includes("duplicate key") || m.includes("unique constraint") || m.includes("violates unique constraint")) return "signup.conflict";
  if (m.includes("column") && m.includes("does not exist")) return "schema.mismatch";
  if (m.includes("password")) return "password.invalid";
  if (m.includes("email")) return "email.invalid";
  if (m.includes("network") || m.includes("fetch")) return "login.network_error";

  return m || "login.unexpected_error";
}

export const authService = {
  login,
  signup,
  logout,
  refreshProfile: getClientProfile,
  checkIfPhoneIsRegistered: async (phone?: string): Promise<boolean> => {
    if (!phone) return false;
    const available = await checkPhoneAvailable(phone);
    return available === false;
  },
  forgotPasswordCheckEmail,
  forgotPasswordSendReset,
  verifySecurityQuestion,
  resetPassword,
  resendConfirmationEmail,
  getSession,
  getClientProfile,
  onAuthStateChange,
  checkUsernameAvailable,
  checkEmailAvailable,
  checkPhoneAvailable,
};
