-- ============================================================================
-- Guest request tracking without OTP/email verification
--
-- Security model:
--   * No public SELECT/UPDATE/DELETE policies are added.
--   * Anonymous guests use SECURITY DEFINER RPCs that return only safe fields.
--   * Access is possession-based: invoice_number + long random tracking key.
--   * The plaintext tracking key is returned once and only its SHA-256 hash is
--     stored on pricing_requests.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

alter table public.pricing_requests
  add column if not exists guest_tracking_hash text,
  add column if not exists guest_tracking_created_at timestamptz,
  add column if not exists guest_tracking_last_used_at timestamptz,
  add column if not exists guest_tracking_revoked_at timestamptz,
  add column if not exists guest_last_accessed_at timestamptz;

create unique index if not exists pricing_requests_guest_tracking_hash_key
  on public.pricing_requests(guest_tracking_hash)
  where guest_tracking_hash is not null;

create index if not exists idx_pricing_requests_guest_tracking_lookup
  on public.pricing_requests(invoice_number, guest_tracking_hash)
  where guest_tracking_hash is not null and guest_tracking_revoked_at is null;

create index if not exists idx_pricing_requests_guest_last_accessed
  on public.pricing_requests(guest_last_accessed_at)
  where guest_last_accessed_at is not null;

create or replace function public.normalize_guest_email(p_email text)
returns text
language sql
immutable
returns null on null input
as $$
  select nullif(lower(btrim(p_email)), '')
$$;

create or replace function public.normalize_guest_phone(p_phone text)
returns text
language sql
immutable
returns null on null input
as $$
  select nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '')
$$;

create or replace function public.hash_guest_tracking_key(p_tracking_key text)
returns text
language sql
immutable
returns null on null input
as $$
  select encode(extensions.digest(convert_to(p_tracking_key, 'UTF8'), 'sha256'), 'hex')
$$;

create or replace function public.generate_guest_tracking_key()
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_hex text;
begin
  v_hex := upper(encode(extensions.gen_random_bytes(20), 'hex'));
  return 'LMS-GUEST-'
    || substr(v_hex, 1, 8) || '-'
    || substr(v_hex, 9, 8) || '-'
    || substr(v_hex, 17, 8) || '-'
    || substr(v_hex, 25, 8) || '-'
    || substr(v_hex, 33, 8);
end;
$$;

create or replace function public.guest_contact_is_taken(
  p_guest_email text,
  p_guest_phone text,
  p_exclude_request_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := public.normalize_guest_email(p_guest_email);
  v_phone text := public.normalize_guest_phone(p_guest_phone);
begin
  if v_email is null and v_phone is null then
    return false;
  end if;

  if exists (
    select 1
    from public.clients c
    where
      (v_email is not null and public.normalize_guest_email(c.email) = v_email)
      or (
        v_phone is not null and (
          public.normalize_guest_phone(c.phone) = v_phone
          or public.normalize_guest_phone(c.phone_number) = v_phone
        )
      )
    limit 1
  ) then
    return true;
  end if;

  if exists (
    select 1
    from public.pricing_requests pr
    where (p_exclude_request_id is null or pr.id <> p_exclude_request_id)
      and (
        (v_email is not null and public.normalize_guest_email(pr.guest_email) = v_email)
        or (v_phone is not null and public.normalize_guest_phone(pr.guest_phone) = v_phone)
      )
    limit 1
  ) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.guest_pricing_request_safe_json(p_request public.pricing_requests)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'invoice_number', p_request.invoice_number,
    'status', p_request.status,
    'request_type', p_request.request_type,
    'package_name', p_request.package_name,
    'selected_services', coalesce(p_request.selected_services, '[]'::jsonb),
    'estimated_subtotal', p_request.estimated_subtotal,
    'discount_breakdown', coalesce(p_request.discount_breakdown, '{}'::jsonb),
    'applied_promo_code', p_request.applied_promo_code,
    'estimated_total', p_request.estimated_total,
    'price_currency', p_request.price_currency,
    'guest_name', p_request.guest_name,
    'guest_phone', p_request.guest_phone,
    'guest_email', p_request.guest_email,
    'company_name', p_request.company_name,
    'request_notes', p_request.request_notes,
    'status_history', coalesce(p_request.status_history, '[]'::jsonb),
    'created_at', p_request.created_at,
    'updated_at', p_request.updated_at,
    'guest_tracking_created_at', p_request.guest_tracking_created_at,
    'guest_tracking_last_used_at', p_request.guest_tracking_last_used_at,
    'guest_last_accessed_at', p_request.guest_last_accessed_at,
    'can_edit', p_request.status in ('new'::public.request_status_enum, 'reviewing'::public.request_status_enum),
    'next_step',
      case p_request.status
        when 'new'::public.request_status_enum then 'Lumos will review the request scope.'
        when 'reviewing'::public.request_status_enum then 'The Lumos team is reviewing the request.'
        when 'approved'::public.request_status_enum then 'This request is approved. Contact Lumos for changes.'
        when 'converted'::public.request_status_enum then 'This request has been converted to a project.'
        when 'rejected'::public.request_status_enum then 'This request needs revision from Lumos.'
        when 'cancelled'::public.request_status_enum then 'This request was cancelled.'
        else 'Contact Lumos for the next step.'
      end
  )
