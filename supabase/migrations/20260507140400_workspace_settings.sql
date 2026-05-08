-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260507140400_workspace_settings.sql
--
-- Single-row settings table for agency-wide preferences (currency, timezone,
-- default language, notification toggles, request workflow defaults, portal
-- toggles). The frontend reads/writes the only row via id = 1.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.workspace_settings (
  id smallint primary key default 1 check (id = 1),
  agency_name text default 'Lumos Studio',
  default_currency text default 'EGP',
  timezone text default 'Africa/Cairo',
  default_language text default 'en' check (default_language in ('en', 'ar')),
  date_format text default 'YYYY-MM-DD',
  default_dashboard_view text default 'overview',
  notify_email_on_request boolean default true,
  notify_email_on_message boolean default true,
  notify_email_on_file boolean default false,
  notify_email_on_admin_activity boolean default false,
  default_request_status text default 'new',
  default_priority text default 'medium',
  follow_up_days int default 3,
  allow_client_uploads boolean default true,
  allow_client_messages boolean default true,
  require_profile_completion boolean default false,
  default_profile_visibility text default 'private' check (default_profile_visibility in ('private', 'team', 'public')),
  allowed_file_types text default 'image/*,application/pdf,text/*',
  max_upload_mb int default 25,
  default_file_categories jsonb default '["brand","designs","contracts","invoices","general"]'::jsonb,
  updated_at timestamptz default now(),
  updated_by uuid
);

-- Seed the singleton row so the UI can always read/update it.
insert into public.workspace_settings (id) values (1)
  on conflict (id) do nothing;

alter table public.workspace_settings enable row level security;

drop policy if exists "anyone reads workspace settings"  on public.workspace_settings;
drop policy if exists "admin updates workspace settings" on public.workspace_settings;

-- Settings drive the public site (currency display, language default, etc.)
-- so authenticated reads are fine. Anonymous readers don't need it; gate to
-- authenticated to limit fingerprinting.
create policy "anyone reads workspace settings"
  on public.workspace_settings for select
  to authenticated
  using (true);

create policy "admin updates workspace settings"
  on public.workspace_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
