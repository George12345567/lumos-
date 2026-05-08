/**
 * inviteOnboardingService.ts
 *
 * Handles the "admin invited me from Supabase Auth" onboarding flow used by
 * /invite-onboarding. Splits the work into two steps:
 *
 *   1. Set the invited user's password via supabase.auth.updateUser. Required
 *      because Supabase invite emails create the auth row without a password.
 *
 *   2. Insert/update the matching public.clients row owned by auth.uid(),
 *      using the same package_details.signup_profile shape as the normal
 *      signup flow. role is always forced to 'client' — the frontend never
 *      sets admin. Real authorization is enforced by the RLS policies in
 *      supabase/migrations/20260507120100_enable_rls_and_policies.sql plus
 *      the self-insert policy added by 20260507130000.
 *
 * No service-role keys are used here. Every call runs as the authenticated
 * invitee under their own RLS context.
 */
import { supabase } from "@/lib/supabaseClient";
import { isSupabaseConfigured } from "@/config/auth";
import { normalizeWebsiteUrl } from "@/lib/validation";

export interface CompleteInviteInput {
  username: string;
  contactName: string;
  companyName: string;
  phone: string;
  website?: string;
  industry?: string;
  projectSummary?: string;
  newPassword: string;
}

export interface CompleteInviteResult {
  success: boolean;
  /** Structured error code for the UI to localize. */
  error?: string;
}

/**
 * Returns the invited user if a valid Supabase session exists, otherwise null.
 * Use this to decide whether to render the form or the "invalid invite" state.
 */
export async function getInvitedUser(): Promise<{ id: string; email: string } | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const email = (data.user.email || "").trim().toLowerCase();
    if (!email) return null;
    return { id: data.user.id, email };
  } catch {
    return null;
  }
}

/**
 * Returns the existing clients row for auth.uid(), or null if no row exists.
 * Used by the onboarding page to detect "already onboarded" and to decide
 * UPDATE vs INSERT.
 */
export async function getExistingClientRow(userId: string): Promise<{
  exists: boolean;
  signupCompletedAt: string | null;
  role: string | null;
  packageDetails?: Record<string, unknown> | null;
} | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("id, role, signup_completed_at, package_details")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("[inviteOnboarding] getExistingClientRow:", error.message);
      return { exists: false, signupCompletedAt: null, role: null, packageDetails: null };
    }
    if (!data) return { exists: false, signupCompletedAt: null, role: null, packageDetails: null };
    return {
      exists: true,
      signupCompletedAt: typeof data.signup_completed_at === "string" ? data.signup_completed_at : null,
      role: typeof data.role === "string" ? data.role : null,
      packageDetails: data.package_details && typeof data.package_details === "object"
        ? data.package_details as Record<string, unknown>
        : null,
    };
  } catch {
    return null;
  }
}

/**
 * Completes the invite onboarding:
 *   1. Sets the new password via supabase.auth.updateUser.
 *   2. Upserts the public.clients row (id = auth.uid()).
 *
 * Never sets role = 'admin'. If the row is being CREATED, role is forced to
 * 'client'. If the row already exists (e.g. admin pre-created it with a role),
 * we explicitly omit role from the update payload so existing role stays.
 */
export async function completeInviteOnboarding(
  input: CompleteInviteInput,
): Promise<CompleteInviteResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "auth.not_configured" };
  }

  const { data: userResp, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userResp.user) {
    return { success: false, error: "invite.session_invalid" };
  }
  const user = userResp.user;
  const email = (user.email || "").trim().toLowerCase();
  if (!email) {
    return { success: false, error: "invite.missing_email" };
  }

  // Step 1: set password.
  const { error: pwErr } = await supabase.auth.updateUser({ password: input.newPassword });
  if (pwErr) {
    const m = (pwErr.message || "").toLowerCase();
    if (m.includes("password")) return { success: false, error: "password.invalid" };
    if (m.includes("session") || m.includes("jwt") || pwErr.status === 401) {
      return { success: false, error: "invite.session_invalid" };
    }
    return { success: false, error: "invite.password_failed" };
  }

  // Step 2: build the clients payload using the same shape as the normal
  // signup flow. We deliberately leave `role` out of the update path so an
  // existing admin-set role cannot be overwritten by the invitee.
  const normalizedWebsite = input.website ? normalizeWebsiteUrl(input.website) : "";
  const websiteValue = normalizedWebsite === null ? "" : normalizedWebsite || "";

  const signupProfile = {
    full_contact_name: input.contactName.trim(),
    website: websiteValue,
    auth_password_pending: false,
    signup_completed_at: new Date().toISOString(),
    signup_source: "admin_created",
    industry: input.industry || undefined,
    project_summary: input.projectSummary?.trim() || undefined,
  };

  const existing = await getExistingClientRow(user.id);
  const mergedPackageDetails = {
    ...(existing?.packageDetails ?? {}),
    signup_profile: {
      ...((existing?.packageDetails?.signup_profile && typeof existing.packageDetails.signup_profile === "object")
        ? existing.packageDetails.signup_profile as Record<string, unknown>
        : {}),
      ...signupProfile,
    },
  };

  if (existing?.exists) {
    const updatePayload: Record<string, unknown> = {
      username: input.username,
      email,
      phone: input.phone,
      phone_number: input.phone,
      company_name: input.companyName.trim(),
      display_name: input.contactName.trim(),
      full_contact_name: input.contactName.trim(),
      website: websiteValue,
      industry: input.industry || "",
      project_summary: input.projectSummary?.trim() || "",
      auth_password_pending: false,
      signup_completed_at: new Date().toISOString(),
      signup_source: "admin_created",
      package_details: mergedPackageDetails,
    };
    const { error: updateErr } = await supabase
      .from("clients")
      .update(updatePayload)
      .eq("id", user.id);
    if (updateErr) {
      console.error("[inviteOnboarding] update failed:", updateErr.message);
      return { success: false, error: mapClientsError(updateErr.message) };
    }
    return { success: true };
  }

  // Insert path. RLS must allow `auth.uid() = id AND role = 'client'`.
  // See supabase/migrations/20260507130000_invited_user_self_insert.sql.
  const insertPayload: Record<string, unknown> = {
    id: user.id,
    username: input.username,
    email,
    phone: input.phone,
    phone_number: input.phone,
    company_name: input.companyName.trim(),
    display_name: input.contactName.trim(),
    full_contact_name: input.contactName.trim(),
    website: websiteValue,
    industry: input.industry || "",
    project_summary: input.projectSummary?.trim() || "",
    role: "client",
    signup_source: "admin_created",
    auth_password_pending: false,
    signup_completed_at: new Date().toISOString(),
    package_details: { signup_profile: signupProfile },
  };

  const { error: insertErr } = await supabase.from("clients").insert(insertPayload);
  if (insertErr) {
    console.error("[inviteOnboarding] insert failed:", insertErr.message);
    return { success: false, error: mapClientsError(insertErr.message) };
  }
  return { success: true };
}

function mapClientsError(message: string): string {
  const m = (message || "").toLowerCase();
  if (m.includes("duplicate key") || m.includes("unique constraint") || m.includes("violates unique constraint")) {
    return "invite.username_or_phone_taken";
  }
  if (m.includes("row-level security") || m.includes("violates row-level security")) {
    return "invite.rls_blocked";
  }
  if (m.includes("violates check constraint")) {
    return "invite.invalid_input";
  }
  return "invite.save_failed";
}
