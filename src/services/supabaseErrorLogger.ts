export type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function parseSupabaseError(error: unknown): SupabaseErrorLike {
  if (error && typeof error === 'object') {
    return error as SupabaseErrorLike;
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: String(error ?? 'Unknown Supabase error') };
}

export function logSupabaseError(
  scope: string,
  error: unknown,
  payload?: unknown,
  extra: Record<string, unknown> = {},
) {
  const parsed = parseSupabaseError(error);
  console.error(`[${scope}] Supabase error`, {
    code: parsed.code,
    message: parsed.message,
    details: parsed.details,
    hint: parsed.hint,
    payload,
    ...extra,
  });
}

export function supabaseErrorMessage(error: unknown, fallback = 'Supabase request failed'): string {
  const parsed = parseSupabaseError(error);
  return [parsed.code, parsed.message].filter(Boolean).join(': ') || fallback;
}
