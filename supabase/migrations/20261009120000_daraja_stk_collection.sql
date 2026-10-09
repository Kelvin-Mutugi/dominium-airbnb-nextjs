alter table public.bookings
  add column if not exists guest_rounding_adjustment numeric(8, 2) not null default 0,
  add column if not exists collection_fee_reconciled boolean not null default true;

alter table public.bookings
  drop constraint if exists bookings_guest_rounding_adjustment_check;

alter table public.bookings
  add constraint bookings_guest_rounding_adjustment_check
    check (guest_rounding_adjustment between -0.50 and 0.50);

create table if not exists public.daraja_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  idempotency_key text not null unique,
  phone_number text not null check (phone_number ~ '^254[17][0-9]{8}$'),
  amount numeric(12, 2) not null check (amount > 0 and amount = trunc(amount)),
  currency text not null default 'KES' check (currency = 'KES'),
  status text not null default 'initializing'
    check (status in (
      'initializing', 'pending', 'succeeded', 'failed', 'abandoned',
      'late_success', 'reconciliation_required'
    )),
  merchant_request_id text,
  checkout_request_id text,
  mpesa_receipt_number text,
  result_code integer,
  result_description text,
  request_payload jsonb,
  response_payload jsonb,
  callback_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create unique index if not exists daraja_payment_attempts_checkout_request_uidx
  on public.daraja_payment_attempts (checkout_request_id)
  where checkout_request_id is not null;
create unique index if not exists daraja_payment_attempts_receipt_uidx
  on public.daraja_payment_attempts (mpesa_receipt_number)
  where mpesa_receipt_number is not null;
create unique index if not exists daraja_payment_attempts_active_booking_uidx
  on public.daraja_payment_attempts (booking_id)
  where status in ('initializing', 'pending', 'reconciliation_required');
create index if not exists daraja_payment_attempts_booking_created_idx
  on public.daraja_payment_attempts (booking_id, created_at desc);

alter table public.daraja_payment_attempts enable row level security;
revoke all on public.daraja_payment_attempts from public, anon, authenticated;
grant all on public.daraja_payment_attempts to service_role;

create table if not exists public.daraja_stk_callback_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.daraja_payment_attempts(id) on delete set null,
  checkout_request_id text,
  fingerprint text not null unique,
  processing_status text not null default 'received'
    check (processing_status in (
      'received', 'processed', 'failed', 'reconciliation_required', 'unmatched'
    )),
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists daraja_stk_callback_events_checkout_idx
  on public.daraja_stk_callback_events (checkout_request_id, received_at desc);

alter table public.daraja_stk_callback_events enable row level security;
revoke all on public.daraja_stk_callback_events from public, anon, authenticated;
grant all on public.daraja_stk_callback_events to service_role;