$$;

create or replace function public.check_guest_contact_available(
  p_guest_email text default null,
  p_guest_phone text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if public.guest_contact_is_taken(p_guest_email, p_guest_phone, null) then
    return jsonb_build_object(
      'available', false,
      'error', 'duplicate_contact',
      'message', 'These details are already connected to a previous request or account.'
    );
  end if;

  return jsonb_build_object('available', true);
end;
$$;

create or replace function public.create_guest_pricing_request(p_request jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_request public.pricing_requests;
  v_tracking_key text;
  v_tracking_hash text;
  v_request_type public.request_type_enum;
  v_guest_name text := nullif(btrim(coalesce(p_request->'guest_contact'->>'name', p_request->>'guest_name', '')), '');
  v_guest_phone text := nullif(btrim(coalesce(p_request->'guest_contact'->>'phone', p_request->>'guest_phone', '')), '');
  v_guest_email text := public.normalize_guest_email(coalesce(p_request->'guest_contact'->>'email', p_request->>'guest_email'));
  v_company_name text := nullif(btrim(coalesce(p_request->>'company_name', '')), '');
  v_package_name text := nullif(btrim(coalesce(p_request->>'package_name', '')), '');
  v_selected_services jsonb := coalesce(p_request->'selected_services', '[]'::jsonb);
  v_discount_breakdown jsonb := coalesce(
    p_request->'discount_breakdown',
    '{"base_discount": 0, "promo_discount": 0, "reward_discount": 0, "total_discount_percent": 0}'::jsonb
  );
  v_estimated_subtotal numeric := greatest(coalesce((p_request->>'estimated_subtotal')::numeric, 0), 0);
  v_estimated_total numeric := greatest(coalesce((p_request->>'estimated_total')::numeric, 0), 0);
begin
  if coalesce(p_request->>'request_type', 'package') = 'custom' then
    v_request_type := 'custom'::public.request_type_enum;
  else
    v_request_type := 'package'::public.request_type_enum;
  end if;

  if v_guest_name is null or v_guest_phone is null then
    return jsonb_build_object('success', false, 'error', 'missing_guest_contact');
  end if;

  if public.guest_contact_is_taken(v_guest_email, v_guest_phone, null) then
    return jsonb_build_object(
      'success', false,
      'error', 'duplicate_contact',
      'message', 'These details are already connected to a previous request or account.'
    );
  end if;

  loop
    v_tracking_key := public.generate_guest_tracking_key();
    v_tracking_hash := public.hash_guest_tracking_key(v_tracking_key);
    exit when not exists (
      select 1 from public.pricing_requests
      where guest_tracking_hash = v_tracking_hash
    );
  end loop;

  insert into public.pricing_requests (
    client_id,
    request_type,
    status,
    priority,
    request_source,
    package_id,
    package_name,
    selected_services,
    estimated_subtotal,
    estimated_total,
    price_currency,
    discount_breakdown,
    applied_promo_code,
    guest_name,
    guest_phone,
    guest_email,
    company_name,
    request_notes,
    location_url,
    status_history,
    guest_tracking_hash,
    guest_tracking_created_at,
    created_at,
    updated_at
  )
  values (
    null,
    v_request_type,
    'new'::public.request_status_enum,
    'medium'::public.request_priority_enum,
    'guest_pricing_modal',
    nullif(btrim(coalesce(p_request->>'package_id', '')), ''),
    v_package_name,
    v_selected_services,
    v_estimated_subtotal,
    v_estimated_total,
    upper(nullif(btrim(coalesce(p_request->>'price_currency', 'EGP')), '')),
    v_discount_breakdown,
    nullif(upper(btrim(coalesce(p_request->>'applied_promo_code', ''))), ''),
    v_guest_name,
    v_guest_phone,
    v_guest_email,
    v_company_name,
    nullif(btrim(coalesce(p_request->>'request_notes', '')), ''),
    nullif(btrim(coalesce(p_request->>'location_url', '')), ''),
    jsonb_build_array(jsonb_build_object(
      'status', 'new',
      'changed_at', v_now,
      'changed_by', null,
      'changed_by_type', 'guest',
      'note', 'Guest request submitted'
    )),
    v_tracking_hash,
    v_now,
    v_now,
    v_now
  )
  returning * into v_request;

  return jsonb_build_object(
    'success', true,
    'tracking_key', v_tracking_key,
    'request', public.guest_pricing_request_safe_json(v_request)
  );
end;
$$;

create or replace function public.verify_guest_tracking(
  p_invoice_number text,
  p_tracking_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.pricing_requests;
  v_hash text;
begin
  if nullif(btrim(coalesce(p_invoice_number, '')), '') is null
    or nullif(btrim(coalesce(p_tracking_key, '')), '') is null then
    return jsonb_build_object('success', false, 'error', 'invalid_tracking_credentials');
  end if;

  v_hash := public.hash_guest_tracking_key(btrim(p_tracking_key));

  select *
  into v_request
  from public.pricing_requests
  where invoice_number = btrim(p_invoice_number)
    and guest_tracking_hash = v_hash
    and guest_tracking_revoked_at is null
  limit 1;

  if v_request.id is null then
    return jsonb_build_object('success', false, 'error', 'invalid_tracking_credentials');
  end if;

  update public.pricing_requests
  set guest_tracking_last_used_at = now(),
      guest_last_accessed_at = now(),
      updated_at = updated_at
  where id = v_request.id
  returning * into v_request;

  return jsonb_build_object(
    'success', true,
    'request', public.guest_pricing_request_safe_json(v_request)
  );
end;
$$;

create or replace function public.notify_admins_guest_request_change(
  p_request public.pricing_requests,
  p_title text,
  p_title_ar text,
  p_message text,
  p_message_ar text,
  p_priority text default 'normal'
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if to_regclass('public.notifications') is null then
    return;
  end if;

  insert into public.notifications (
    user_id,
    user_type,
    type,
    title,
    title_ar,
    message,
    message_ar,
    action_type,
    action_id,
    action_url,
    priority
  )
  select
    c.id,
    'admin',
    'pricing_request_status_changed',
    p_title,
    p_title_ar,
    p_message,
    p_message_ar,
    'pricing_request',
    p_request.id::text,
    '/lumos-admin?section=requests',
    p_priority
  from public.clients c
  where c.role = 'admin';
end;
$$;

create or replace function public.guest_update_request(
  p_invoice_number text,
  p_tracking_key text,
  p_updates jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.pricing_requests;
  v_hash text;
  v_now timestamptz := now();
  v_action text := lower(coalesce(p_updates->>'action', 'update'));
  v_next_name text;
  v_next_phone text;
  v_next_email text;
  v_next_notes text;
  v_changed_fields text[] := array[]::text[];
  v_history_note text;
begin
  if nullif(btrim(coalesce(p_invoice_number, '')), '') is null
    or nullif(btrim(coalesce(p_tracking_key, '')), '') is null then
    return jsonb_build_object('success', false, 'error', 'invalid_tracking_credentials');
  end if;

  v_hash := public.hash_guest_tracking_key(btrim(p_tracking_key));

  select *
  into v_request
  from public.pricing_requests
  where invoice_number = btrim(p_invoice_number)
    and guest_tracking_hash = v_hash
    and guest_tracking_revoked_at is null
  limit 1;

  if v_request.id is null then
    return jsonb_build_object('success', false, 'error', 'invalid_tracking_credentials');
  end if;

  if v_request.status not in ('new'::public.request_status_enum, 'reviewing'::public.request_status_enum) then
    return jsonb_build_object(
      'success', false,
      'error', 'request_read_only',
      'request', public.guest_pricing_request_safe_json(v_request)
    );
  end if;

  if v_action = 'cancel' then
    update public.pricing_requests
    set status = 'cancelled'::public.request_status_enum,
        status_history = coalesce(status_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'status', 'cancelled',
          'changed_at', v_now,
          'changed_by', null,
          'changed_by_type', 'guest',
          'note', 'Guest cancelled request'
        )),
        guest_tracking_last_used_at = v_now,
        guest_last_accessed_at = v_now,
        updated_at = v_now
    where id = v_request.id
    returning * into v_request;

    perform public.notify_admins_guest_request_change(
      v_request,
      'Guest request cancelled',
      'تم إلغاء طلب زائر',
      'A guest cancelled pricing request ' || coalesce(v_request.invoice_number, v_request.id::text) || '.',
      'قام زائر بإلغاء طلب التسعير.',
      'high'
    );

    return jsonb_build_object(
      'success', true,
      'request', public.guest_pricing_request_safe_json(v_request)
    );
  end if;

  v_next_name := case
    when p_updates ? 'guest_name' then nullif(btrim(coalesce(p_updates->>'guest_name', '')), '')
    else v_request.guest_name
  end;
  v_next_phone := case
    when p_updates ? 'guest_phone' then nullif(btrim(coalesce(p_updates->>'guest_phone', '')), '')
    else v_request.guest_phone
  end;
  v_next_email := case
    when p_updates ? 'guest_email' then public.normalize_guest_email(p_updates->>'guest_email')
    else v_request.guest_email
  end;
  v_next_notes := case
    when p_updates ? 'request_notes' then nullif(btrim(coalesce(p_updates->>'request_notes', '')), '')
    when p_updates ? 'notes' then nullif(btrim(coalesce(p_updates->>'notes', '')), '')
    else v_request.request_notes
  end;

  if v_next_name is distinct from v_request.guest_name then
    v_changed_fields := array_append(v_changed_fields, 'guest_name');
  end if;
  if v_next_phone is distinct from v_request.guest_phone then
    v_changed_fields := array_append(v_changed_fields, 'guest_phone');
  end if;
  if v_next_email is distinct from v_request.guest_email then
    v_changed_fields := array_append(v_changed_fields, 'guest_email');
  end if;
  if v_next_notes is distinct from v_request.request_notes then
    v_changed_fields := array_append(v_changed_fields, 'request_notes');
  end if;

  if array_length(v_changed_fields, 1) is null then
    update public.pricing_requests
    set guest_tracking_last_used_at = v_now,
        guest_last_accessed_at = v_now
    where id = v_request.id
    returning * into v_request;

    return jsonb_build_object(
      'success', true,
      'request', public.guest_pricing_request_safe_json(v_request)
    );
  end if;

  if public.guest_contact_is_taken(v_next_email, v_next_phone, v_request.id) then
    return jsonb_build_object(
      'success', false,
      'error', 'duplicate_contact',
      'request', public.guest_pricing_request_safe_json(v_request)
    );
  end if;

  v_history_note := 'Guest updated: ' || array_to_string(v_changed_fields, ', ');

  update public.pricing_requests
  set guest_name = v_next_name,
      guest_phone = v_next_phone,
      guest_email = v_next_email,
      request_notes = v_next_notes,
      edit_count = coalesce(edit_count, 0) + 1,
      status_history = coalesce(status_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'status', status::text,
        'changed_at', v_now,
        'changed_by', null,
        'changed_by_type', 'guest',
        'note', v_history_note
      )),
      guest_tracking_last_used_at = v_now,
      guest_last_accessed_at = v_now,
      updated_at = v_now
  where id = v_request.id
  returning * into v_request;

  perform public.notify_admins_guest_request_change(
    v_request,
    'Guest request updated',
    'تم تحديث طلب زائر',
    'A guest updated pricing request ' || coalesce(v_request.invoice_number, v_request.id::text) || '.',
    'قام زائر بتحديث بيانات طلب التسعير.',
    'normal'
  );

  return jsonb_build_object(
    'success', true,
    'request', public.guest_pricing_request_safe_json(v_request)
  );
end;
$$;

revoke all on function public.normalize_guest_email(text) from public, anon, authenticated;
revoke all on function public.normalize_guest_phone(text) from public, anon, authenticated;
revoke all on function public.hash_guest_tracking_key(text) from public, anon, authenticated;
revoke all on function public.generate_guest_tracking_key() from public, anon, authenticated;
revoke all on function public.guest_contact_is_taken(text, text, uuid) from public, anon, authenticated;
revoke all on function public.guest_pricing_request_safe_json(public.pricing_requests) from public, anon, authenticated;
revoke all on function public.notify_admins_guest_request_change(public.pricing_requests, text, text, text, text, text) from public, anon, authenticated;

revoke all on function public.check_guest_contact_available(text, text) from public, anon, authenticated;
revoke all on function public.create_guest_pricing_request(jsonb) from public, anon, authenticated;
revoke all on function public.verify_guest_tracking(text, text) from public, anon, authenticated;
revoke all on function public.guest_update_request(text, text, jsonb) from public, anon, authenticated;

grant execute on function public.check_guest_contact_available(text, text) to anon, authenticated;
grant execute on function public.create_guest_pricing_request(jsonb) to anon, authenticated;
grant execute on function public.verify_guest_tracking(text, text) to anon, authenticated;
grant execute on function public.guest_update_request(text, text, jsonb) to anon, authenticated;
