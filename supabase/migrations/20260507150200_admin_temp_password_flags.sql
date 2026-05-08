-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260507150200_admin_temp_password_flags.sql
--
-- Support the secure "admin sets temporary client password" flow.
--
-- This migration adds only metadata flags to public.clients. It does NOT store
-- plaintext passwords, password hashes, or temporary credentials. Actual Auth
-- password changes must happen through the admin-set-client-password Edge
-- Function with the service role key kept server-side only.
-- ═══════════════════════════════════════════════════════════════════════════════

begin;

alter table public.clients
  add column if not exists password_must_change boolean not null default false;

alter table public.clients
  add column if not exists password_updated_by_admin_at timestamptz;

alter table public.clients
  add column if not exists password_updated_by_admin_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'auth_password_pending'
  ) then
    alter table public.clients
      add column auth_password_pending boolean not null default false;
  else
    update public.clients
    set auth_password_pending = false
    where auth_password_pending is null;

    alter table public.clients
      alter column auth_password_pending set not null;
  end if;
end $$;

create index if not exists idx_clients_password_must_change
  on public.clients(password_must_change)
  where password_must_change is true;

create index if not exists idx_clients_password_updated_by_admin_by
  on public.clients(password_updated_by_admin_by);

comment on column public.clients.password_must_change is
'True when a client must change their password after an admin-set temporary password. Never stores the password.';

comment on column public.clients.password_updated_by_admin_at is
'Timestamp of the last admin temporary-password set action. No password value is stored.';

comment on column public.clients.password_updated_by_admin_by is
'Auth user id of the admin who last set a temporary password for this client.';

comment on column public.clients.auth_password_pending is
'Tracks whether a client still needs an initial Auth password setup. Does not store password material.';

commit;
