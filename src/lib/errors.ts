/**
 * ═══════════════════════════════════════════════════════════════════
 * lib/errors.ts — Error Taxonomy + i18n Key Map
 * ═══════════════════════════════════════════════════════════════════
 *
 * All error codes used across auth flows are defined here.
 * Resolve i18n keys using resolveError(code, lang).
 * ═══════════════════════════════════════════════════════════════════
 */

// ─── Error Code Union ─────────────────────────────────────────────

export type AuthErrorCode =
  // Email errors
  | "email.required"
  | "email.invalid"
  | "email.disposable_not_allowed"
  | "email.unconfirmed"
  | "email.already_registered"
  | "email.already_confirmed"
  // Password errors
  | "password.required"
  | "password.confirm_required"
  | "password.min_length"
  | "password.too_weak"
  | "password.pattern_violation"
  | "password.mismatch"
  // Username errors
  | "username.required"
  | "username.too_short"
  | "username.too_long"
  | "username.invalid_format"
  | "username.reserved"
  | "username.taken"
  // Name / company
  | "full_name.invalid"
  | "company_name.invalid"
  // Phone / website
  | "phone.invalid"
  | "website.invalid"
  // Security question & answer
  | "security_question.invalid"
  | "security_answer.invalid"
  // Terms
  | "terms.required"
  // Login
  | "login.identifier_required"
  | "login.invalid_credentials"
  | "login.account_locked"
  // Rate limiting
  | "rate_limit.exceeded"
  // Generic
  | "unknown";

// ─── Field Error Shape ────────────────────────────────────────────

export interface FieldError {
  field?: string;
  code: string;
  message?: string;
}

export interface ApiErrorResponse {
  errors: FieldError[];
}

// ─── i18n Message Map ─────────────────────────────────────────────

type BilingualMessage = { ar: string; en: string };

