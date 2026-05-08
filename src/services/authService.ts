import { supabase } from "@/lib/supabaseClient";
import { isSupabaseConfigured } from "@/config/auth";

// ─── Types ──────────────────────────────────────────────────────────────

type JsonRecord = Record<string, unknown>;

interface ClientSignupProfile {
  avatar_mode?: string;
  avatar_seed?: string;
  avatar_style?: string;
  avatar_preset_url?: string;
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
  display_name?: string;
  bio?: string;
  tagline?: string;
  location?: string;
  timezone?: string;
  industry?: string;
  services_needed?: unknown[];
  budget_range?: string;
  timeline?: string;
  referral_source?: string;
  project_summary?: string;
  role?: string;
  is_verified?: boolean;
  cover_url?: string;
  cover_gradient?: string;
  profile_visibility?: string;
  social_links?: Record<string, string>;
  avatar_style?: string;
  avatar_seed?: string;
  avatar_config?: Record<string, unknown>;
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
  password_must_change?: boolean;
  password_updated_by_admin_at?: string;
  password_updated_by_admin_by?: string | null;
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
  "id, username, email, avatar_url, company_name, phone, phone_number, role, is_verified, cover_url, display_name, bio, tagline, location, timezone, profile_visibility, social_links, avatar_style, avatar_seed, avatar_config, package_name, status, progress, next_steps, package_details, subscription_config, admin_notes, active_offer, active_offer_link, logo_url, cover_gradient, theme_accent, brand_colors, business_tagline, full_contact_name, website, brand_feel, auth_password_pending, password_must_change, password_updated_by_admin_at, password_updated_by_admin_by, industry, services_needed, budget_range, timeline, referral_source, project_summary, created_at, updated_at";

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

function normalizeServicesNeeded(value: unknown): unknown[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const services = value
    .map((item) => (typeof item === "string" ? item.trim() : item))
    .filter((item) => (typeof item === "string" ? Boolean(item) : item !== null && item !== undefined));
  return services.length ? services : [];
}

function buildAvatarConfig(payload: Record<string, unknown>, brandColors?: string[]): Record<string, unknown> {
  const mode = asString(payload.avatarMode) || "preset";
  const seed = asString(payload.avatarSeed) || asString(payload.username) || "lumos-default";
  const style = asString(payload.avatarStyle) || "nanoBanana";
  const presetUrl = asString(payload.avatarPresetUrl);

  return {
    mode,
    seed,
    style,
    colors: brandColors ?? [],
    ...(presetUrl ? { presetUrl } : {}),
  };
}

function getSignupProfile(source: unknown): ClientSignupProfile {
  if (!isRecord(source)) return {};

  const candidate: JsonRecord = isRecord(source.signup_profile)
    ? (source.signup_profile as JsonRecord)
    : source;

  return {
    avatar_mode: asString(candidate.avatar_mode) || undefined,
    avatar_seed: asString(candidate.avatar_seed) || undefined,
    avatar_style: asString(candidate.avatar_style) || undefined,
    avatar_preset_url: asString(candidate.avatar_preset_url) || undefined,
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
    industry: asString(candidate.industry) || undefined,
    services_needed: normalizeServicesNeeded(candidate.services_needed),
    budget_range: asString(candidate.budget_range) || undefined,
    timeline: asString(candidate.timeline) || undefined,
    referral_source: asString(candidate.referral_source) || undefined,
    project_summary: asString(candidate.project_summary) || undefined,
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
    avatar_mode: asString(payload.avatarMode) || undefined,
    avatar_seed: asString(payload.avatarSeed) || undefined,
    avatar_style: asString(payload.avatarStyle) || undefined,
    avatar_preset_url: asString(payload.avatarPresetUrl) || undefined,
    business_tagline: asString(payload.businessTagline) || asString(payload.tagline) || undefined,
    full_contact_name: asString(payload.contactName) || undefined,
    website: asString(payload.website) || undefined,
    brand_feel: asString(payload.brandIdentity) || undefined,
    security_question: asString(payload.securityQuestion) || undefined,
    security_answer_hash: securityAnswerHash,
    auth_password_pending: authPasswordPending,
    signup_completed_at: asString(payload.signupCompletedAt) || new Date().toISOString(),
    signup_source: asString(payload.signupSource) || "web_signup",
    industry: asString(payload.industry) || undefined,
    services_needed: normalizeServicesNeeded(payload.servicesNeeded),
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

async function uploadSignupAvatar(clientId: string, file: unknown): Promise<string | undefined> {
  if (typeof File === "undefined" || !(file instanceof File)) return undefined;
  if (!file.type.startsWith("image/")) return undefined;
  if (file.size > 5 * 1024 * 1024) return undefined;

  const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${clientId}/avatars/${Date.now()}-${safeBase}`;
  const { error } = await supabase.storage
    .from("client-assets")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });

  return error ? undefined : path;
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
    const brandColors = normalizeBrandColors(payload.brandColors);
    const avatarConfig = buildAvatarConfig(payload, brandColors);

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
          avatar_config: avatarConfig,
        },
      },
    });

    if (error) {
      return { success: false, error: mapAuthError(error) };
    }

    if (data.user) {
      const clientId = data.user.id;
      const needsConfirmation = !data.session;
      const avatarPath = data.session ? await uploadSignupAvatar(clientId, payload.avatarFile) : undefined;
      const completedAt = new Date().toISOString();
      const tagline = asString(payload.tagline);
      const servicesNeeded = normalizeServicesNeeded(payload.servicesNeeded) ?? [];

      const clientRecord: JsonRecord = {
        id: clientId,
        username,
        email,
        phone,
        phone_number: phone,
        role: "client",
        company_name: payload.companyName,
        display_name: asString(payload.contactName) || username,
        tagline,
        business_tagline: tagline,
        full_contact_name: asString(payload.contactName),
        website: asString(payload.website),
        brand_feel: asString(payload.brandIdentity),
        brand_colors: brandColors,
        theme_accent: brandColors?.[0],
        cover_gradient: brandColors?.length
          ? `linear-gradient(135deg, ${brandColors[0]} 0%, ${brandColors[1] ?? brandColors[0]} 100%)`
          : undefined,
        avatar_url: avatarPath,
        avatar_seed: asString(payload.avatarSeed) || username || "lumos-default",
        avatar_style: asString(payload.avatarStyle) || "nanoBanana",
        avatar_config: avatarConfig,
        industry: asString(payload.industry),
        services_needed: servicesNeeded,
        budget_range: asString(payload.budgetRange),
        timeline: asString(payload.timeline),
        referral_source: asString(payload.referralSource),
        project_summary: asString(payload.projectSummary),
        signup_completed_at: completedAt,
        signup_source: asString(payload.signupSource) || "web_signup",
        auth_password_pending: authPasswordPending,
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

export async function changeTemporaryPassword(newPassword: string): Promise<ResetPasswordResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "auth.not_configured" };
  }
  try {
    const result = await resetPassword(newPassword);
    if (!result.success) return result;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "login.invalid_session" };
    }

    const { error } = await supabase
      .from("clients")
      .update({
        password_must_change: false,
        auth_password_pending: false,
      })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: "profile.password_flag_update_failed" };
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
      phone_number: data.phone_number || data.phone,
      display_name: data.display_name,
      bio: data.bio,
      tagline: data.tagline || data.business_tagline || signupProfile.business_tagline,
      location: data.location,
      timezone: data.timezone,
      cover_url: data.cover_url || data.logo_url,
      cover_gradient: data.cover_gradient,
      profile_visibility: data.profile_visibility,
      social_links: data.social_links,
      avatar_style: data.avatar_style || signupProfile.avatar_style,
      avatar_seed: data.avatar_seed || signupProfile.avatar_seed,
      avatar_config: data.avatar_config,
      package_name: data.package_name,
      progress: data.progress ?? 0,
      status: data.status,
      theme_accent: data.theme_accent,
      brand_colors: data.brand_colors,
      next_steps: data.next_steps,
      role: "client",
      is_verified: false,
      security_question: signupProfile.security_question,
      business_tagline: data.business_tagline || signupProfile.business_tagline,
      full_contact_name: data.full_contact_name || signupProfile.full_contact_name,
      website: data.website || signupProfile.website,
      industry: data.industry || signupProfile.industry,
      services_needed: data.services_needed || signupProfile.services_needed,
      budget_range: data.budget_range || signupProfile.budget_range,
      timeline: data.timeline || signupProfile.timeline,
      referral_source: data.referral_source || signupProfile.referral_source,
      project_summary: data.project_summary || signupProfile.project_summary,
      brand_feel: data.brand_feel || signupProfile.brand_feel,
      auth_password_pending:
        typeof data.auth_password_pending === "boolean"
          ? data.auth_password_pending
          : signupProfile.auth_password_pending,
      password_must_change: Boolean(data.password_must_change),
      password_updated_by_admin_at: data.password_updated_by_admin_at,
      password_updated_by_admin_by: data.password_updated_by_admin_by,
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
      role: "client",
      company_name: meta.company_name || "",
      phone: meta.phone || "",
      phone_number: meta.phone || "",
      display_name: signupProfile.full_contact_name || asString(meta.contact_name) || "",
      tagline: signupProfile.business_tagline || asString(meta.tagline) || "",
      business_tagline: signupProfile.business_tagline || asString(meta.tagline) || "",
      full_contact_name: signupProfile.full_contact_name || asString(meta.contact_name) || "",
      website: signupProfile.website || asString(meta.website) || "",
      brand_feel: signupProfile.brand_feel || asString(meta.brand_identity) || "",
      industry: signupProfile.industry || "",
      services_needed: signupProfile.services_needed ?? [],
      budget_range: signupProfile.budget_range || "",
      timeline: signupProfile.timeline || "",
      referral_source: signupProfile.referral_source || "",
      project_summary: signupProfile.project_summary || "",
      signup_completed_at: signupProfile.signup_completed_at || new Date().toISOString(),
      signup_source: signupProfile.signup_source || "web_signup",
      auth_password_pending: signupProfile.auth_password_pending ?? false,
      avatar_style: signupProfile.avatar_style || "nanoBanana",
      avatar_seed: signupProfile.avatar_seed || asString(meta.username) || user.email?.split("@")[0] || "lumos-default",
      avatar_config: {
        mode: signupProfile.avatar_mode || "generate",
        seed: signupProfile.avatar_seed || asString(meta.username) || "lumos-default",
        style: signupProfile.avatar_style || "nanoBanana",
        ...(signupProfile.avatar_preset_url ? { presetUrl: signupProfile.avatar_preset_url } : {}),
      },
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
        display_name: signupProfile.full_contact_name,
        tagline: signupProfile.business_tagline,
        services_needed: signupProfile.services_needed,
        budget_range: signupProfile.budget_range,
        timeline: signupProfile.timeline,
        referral_source: signupProfile.referral_source,
        project_summary: signupProfile.project_summary,
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
        password_must_change: false,
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
      phone_number: data.phone_number || data.phone,
      display_name: data.display_name,
      bio: data.bio,
      tagline: data.tagline || data.business_tagline || ensuredSignupProfile.business_tagline,
      location: data.location,
      timezone: data.timezone,
      cover_url: data.cover_url || data.logo_url,
      cover_gradient: data.cover_gradient,
      profile_visibility: data.profile_visibility,
      social_links: data.social_links,
      avatar_style: data.avatar_style || ensuredSignupProfile.avatar_style,
      avatar_seed: data.avatar_seed || ensuredSignupProfile.avatar_seed,
      avatar_config: data.avatar_config,
      package_name: data.package_name,
      progress: data.progress ?? 0,
      status: data.status,
      theme_accent: data.theme_accent,
      brand_colors: data.brand_colors,
      next_steps: data.next_steps,
      security_question: ensuredSignupProfile.security_question,
      business_tagline: data.business_tagline || ensuredSignupProfile.business_tagline,
      full_contact_name: data.full_contact_name || ensuredSignupProfile.full_contact_name,
      website: data.website || ensuredSignupProfile.website,
      brand_feel: data.brand_feel || ensuredSignupProfile.brand_feel,
      industry: data.industry || ensuredSignupProfile.industry,
      services_needed: data.services_needed || ensuredSignupProfile.services_needed,
      budget_range: data.budget_range || ensuredSignupProfile.budget_range,
      timeline: data.timeline || ensuredSignupProfile.timeline,
      referral_source: data.referral_source || ensuredSignupProfile.referral_source,
      project_summary: data.project_summary || ensuredSignupProfile.project_summary,
      auth_password_pending:
        typeof data.auth_password_pending === "boolean"
          ? data.auth_password_pending
          : ensuredSignupProfile.auth_password_pending,
      password_must_change: Boolean(data.password_must_change),
      password_updated_by_admin_at: data.password_updated_by_admin_at,
      password_updated_by_admin_by: data.password_updated_by_admin_by,
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
      services_needed: getSignupProfile(meta.package_details).services_needed,
      budget_range: getSignupProfile(meta.package_details).budget_range,
      timeline: getSignupProfile(meta.package_details).timeline,
      referral_source: getSignupProfile(meta.package_details).referral_source,
      project_summary: getSignupProfile(meta.package_details).project_summary,
      role: "client",
      is_verified: false,
      package_details: meta.package_details as ClientPackageDetails | undefined,
      password_must_change: false,
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
  changeTemporaryPassword,
  resendConfirmationEmail,
  getSession,
  getClientProfile,
  onAuthStateChange,
  checkUsernameAvailable,
  checkEmailAvailable,
  checkPhoneAvailable,
};
