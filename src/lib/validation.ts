/**
 * ═══════════════════════════════════════════════════════════════════
 * lib/validation.ts — Shared Zod Schemas (Frontend + Edge Functions)
 * ═══════════════════════════════════════════════════════════════════
 *
 * Single source of truth for all auth validation rules.
 * Both frontend forms and Edge Functions must mirror these rules.
 * Error message values are structured codes — resolve with errors.ts.
 *
 * PASSWORD POLICY (v2):
 *   - min 8 characters
 *   - requires uppercase, lowercase, and digit
 *   - rejects common passwords and 3+ repeated identical characters
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import { INDUSTRY_OPTIONS, BUDGET_RANGE_OPTIONS, TIMELINE_OPTIONS, REFERRAL_SOURCE_OPTIONS } from "@/lib/constants";

// ─── Denylist helpers ──────────────────────────────────────────────

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "george",
  "root",
  "superadmin",
  "system",
  "lumos",
  "lumosagency",
  "support",
  "help",
  "info",
  "contact",
  "api",
  "null",
  "undefined",
  "test",
  "demo",
  "bot",
  "me",
  "you",
  "user",
  "client",
  "staff",
  "team",
  "ops",
]);

export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwam.com",
  "10minutemail.com",
  "fakeinbox.com",
  "yopmail.com",
  "sharklasers.com",
  "trashmail.com",
  "dispostable.com",
  "maildrop.cc",
  "getnada.com",
  "spam4.me",
  "trashmail.at",
  "mytrashmail.com",
  "throwam.com",
  "spamgourmet.com",
  "mailnull.com",
  "spamex.com",
  "discard.email",
  "tempr.email",
  "mailnesia.com",
  "spamfree24.org",
  "getairmail.com",
]);

export const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password12",
  "password123",
  "password1234",
  "12345678",
  "123456789",
  "1234567890",
  "123456789012",
  "qwerty",
  "qwertyuiop",
  "qwerty123",
  "abc123456",
  "letmein",
  "letmein123",
  "welcome",
  "welcome1",
  "welcome123",
  "monkey",
  "dragon",
  "master",
  "shadow",
  "sunshine",
  "princess",
  "iloveyou",
  "superman",
  "batman",
  "starwars",
  "football",
  "admin",
  "admin123",
  "administrator",
  "root",
  "toor",
  "passw0rd",
  "p@ssword",
  "p@ssw0rd",
  "P@ssword1",
  "P@ssword123",
]);

// ─── Validation helpers ────────────────────────────────────────────

export function isE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

export function notDisposable(email: string): boolean {
  const domain = (email.split("@")[1] ?? "").toLowerCase();
  return !DISPOSABLE_DOMAINS.has(domain);
}

export function notReserved(username: string): boolean {
  return !RESERVED_USERNAMES.has(username.toLowerCase().trim());
}

export function isStrongPassword(pw: string): boolean {
  if (!pw) return false;
  if (COMMON_PASSWORDS.has(pw.toLowerCase())) return false;
  if (/(.)\1\1/.test(pw)) return false; // 3+ repeated identical chars
  if (/^(.{1,3})\1+$/.test(pw)) return false; // repeating short pattern
  return /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw);
}

export function isValidFullName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 4 || trimmed.length > 60) return false;
  // Must contain at least 2 "words" (supports Arabic and Latin)
  const words = trimmed
    .split(/[\s\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]+/)
    .filter(Boolean);
  return words.length >= 2;
}

export function isValidCompanyName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 80;
}

export function normalizeWebsiteUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    // Only allow https
    if (parsed.protocol !== "https:") return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

// ─── Allowed security questions ────────────────────────────────────

export const ALLOWED_SECURITY_QUESTIONS = new Set([
  "What is the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favourite movie?",
  "What was the make of your first car?",
  "What is your favourite food?",
  "What street did you grow up on?",
]);

// ─── Signup Schema ─────────────────────────────────────────────────

export const signupSchema = z.object({
  email: z
    .string({ required_error: "email.required" })
    .trim()
    .toLowerCase()
    .min(1, { message: "email.required" })
    .email({ message: "email.invalid" })
    .refine(notDisposable, { message: "email.disposable_not_allowed" }),

  password: z
    .string({ required_error: "password.required" })
    .min(8, { message: "password.min_length" })
    .refine(isStrongPassword, { message: "password.too_weak" }),

  confirmPassword: z
    .string({ required_error: "password.confirm_required" })
    .min(1, { message: "password.confirm_required" }),

  username: z
    .string({ required_error: "username.required" })
    .trim()
    .toLowerCase()
    .min(3, { message: "username.too_short" })
    .max(20, { message: "username.too_long" })
    .regex(/^[a-z][a-z0-9_-]{2,19}$/, { message: "username.invalid_format" })
    .refine(notReserved, { message: "username.reserved" }),

  companyName: z
    .string({ required_error: "company_name.invalid" })
    .trim()
    .refine(isValidCompanyName, { message: "company_name.invalid" }),

  contactName: z
    .string({ required_error: "full_name.invalid" })
    .trim()
    .refine(isValidFullName, { message: "full_name.invalid" }),

  phone: z
    .string({ required_error: "phone.invalid" })
    .trim()
    .min(1, { message: "phone.invalid" })
    .refine((v) => isE164(v), { message: "phone.invalid" }),

  website: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        const normalized = normalizeWebsiteUrl(v);
        return normalized !== null;
      },
      { message: "website.invalid" },
    ),

  tagline: z
    .string()
    .optional()
    .refine((v) => !v || v.trim().length <= 120, {
      message: "tagline.too_long",
    }),

  brandIdentity: z.string().optional(),

  securityQuestion: z
    .string()
    .optional()
    .refine((v) => !v || ALLOWED_SECURITY_QUESTIONS.has(v), {
      message: "security_question.invalid",
    }),

  securityAnswer: z
    .string()
    .optional()
    .refine((v) => !v || v.trim().length >= 2, {
      message: "security_answer.invalid",
    }),

  termsAccepted: z
    .boolean()
    .optional()
    .refine((v) => v === true, { message: "terms.required" }),

  industry: z
    .string()
    .optional()
    .refine((v) => !v || v === '' || INDUSTRY_OPTIONS.map(o => o.value).includes(v), {
      message: 'industry.invalid',
    }),

  servicesNeeded: z
    .array(z.string())
    .optional()
    .default([]),

  budgetRange: z
    .string()
    .optional()
    .refine((v) => !v || v === '' || BUDGET_RANGE_OPTIONS.map(o => o.value).includes(v), {
      message: 'budget_range.invalid',
    }),

  timeline: z
    .string()
    .optional()
    .refine((v) => !v || v === '' || TIMELINE_OPTIONS.map(o => o.value).includes(v), {
      message: 'timeline.invalid',
    }),

  referralSource: z
    .string()
    .optional()
    .refine((v) => !v || v === '' || REFERRAL_SOURCE_OPTIONS.map(o => o.value).includes(v), {
      message: 'referral_source.invalid',
    }),

  projectSummary: z
    .string()
    .optional()
    .refine((v) => !v || v.trim().length <= 500, {
      message: 'project_summary.too_long',
    }),
});

export type SignupInput = z.infer<typeof signupSchema>;

// ─── Signup form schema (with password match check) ────────────────

export const signupFormSchema = signupSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "password.mismatch",
    path: ["confirmPassword"],
  },
);

// ─── Login Schema ─────────────────────────────────────────────────

export const loginSchema = z.object({
  usernameOrEmail: z
    .string({ required_error: "login.identifier_required" })
    .trim()
    .min(1, { message: "login.identifier_required" }),

  password: z
    .string({ required_error: "password.required" })
    .min(1, { message: "password.required" }),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Resend Confirmation Schema ───────────────────────────────────

export const resendConfirmationSchema = z.object({
  email: z
    .string({ required_error: "email.required" })
    .trim()
    .toLowerCase()
    .min(1, { message: "email.required" })
    .email({ message: "email.invalid" }),
});

export type ResendConfirmationInput = z.infer<typeof resendConfirmationSchema>;

// ─── Forgot Password — Step 2: Security Verification ────────────────

export const forgotPasswordSecuritySchema = z.object({
  securityQuestion: z
    .string({ required_error: "security_question.required" })
    .min(1, { message: "security_question.required" })
    .refine((v) => ALLOWED_SECURITY_QUESTIONS.has(v), {
      message: "security_question.invalid",
    }),

  securityAnswer: z
    .string({ required_error: "security_answer.required" })
    .trim()
    .min(2, { message: "security_answer.too_short" }),
});

export type ForgotPasswordSecurityInput = z.infer<typeof forgotPasswordSecuritySchema>;

// ─── Forgot Password — Step 3: Reset Password ──────────────────────

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string({ required_error: "password.required" })
      .min(8, { message: "password.min_length" })
      .refine(isStrongPassword, { message: "password.too_weak" }),

    confirmNewPassword: z
      .string({ required_error: "password.confirm_required" })
      .min(1, { message: "password.confirm_required" }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "password.mismatch",
    path: ["confirmNewPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─── Password rules for UI checklist ─────────────────────────────

export interface PwdRule {
  ok: boolean;
  ar: string;
  en: string;
}

export function getPasswordRules(
  password: string,
  confirmPassword?: string,
): PwdRule[] {
  return [
    {
      ok: password.length >= 8,
      ar: "8 أحرف على الأقل",
      en: "At least 8 characters",
    },
    {
      ok: /[A-Z]/.test(password),
      ar: "حرف كبير (A-Z)",
      en: "One uppercase letter (A-Z)",
    },
    {
      ok: /[a-z]/.test(password),
      ar: "حرف صغير (a-z)",
      en: "One lowercase letter (a-z)",
    },
    {
      ok: /\d/.test(password),
      ar: "رقم واحد على الأقل (0-9)",
      en: "At least one number (0-9)",
    },

    ...(confirmPassword !== undefined
      ? [
          {
            ok: password === confirmPassword && password.length > 0,
            ar: "تطابق كلمتي المرور",
            en: "Passwords match",
          },
        ]
      : []),
  ];
}

export function getPasswordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (password.length >= 14) score++; // bonus for extra length
  return score as 0 | 1 | 2 | 3 | 4;
}

// ─── Re-export helpers ────────────────────────────────────────────

export {
  isE164 as validateE164,
  notDisposable as isNotDisposable,
  notReserved as isNotReserved,
  isStrongPassword as validatePasswordStrength,
};
