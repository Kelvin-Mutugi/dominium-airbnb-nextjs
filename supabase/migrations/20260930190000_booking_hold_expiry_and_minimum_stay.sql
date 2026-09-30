alter table public.bookings
  add column if not exists hold_expires_at timestamptz,
  add column if not exists guest_confirmation_token_hash text;

update public.bookings
   set hold_expires_at = now() + interval '10 minutes'
 where status = 'pending'
   and hold_expires_at is null;

create index if not exists bookings_pending_hold_expiry_idx
  on public.bookings (hold_expires_at)
  where status = 'pending';

do $$
begin
  if exists (
    select 1 from public.bookings
     where idempotency_key is not null
     group by idempotency_key
    having count(*) > 1
  ) then
    raise exception 'Duplicate booking idempotency keys exist; resolve them before applying this migration.';
  end if;
end;
$$;

create unique index if not exists bookings_idempotency_key_uidx
  on public.bookings (idempotency_key)
  where idempotency_key is not null;

create table if not exists public.paystack_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  idempotency_key text not null unique,
  reference text not null unique,
  method text not null check (method in ('mpesa', 'card')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'KES' check (currency = 'KES'),
  status text not null default 'initializing'
    check (status in ('initializing', 'pending', 'paid', 'failed', 'abandoned', 'late_success')),
  access_code text,
  authorization_url text,
  paystack_transaction_id bigint,
  payment_channel text,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists paystack_payment_attempts_booking_created_idx
  on public.paystack_payment_attempts (booking_id, created_at desc);

create unique index if not exists paystack_payment_attempts_active_booking_uidx
  on public.paystack_payment_attempts (booking_id)
  where status in ('initializing', 'pending');

alter table public.paystack_payment_attempts enable row level security;
revoke all on public.paystack_payment_attempts from public, anon, authenticated;
grant all on public.paystack_payment_attempts to service_role;

create or replace function public.expire_pending_booking_holds()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  expired_booking_ids uuid[];
begin
  with expired as (
    update public.bookings
       set status = 'cancelled'
     where status = 'pending'
       and hold_expires_at <= now()
     returning id
  )
  select coalesce(array_agg(id), '{}'::uuid[])
    into expired_booking_ids
    from expired;

  if cardinality(expired_booking_ids) > 0 then
    update public.payments
       set status = 'failed'
     where booking_id = any(expired_booking_ids)
       and status = 'pending';

    update public.paystack_payment_attempts
       set status = 'abandoned', updated_at = now()
     where booking_id = any(expired_booking_ids)
       and status in ('initializing', 'pending');
  end if;
end;
$$;

revoke all on function public.expire_pending_booking_holds() from public, anon, authenticated;
grant execute on function public.expire_pending_booking_holds() to service_role;

drop function if exists public.create_guest_booking(uuid, date, date, integer, integer, integer, text, text, text, text, text, text);
drop function if exists public.create_booking(uuid, date, date, integer, text, text);

create or replace function public.create_booking_hold(
  p_listing_id uuid,
  p_guest_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_guest_country text,
  p_special_requests text,
  p_payment_method text,
  p_idempotency_key text,
  p_confirmation_token_hash text,
  p_subtotal numeric,
  p_service_fee numeric,
  p_additional_fees numeric,
  p_total numeric
)
returns table (
  id uuid,
  status text,
  total_amount numeric,
  commission_amount numeric,
  host_payout_amount numeric,
  booking_reference text,
  hold_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  listing_row record;
  existing_row public.bookings%rowtype;
  booking_id uuid;
  hold_deadline timestamptz := now() + interval '10 minutes';
begin
  if nullif(trim(p_idempotency_key), '') is null then raise exception 'MISSING_IDEMPOTENCY_KEY'; end if;
  if p_payment_method not in ('mpesa', 'card') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if p_check_out <= p_check_in or p_check_in < current_date then raise exception 'INVALID_DATES'; end if;
  if p_guests < 1 then raise exception 'INVALID_GUESTS'; end if;
  if nullif(trim(p_guest_name), '') is null or nullif(trim(p_guest_email), '') is null or nullif(trim(p_guest_phone), '') is null then
    raise exception 'INVALID_GUEST_DETAILS';
  end if;
  if p_subtotal < 0 or p_service_fee < 0 or p_additional_fees < 0 or p_total <= 0
     or round(p_subtotal + p_service_fee + p_additional_fees, 2) <> round(p_total, 2) then
    raise exception 'INVALID_BOOKING_PRICE';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 1));
  select b.* into existing_row
    from public.bookings b
   where b.idempotency_key = p_idempotency_key
   for update;
  if found then
    if existing_row.listing_id <> p_listing_id
       or existing_row.check_in <> p_check_in
       or existing_row.check_out <> p_check_out
       or existing_row.guest_id is distinct from p_guest_id
       or existing_row.guest_email <> lower(trim(p_guest_email))
       or existing_row.guest_confirmation_token_hash is distinct from p_confirmation_token_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return query select existing_row.id, existing_row.status::text,
      existing_row.total_amount::numeric, existing_row.commission_amount::numeric,
      existing_row.host_payout_amount::numeric, existing_row.booking_reference,
      existing_row.hold_expires_at;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_listing_id::text, 0));
  update public.bookings b
     set status = 'cancelled'
   where b.listing_id = p_listing_id
     and b.status = 'pending'
     and b.hold_expires_at <= now();
  update public.payments p
     set status = 'failed'
   where p.booking_id in (
     select b.id from public.bookings b
      where b.listing_id = p_listing_id and b.status = 'cancelled'
        and b.hold_expires_at <= now()
   ) and p.status = 'pending';

  select l.id, l.host_id, l.max_guests, l.min_nights, l.status
    into listing_row
    from public.listings l
   where l.id = p_listing_id;
  if not found or listing_row.status <> 'published' then raise exception 'LISTING_UNAVAILABLE'; end if;
  if p_guests > listing_row.max_guests then raise exception 'TOO_MANY_GUESTS'; end if;
  if p_check_out - p_check_in < greatest(coalesce(listing_row.min_nights, 1), 1) then
    raise exception 'MINIMUM_STAY_NOT_MET';
  end if;
  if exists (
    select 1 from public.bookings b
     where b.listing_id = p_listing_id
       and (b.status = 'confirmed' or (b.status = 'pending' and b.hold_expires_at > now()))
       and daterange(b.check_in, b.check_out, '[)') && daterange(p_check_in, p_check_out, '[)')
  ) then raise exception 'DATES_UNAVAILABLE'; end if;

  insert into public.bookings (
    listing_id, guest_id, host_id, check_in, check_out, guests_count, status,
    total_amount, commission_amount, host_payout_amount, idempotency_key,
    guest_name, guest_email, guest_phone, guest_country, children_count,
    rooms_count, special_requests, terms_agreed_at, hold_expires_at,
    guest_confirmation_token_hash
  ) values (
    p_listing_id, p_guest_id, listing_row.host_id, p_check_in, p_check_out,
    p_guests, 'pending', p_total, p_service_fee, p_subtotal + p_additional_fees,
    p_idempotency_key, trim(p_guest_name), lower(trim(p_guest_email)),
    trim(p_guest_phone), nullif(trim(p_guest_country), ''), 0, 1,
    nullif(trim(p_special_requests), ''), now(), hold_deadline,
    p_confirmation_token_hash
  ) returning bookings.id into booking_id;

  insert into public.payments (booking_id, amount, method, status)
  values (booking_id, p_total, p_payment_method::public.payment_method, 'pending');

  return query select b.id, b.status::text, b.total_amount::numeric,
    b.commission_amount::numeric, b.host_payout_amount::numeric,
    b.booking_reference, b.hold_expires_at
    from public.bookings b where b.id = booking_id;