export const ERROR_MESSAGES: Record<AuthErrorCode, BilingualMessage> = {
  // Email
  "email.required": {
    ar: "البريد الإلكتروني مطلوب",
    en: "Email address is required",
  },
  "email.invalid": {
    ar: "صيغة البريد الإلكتروني غير صحيحة",
    en: "Please enter a valid email address",
  },
  "email.disposable_not_allowed": {
    ar: "لا يُسمح باستخدام البريد المؤقت",
    en: "Disposable email addresses are not allowed",
  },
  "email.unconfirmed": {
    ar: "البريد غير مُؤكَّد — أعد إرسال رسالة التأكيد أو افحص مجلد الرسائل غير الهامة.",
    en: "Email not confirmed — resend the confirmation or check your spam folder.",
  },
  "email.already_registered": {
    ar: "البريد مسجّل مسبقًا. سجّل الدخول بدلاً من ذلك.",
    en: "This email is already registered. Please log in instead.",
  },
  "email.already_confirmed": {
    ar: "البريد مُؤكَّد بالفعل.",
    en: "This email address is already confirmed.",
  },
  // Password
  "password.required": { ar: "كلمة المرور مطلوبة", en: "Password is required" },
  "password.confirm_required": {
    ar: "تأكيد كلمة المرور مطلوب",
    en: "Please confirm your password",
  },
  "password.min_length": {
    ar: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
    en: "Password must be at least 8 characters",
  },
  "password.too_weak": {
    ar: "كلمة المرور ضعيفة — يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز",
    en: "Password is too weak — must include uppercase, lowercase, digits, and symbols",
  },
  "password.pattern_violation": {
    ar: "كلمة المرور تحتوي على نمط ضعيف أو شائع جدًا",
    en: "Password contains a common or repeated pattern",
  },
  "password.mismatch": {
    ar: "كلمتا المرور غير متطابقتين",
    en: "Passwords do not match",
  },
  // Username
  "username.required": { ar: "اسم المستخدم مطلوب", en: "Username is required" },
  "username.too_short": {
    ar: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل",
    en: "Username must be at least 3 characters",
  },
  "username.too_long": {
    ar: "اسم المستخدم يجب ألا يتجاوز 20 حرفًا",
    en: "Username must be 20 characters or fewer",
  },
  "username.invalid_format": {
    ar: "اسم المستخدم يجب أن يبدأ بحرف ويحتوي فقط على أحرف صغيرة إنجليزية وأرقام و _ و -",
    en: "Username must start with a letter and contain only lowercase alphanumeric characters, _ or -",
  },
  "username.reserved": {
    ar: "اسم المستخدم هذا محجوز. من فضلك اختر اسمًا آخر.",
    en: "This username is reserved. Please choose another one.",
  },
  "username.taken": {
    ar: "اسم المستخدم مستخدَم بالفعل",
    en: "This username is already taken",
  },
  // Name / Company
  "full_name.invalid": {
    ar: "الاسم الكامل يجب أن يكون من كلمتين على الأقل (4–60 حرفًا)",
    en: "Full name must contain at least 2 words (4–60 characters)",
  },
  "company_name.invalid": {
    ar: "اسم الشركة أو البراند غير صحيح (2–80 حرفًا)",
    en: "Company / Brand name is invalid (2–80 characters required)",
  },
  // Phone / Website
  "phone.invalid": {
    ar: "رقم الهاتف يجب أن يكون بصيغة دولية (مثال: +201234567890)",
    en: "Phone must be in international E.164 format (e.g. +201234567890)",
  },
  "website.invalid": {
    ar: "رابط الموقع يجب أن يبدأ بـ https://",
    en: "Website URL must start with https://",
  },
  // Security
  "security_question.invalid": {
    ar: "من فضلك اختر سؤال أمان من القائمة المتاحة",
    en: "Please select a valid security question from the provided list",
  },
  "security_answer.invalid": {
    ar: "إجابة سؤال الأمان يجب أن تكون حرفين على الأقل",
    en: "Security answer must be at least 2 characters",
  },
  // Terms
  "terms.required": {
    ar: "يجب قبول الشروط والأحكام للمتابعة",
    en: "You must accept the terms and conditions to continue",
  },
  // Login
  "login.identifier_required": {
    ar: "اسم المستخدم أو البريد الإلكتروني مطلوب",
    en: "Username or email is required",
  },
  "login.invalid_credentials": {
    ar: "بيانات الدخول غير صحيحة",
    en: "Invalid username or password",
  },
  "login.account_locked": {
    ar: "تم قفل الحساب مؤقتًا. حاول مرة أخرى لاحقًا.",
    en: "Account temporarily locked. Please try again later.",
  },
  // Rate limit
  "rate_limit.exceeded": {
    ar: "لقد تجاوزت الحد المسموح به. انتظر قليلاً ثم حاول مجددًا.",
    en: "Too many requests. Please wait a moment and try again.",
  },
  // Generic
  unknown: {
    ar: "حدث خطأ غير متوقع. حاول مرة أخرى.",
    en: "An unexpected error occurred. Please try again.",
  },
};

// ─── Resolver ─────────────────────────────────────────────────────

export type SupportedLang = "ar" | "en";

export function resolveError(code: string, lang: SupportedLang = "en"): string {
  const key = code as AuthErrorCode;
  return ERROR_MESSAGES[key]?.[lang] ?? ERROR_MESSAGES["unknown"][lang];
}

/**
 * Maps a Supabase Auth error message string to a structured AuthErrorCode.
 * Covers Supabase v2 error message patterns.
 */
export function classifySupabaseError(message: string): AuthErrorCode {
  const msg = (message || "").toLowerCase();

  if (
    msg.includes("email not confirmed") ||
    msg.includes("not confirmed") ||
    msg.includes("email_not_confirmed")
  )
    return "email.unconfirmed";
  if (
    msg.includes("already registered") ||
    msg.includes("already exists") ||
    msg.includes("user already registered")
  )
    return "email.already_registered";
  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid credentials") ||
    msg.includes("invalid email or password")
  )
    return "login.invalid_credentials";
  if (
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("over_email_send_rate_limit") ||
    msg.includes("email rate limit")
  )
    return "rate_limit.exceeded";
  if (
    msg.includes("weak password") ||
    msg.includes("should be at least") ||
    msg.includes("password should")
  )
    return "password.too_weak";
  if (
    (msg.includes("email") && msg.includes("invalid")) ||
    msg.includes("unable to validate email")
  )
    return "email.invalid";
  if (msg.includes("username") && msg.includes("taken"))
    return "username.taken";
  if (msg.includes("account locked") || msg.includes("too many failed"))
    return "login.account_locked";

  return "unknown";
}
