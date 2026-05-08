-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260507140100_client_messages_rls.sql
--
-- Enable RLS on client_messages and install policies that allow:
--   * a signed-in client to read and insert their own messages
--     (sender = 'client', client_id = auth.uid())
--   * an admin to read and insert any message on behalf of any client
--
-- Also adds optional attachment metadata so admins can link a file from
-- client_assets to a message without duplicating the file storage.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.client_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text;

alter table public.client_messages enable row level security;

drop policy if exists "client reads own messages"   on public.client_messages;
drop policy if exists "client inserts own messages" on public.client_messages;
drop policy if exists "client updates own messages" on public.client_messages;
drop policy if exists "admin manages messages"      on public.client_messages;

-- Client read: only their own conversation.
create policy "client reads own messages"
  on public.client_messages for select
  to authenticated
  using (client_id = auth.uid());

-- Client insert: only as themselves and only into their own conversation.
create policy "client inserts own messages"
  on public.client_messages for insert
  to authenticated
  with check (
    client_id = auth.uid()
    and sender = 'client'
  );

-- Client update: only flipping is_read on messages addressed to them. Cannot
-- change `message`, `client_id`, or `sender` from this policy.
create policy "client updates own messages"
  on public.client_messages for update
  to authenticated
  using (client_id = auth.uid())
  with check (
    client_id = auth.uid()
    and sender = (
      select cm.sender from public.client_messages cm where cm.id = client_messages.id
    )
    and message = (
      select cm.message from public.client_messages cm where cm.id = client_messages.id
    )
  );

-- Admin: full access (read, insert as 'team', update, delete).
create policy "admin manages messages"
  on public.client_messages for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Realtime: ensure the table is part of the supabase_realtime publication so
-- INSERT events fan out to subscribed clients. Idempotent — alter publication
-- silently no-ops when the table is already a member.
do $$
begin
  perform 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'client_messages';
  if not found then
    execute 'alter publication supabase_realtime add table public.client_messages';
  end if;
end$$;