end;
$$;

revoke all on function public.create_booking_hold(uuid, uuid, date, date, integer, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric) from public, anon, authenticated;
grant execute on function public.create_booking_hold(uuid, uuid, date, date, integer, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric) to service_role;

create or replace function public.settle_paystack_attempt(
  p_reference text,
  p_amount_minor bigint,
  p_currency text,
  p_transaction_id bigint,
  p_channel text,
  p_paid_at timestamptz,
  p_raw_response jsonb
)
returns table (booking_id uuid, payment_id uuid, booking_confirmed boolean, already_settled boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  attempt_row public.paystack_payment_attempts%rowtype;
  booking_row public.bookings%rowtype;
  expected_amount_minor bigint;
begin
  select a.* into attempt_row
    from public.paystack_payment_attempts a
   where a.reference = p_reference
   for update;
  if not found then raise exception 'PAYMENT_ATTEMPT_NOT_FOUND'; end if;

  expected_amount_minor := round(attempt_row.amount * 100)::bigint;
  if p_currency <> 'KES' or p_amount_minor <> expected_amount_minor then
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  select b.* into booking_row
    from public.bookings b
   where b.id = attempt_row.booking_id
   for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  if attempt_row.status in ('paid', 'late_success') then
    return query select attempt_row.booking_id, attempt_row.payment_id,
      booking_row.status = 'confirmed', true;
    return;
  end if;

  update public.payments
     set status = 'paid', provider = 'paystack',
         provider_reference = p_reference,
         method = case when p_channel = 'card' then 'card'::public.payment_method
                       when p_channel = 'mobile_money' then 'mpesa'::public.payment_method
                       else method end,
         payment_channel = p_channel,
         paystack_transaction_id = p_transaction_id,
         paid_at = coalesce(p_paid_at, now()),
         raw_response = p_raw_response
   where id = attempt_row.payment_id;

  if booking_row.status = 'pending' and booking_row.hold_expires_at > now() then
    update public.bookings set status = 'confirmed' where id = booking_row.id;
    update public.paystack_payment_attempts
       set status = 'paid', payment_channel = p_channel,
           paystack_transaction_id = p_transaction_id,
           paid_at = coalesce(p_paid_at, now()), raw_response = p_raw_response,
           updated_at = now()
     where id = attempt_row.id;
    return query select booking_row.id, attempt_row.payment_id, true, false;
  else
    update public.paystack_payment_attempts
       set status = 'late_success', payment_channel = p_channel,
           paystack_transaction_id = p_transaction_id,
           paid_at = coalesce(p_paid_at, now()), raw_response = p_raw_response,
           updated_at = now()
     where id = attempt_row.id;
    return query select booking_row.id, attempt_row.payment_id, false, false;
  end if;
end;
$$;

revoke all on function public.settle_paystack_attempt(text, bigint, text, bigint, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.settle_paystack_attempt(text, bigint, text, bigint, text, timestamptz, jsonb) to service_role;