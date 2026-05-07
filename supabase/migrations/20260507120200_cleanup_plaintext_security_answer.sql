-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260507120200_cleanup_plaintext_security_answer.sql
--
-- One-time cleanup: remove every plaintext security_answer value persisted
-- before the frontend was hardened. The frontend now only stores a salted
-- hash inside package_details.signup_profile.security_answer_hash; nothing
-- else. Anything else is legacy data that must be purged.
--
-- The current schema actually stores plaintext in TWO places:
--   * public.clients.security_answer   (top-level text column)
--   * public.clients.package_details->'security_answer'
--   * public.clients.package_details->'signup_profile'->'security_answer'
--   * public.signup_requests.security_answer (legacy; the table is
--     admin-only via 004_fix_rls_policies.sql but the column should still go)
--
-- security_answer_hash IS preserved everywhere it exists.
--
-- This migration is idempotent and safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════


-- 1. clients.security_answer (top-level column) — NULL it out, then drop the
--    column entirely so it can't be re-populated by mistake.
update public.clients
set security_answer = null
where security_answer is not null;

alter table public.clients
  drop column if exists security_answer;


-- 2. clients.package_details — strip both the top-level and the nested
--    signup_profile.security_answer keys. Preserve security_answer_hash.
update public.clients
set package_details =
  case
    when package_details is null then null
    when jsonb_typeof(package_details) <> 'object' then package_details
    else
      (package_details - 'security_answer')
      || jsonb_build_object(
           'signup_profile',
           coalesce(
             (package_details->'signup_profile') - 'security_answer',
             '{}'::jsonb
           )
         )
  end
where
  package_details is not null
  and (
    package_details ? 'security_answer'
    or (package_details->'signup_profile') ? 'security_answer'
  );


-- 3. signup_requests.security_answer — same treatment. The signup_requests
--    table holds historic lead intake; its column can also go.
update public.signup_requests
set security_answer = null
where security_answer is not null;

alter table public.signup_requests
  drop column if exists security_answer;


-- ───────────────────────────────────────────────────────────────────────────────
-- POST-DEPLOY VERIFICATION
-- ───────────────────────────────────────────────────────────────────────────────
-- Confirm cleanup with:
--
--   select count(*) from public.clients
--    where (package_details ? 'security_answer')
--       or (package_details->'signup_profile') ? 'security_answer';
--   -- expected: 0
--
--   select count(*) from information_schema.columns
--    where table_schema = 'public'
--      and table_name = 'clients'
--      and column_name = 'security_answer';
--   -- expected: 0
-- ───────────────────────────────────────────────────────────────────────────────
