-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260507140000_pricing_request_invoice_number.sql
--
-- Add a stable, human-readable invoice number to pricing_requests so admins
-- and clients can refer to a request by `LUMOS-2026-0001` instead of a UUID.
--
-- Format: `LUMOS-<year>-<padded-sequence>` where the sequence resets each year
-- via a per-year counter. The trigger only assigns a number when the row is
-- inserted without one, so manual back-fills won't be overwritten.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.pricing_requests
  add column if not exists invoice_number text;

create unique index if not exists pricing_requests_invoice_number_key
  on public.pricing_requests(invoice_number)
  where invoice_number is not null;

-- Per-year counters (concurrency-safe via row-level lock).
create table if not exists public.invoice_counters (
  year int primary key,
  next_value int not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.invoice_counters enable row level security;

drop policy if exists "admin reads invoice_counters" on public.invoice_counters;
create policy "admin reads invoice_counters"
  on public.invoice_counters for select
  to authenticated
  using (public.is_admin());

-- No client/anon access. The trigger uses SECURITY DEFINER below so the table
-- doesn't need a permissive write policy.

create or replace function public.next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year int := extract(year from now());
  seq int;
begin
  -- Lock or create the counter row for this year.
  insert into public.invoice_counters(year, next_value)
    values (current_year, 1)
  on conflict (year) do update set next_value = invoice_counters.next_value
  returning next_value into seq;

  -- Increment the counter for the next caller.
  update public.invoice_counters
    set next_value = seq + 1, updated_at = now()
    where year = current_year;

  return 'LUMOS-' || current_year::text || '-' || lpad(seq::text, 4, '0');
end;
$$;

revoke all on function public.next_invoice_number() from public, anon, authenticated;
grant execute on function public.next_invoice_number() to authenticated;

create or replace function public.assign_pricing_request_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := public.next_invoice_number();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pricing_requests_invoice_number on public.pricing_requests;
create trigger trg_pricing_requests_invoice_number
  before insert on public.pricing_requests
  for each row execute function public.assign_pricing_request_invoice();

-- Backfill existing rows without an invoice number, ordered by created_at so
-- the historic numbering is stable.
do $$
declare
  r record;
begin
  for r in
    select id from public.pricing_requests
      where invoice_number is null
      order by created_at asc
  loop
    update public.pricing_requests
      set invoice_number = public.next_invoice_number()
      where id = r.id;
  end loop;
end$$;

-- Verification:
--   select id, invoice_number, created_at from public.pricing_requests
--     order by created_at asc limit 5;
