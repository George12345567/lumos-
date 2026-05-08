-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260507150100_client_messages_sender_identity.sql
--
-- Add richer sender identity to client_messages so the dashboard and the
-- client portal can show who sent a message (which admin / which team
-- member). The existing `sender` column (text: 'client' | 'team') is kept
-- for backwards compatibility — `sender_type` would be the cleaner name on
-- a greenfield schema, but renaming would break the live client portal
-- which already reads `sender`.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.client_messages
  add column if not exists sender_id uuid,
  add column if not exists sender_name text;

-- The existing RLS policies on client_messages (from
-- 20260507140100_client_messages_rls.sql) cover these columns automatically.
-- No policy changes required.

-- Verification:
--   select id, sender, sender_id, sender_name, left(message, 60) as preview, created_at
--     from public.client_messages
--     order by created_at desc limit 5;
