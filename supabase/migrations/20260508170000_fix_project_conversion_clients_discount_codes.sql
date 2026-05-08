-- Focused fixes for project conversion verification and safe discount validation.
-- This migration does not add broad public table access.

alter table public.discount_codes
  add column if not exists applicable_packages text[] not null default '{}',
  add column if not exists applicable_services text[] not null default '{}';

create index if not exists discount_codes_code_upper_idx
  on public.discount_codes (upper(trim(code)));

create or replace function public.validate_discount_code(
  p_code text,
  p_subtotal numeric default 0,
  p_package_id text default null,
  p_service_ids text[] default '{}',
  p_service_categories text[] default '{}'
)
returns table (
  success boolean,
  error text,
  id uuid,
  code text,
  description text,
  discount_type text,
  discount_value numeric,
  max_discount numeric,
  discount_amount numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code jsonb;
  v_now timestamptz := now();
  v_subtotal numeric := greatest(coalesce(p_subtotal, 0), 0);
  v_discount_type text;
  v_discount_value numeric;
  v_max_discount numeric;
  v_min_order numeric;
  v_usage_limit int;
  v_usage_count int;
  v_valid_from timestamptz;
  v_valid_until timestamptz;
  v_discount_amount numeric := 0;
  v_packages text[] := '{}';
  v_services text[] := '{}';
  v_categories text[] := '{}';
begin
  if nullif(trim(coalesce(p_code, '')), '') is null then
    return query select false, 'empty', null::uuid, null::text, null::text, null::text, null::numeric, null::numeric, 0::numeric;
    return;
  end if;

  select to_jsonb(dc)
    into v_code
    from public.discount_codes dc
   where upper(trim(dc.code)) = upper(trim(p_code))
   order by dc.created_at desc nulls last
   limit 1;

  if v_code is null then
    return query select false, 'invalid', null::uuid, null::text, null::text, null::text, null::numeric, null::numeric, 0::numeric;
    return;
  end if;

  if coalesce((v_code->>'is_active')::boolean, false) is not true then
    return query select false, 'inactive', null::uuid, v_code->>'code', null::text, null::text, null::numeric, null::numeric, 0::numeric;
    return;
  end if;

  v_valid_from := nullif(v_code->>'valid_from', '')::timestamptz;
  v_valid_until := nullif(v_code->>'valid_until', '')::timestamptz;
  if v_valid_from is not null and v_now < v_valid_from then
    return query select false, 'not_started', null::uuid, v_code->>'code', null::text, null::text, null::numeric, null::numeric, 0::numeric;
    return;
  end if;
  if v_valid_until is not null and v_now > v_valid_until then
    return query select false, 'expired', null::uuid, v_code->>'code', null::text, null::text, null::numeric, null::numeric, 0::numeric;
    return;
  end if;

  v_usage_limit := nullif(v_code->>'usage_limit', '')::int;
  v_usage_count := coalesce(nullif(v_code->>'usage_count', '')::int, 0);
  if v_usage_limit is not null and v_usage_count >= v_usage_limit then
    return query select false, 'usage_limit_reached', null::uuid, v_code->>'code', null::text, null::text, null::numeric, null::numeric, 0::numeric;
    return;
  end if;

  v_min_order := coalesce(nullif(v_code->>'min_order_value', '')::numeric, 0);
  if v_subtotal <= 0 then
    return query select false, 'not_applicable', null::uuid, v_code->>'code', null::text, null::text, null::numeric, null::numeric, 0::numeric;
    return;
  end if;
  if v_min_order > 0 and v_subtotal < v_min_order then
    return query select false, 'not_applicable', null::uuid, v_code->>'code', null::text, null::text, null::numeric, null::numeric, 0::numeric;
    return;
  end if;

  if jsonb_typeof(coalesce(v_code->'applicable_packages', '[]'::jsonb)) = 'array' then
    select coalesce(array_agg(value), '{}') into v_packages
      from jsonb_array_elements_text(coalesce(v_code->'applicable_packages', '[]'::jsonb));
  end if;
  if array_length(v_packages, 1) is not null and coalesce(p_package_id, '') <> all(v_packages) then
    return query select false, 'not_applicable', null::uuid, v_code->>'code', null::text, null::text, null::numeric, null::numeric, 0::numeric;
    return;
  end if;

  if jsonb_typeof(coalesce(v_code->'applicable_services', '[]'::jsonb)) = 'array' then
    select coalesce(array_agg(value), '{}') into v_services
      from jsonb_array_elements_text(coalesce(v_code->'applicable_services', '[]'::jsonb));
  end if;
  if array_length(v_services, 1) is not null and not (coalesce(p_service_ids, '{}') && v_services) then
    return query select false, 'not_applicable', null::uuid, v_code->>'code', null::text, null::text, null::numeric, null::numeric, 0::numeric;
    return;
  end if;

  if jsonb_typeof(coalesce(v_code->'applicable_categories', '[]'::jsonb)) = 'array' then
    select coalesce(array_agg(value), '{}') into v_categories
      from jsonb_array_elements_text(coalesce(v_code->'applicable_categories', '[]'::jsonb));
  end if;
  if array_length(v_categories, 1) is not null and not (coalesce(p_service_categories, '{}') && v_categories) then
    return query select false, 'not_applicable', null::uuid, v_code->>'code', null::text, null::text, null::numeric, null::numeric, 0::numeric;
    return;
  end if;

  v_discount_type := coalesce(nullif(v_code->>'discount_type', ''), 'percentage');
  v_discount_value := greatest(coalesce(nullif(v_code->>'discount_value', '')::numeric, 0), 0);
  v_max_discount := nullif(v_code->>'max_discount', '')::numeric;

  if v_discount_type = 'percentage' then
    v_discount_amount := v_subtotal * (v_discount_value / 100);
  elsif v_discount_type = 'fixed' then
    v_discount_amount := v_discount_value;
  else
    return query select false, 'invalid', null::uuid, v_code->>'code', null::text, null::text, null::numeric, null::numeric, 0::numeric;
    return;
  end if;

  if v_max_discount is not null then
    v_discount_amount := least(v_discount_amount, v_max_discount);
  end if;
  v_discount_amount := least(greatest(v_discount_amount, 0), v_subtotal);

  return query select
    true,
    null::text,
    (v_code->>'id')::uuid,
    v_code->>'code',
    v_code->>'description',
    v_discount_type,
    v_discount_value,
    v_max_discount,
    v_discount_amount;
end;
$$;

revoke all on function public.validate_discount_code(text, numeric, text, text[], text[]) from public;
grant execute on function public.validate_discount_code(text, numeric, text, text[], text[]) to anon, authenticated;