create or replace function public.create_booking_hold_with_rounding(
  p_listing_id uuid,
  p_guest_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_children integer,
  p_pets integer,
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
  p_total numeric,
  p_rounding_adjustment numeric,
  p_pricing_snapshot jsonb
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
  created record;
  base_total numeric(12, 2);
begin
  if p_payment_method <> 'mpesa' then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if p_total is null or p_total <= 0 or p_total <> round(p_total)
     or p_rounding_adjustment is null
     or abs(p_rounding_adjustment) > 0.50
     or round(p_subtotal + p_service_fee + p_additional_fees + p_rounding_adjustment, 2) <> p_total then
    raise exception 'INVALID_ROUNDED_BOOKING_TOTAL';
  end if;
  base_total := round(p_subtotal + p_service_fee + p_additional_fees, 2);
  if round(p_total - base_total, 2) <> p_rounding_adjustment then
    raise exception 'INVALID_ROUNDING_ADJUSTMENT';
  end if;

  select * into created
    from public.create_booking_hold(
      p_listing_id,
      p_guest_id,
      p_check_in,
      p_check_out,
      p_guests,
      p_children,
      p_pets,
      p_guest_name,
      p_guest_email,
      p_guest_phone,
      p_guest_country,
      p_special_requests,
      'mpesa',
      p_idempotency_key,
      p_confirmation_token_hash,
      p_subtotal,
      p_service_fee,
      p_additional_fees,
      base_total,
      p_pricing_snapshot
    );

  update public.bookings
     set total_amount = p_total,
         guest_rounding_adjustment = p_rounding_adjustment,
         collection_fee_reconciled = false
   where bookings.id = created.id
     and bookings.status = 'pending';

  update public.payments
     set amount = p_total
   where payments.booking_id = created.id
     and payments.status = 'pending';

  return query
    select b.id, b.status::text, b.total_amount::numeric,
           b.commission_amount::numeric, b.host_payout_amount::numeric,
           b.booking_reference, b.hold_expires_at
      from public.bookings b
     where b.id = created.id;
end;
$$;

revoke all on function public.create_booking_hold_with_rounding(
  uuid, uuid, date, date, integer, integer, integer, text, text, text,
  text, text, text, text, text, numeric, numeric, numeric, numeric, numeric, jsonb
) from public, anon, authenticated;
grant execute on function public.create_booking_hold_with_rounding(
  uuid, uuid, date, date, integer, integer, integer, text, text, text,
  text, text, text, text, text, numeric, numeric, numeric, numeric, numeric, jsonb
) to service_role;

create or replace function public.abandon_daraja_attempt_for_closed_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'pending' and old.status = 'pending' then
    update public.daraja_payment_attempts
       set status = 'abandoned', updated_at = now()
     where booking_id = new.id
       and status in ('initializing', 'pending');
  end if;
  return new;
end;
$$;

revoke all on function public.abandon_daraja_attempt_for_closed_booking() from public, anon, authenticated;
drop trigger if exists abandon_daraja_attempt_for_closed_booking_after_update on public.bookings;
create trigger abandon_daraja_attempt_for_closed_booking_after_update
  after update of status on public.bookings
  for each row execute function public.abandon_daraja_attempt_for_closed_booking();

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

    update public.daraja_payment_attempts
       set status = 'abandoned', updated_at = now()
     where booking_id = any(expired_booking_ids)
       and status in ('initializing', 'pending');
  end if;
end;
$$;

revoke all on function public.expire_pending_booking_holds() from public, anon, authenticated;
grant execute on function public.expire_pending_booking_holds() to service_role;

create or replace function public.settle_daraja_stk_attempt(
  p_checkout_request_id text,
  p_amount_minor bigint,
  p_phone_number text,
  p_receipt_number text,
  p_paid_at timestamptz,
  p_raw_response jsonb
)
returns table (booking_id uuid, payment_id uuid, booking_confirmed boolean, already_settled boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  attempt_row public.daraja_payment_attempts%rowtype;
  booking_row public.bookings%rowtype;
  expected_amount_minor bigint;
begin
  select a.* into attempt_row
    from public.daraja_payment_attempts a
   where a.checkout_request_id = p_checkout_request_id
   for update;
  if not found then raise exception 'DARAJA_ATTEMPT_NOT_FOUND'; end if;
  if attempt_row.status in ('succeeded', 'late_success') then
    select b.* into booking_row from public.bookings b where b.id = attempt_row.booking_id;
    return query select attempt_row.booking_id, attempt_row.payment_id,
      booking_row.status in ('confirmed', 'completed'), true;
    return;
  end if;

  expected_amount_minor := round(attempt_row.amount * 100)::bigint;
  if p_amount_minor <> expected_amount_minor then raise exception 'PAYMENT_AMOUNT_MISMATCH'; end if;
  if p_phone_number <> attempt_row.phone_number then raise exception 'PAYMENT_PHONE_MISMATCH'; end if;
  if p_receipt_number !~ '^[A-Za-z0-9]{8,20}$' then raise exception 'INVALID_MPESA_RECEIPT'; end if;

  select b.* into booking_row
    from public.bookings b
   where b.id = attempt_row.booking_id
   for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  if exists (
    select 1 from public.payments p
     where p.id = attempt_row.payment_id
       and p.status in ('paid', 'success')
       and p.provider_reference is distinct from p_receipt_number
  ) then
    update public.daraja_payment_attempts
       set status = 'late_success',
           result_code = 0,
           result_description = 'Successful payment requires reconciliation because another payment is already recorded.',
           mpesa_receipt_number = p_receipt_number,
           callback_payload = p_raw_response,
           paid_at = coalesce(p_paid_at, now()),
           updated_at = now()
     where id = attempt_row.id;
    return query select booking_row.id, attempt_row.payment_id, false, false;
    return;
  end if;

  update public.payments
     set status = 'paid',
         provider = 'safaricom',
         provider_reference = p_receipt_number,
         method = 'mpesa'::public.payment_method,
         payment_channel = 'stk_push',
         paid_at = coalesce(p_paid_at, now()),
         raw_response = p_raw_response
   where id = attempt_row.payment_id;

  if booking_row.status = 'pending' and booking_row.hold_expires_at > now() then
    update public.bookings set status = 'confirmed' where id = booking_row.id;
    update public.daraja_payment_attempts
       set status = 'succeeded', result_code = 0,
           mpesa_receipt_number = p_receipt_number,
           callback_payload = p_raw_response,
           paid_at = coalesce(p_paid_at, now()), updated_at = now()
     where id = attempt_row.id;
    return query select booking_row.id, attempt_row.payment_id, true, false;
  else
    update public.daraja_payment_attempts
       set status = 'late_success', result_code = 0,
           result_description = 'Successful payment arrived after the booking hold expired.',
           mpesa_receipt_number = p_receipt_number,
           callback_payload = p_raw_response,
           paid_at = coalesce(p_paid_at, now()), updated_at = now()
     where id = attempt_row.id;
    return query select booking_row.id, attempt_row.payment_id, false, false;
  end if;
end;
$$;

revoke all on function public.settle_daraja_stk_attempt(text, bigint, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.settle_daraja_stk_attempt(text, bigint, text, text, timestamptz, jsonb) to service_role;

create or replace function public.create_host_payout_for_completed_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payout_status public.payout_status;
  payout_is_eligible boolean;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    payout_status := case
      when new.completion_source = 'system' then 'owed'::public.payout_status
      else 'processing'::public.payout_status
    end;
    payout_is_eligible := coalesce(
      new.collection_fee_reconciled
      and jsonb_typeof(new.pricing_snapshot->'line_items') = 'array'
      and new.host_gross_amount > 0
      and exists (
        select 1 from public.payments p
         where p.booking_id = new.id and p.status = 'paid'
      ),
      false
    );

    insert into public.payouts (booking_id, host_id, amount, status, eligible_for_withdrawal)
    select new.id, new.host_id, new.host_payout_amount, payout_status, payout_is_eligible
     where new.host_payout_amount > 0
       and not exists (select 1 from public.payouts p where p.booking_id = new.id);
  end if;
  return new;
end;
$$;

comment on column public.bookings.guest_rounding_adjustment is
  'Signed adjustment that rounds the guest payment to whole KES for Daraja STK Push.';
comment on column public.bookings.collection_fee_reconciled is
  'False for Daraja collections until the actual Safaricom collection fee is reconciled; blocks host payout eligibility.';