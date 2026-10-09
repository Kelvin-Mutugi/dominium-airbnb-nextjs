drop trigger if exists reconcile_cancelled_booking_paystack_fee_after_update
  on public.bookings;
drop function if exists public.reconcile_cancelled_booking_paystack_fee();

create or replace function public.snapshot_booking_host_payout_breakdown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nightly_rate numeric(12, 2);
  stay_nights integer;
begin
  select l.price_per_night into nightly_rate
    from public.listings l where l.id = new.listing_id;
  if not found then raise exception 'LISTING_UNAVAILABLE'; end if;

  stay_nights := new.check_out - new.check_in;
  if stay_nights <= 0 then raise exception 'INVALID_DATES'; end if;

  new.host_base_amount := round(nightly_rate * stay_nights, 2);
  new.additional_charges_amount := round(new.host_gross_amount - new.host_base_amount, 2);
  if new.additional_charges_amount < 0 then raise exception 'INVALID_HOST_PAYOUT_BREAKDOWN'; end if;
  new.host_payout_amount := greatest(round(
    new.host_gross_amount - coalesce(new.host_fee_debt_applied, 0), 2
  ), 0);
  return new;
end;
$$;

create or replace function public.create_booking_hold(
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
  listing_row record;
  existing_row public.bookings%rowtype;
  booking_id uuid;
  host_gross numeric(12, 2);
  hold_deadline timestamptz := now() + interval '10 minutes';
begin
  if nullif(trim(p_idempotency_key), '') is null then raise exception 'MISSING_IDEMPOTENCY_KEY'; end if;
  if p_payment_method <> 'mpesa' then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if p_check_out <= p_check_in or p_check_in < current_date then raise exception 'INVALID_DATES'; end if;
  if p_guests < 1 or p_children < 0 or p_children > p_guests or p_pets < 0 or p_pets > 10 then
    raise exception 'INVALID_GUEST_COUNTS';
  end if;
  if nullif(trim(p_guest_name), '') is null or nullif(trim(p_guest_email), '') is null
     or nullif(trim(p_guest_phone), '') is null then
    raise exception 'INVALID_GUEST_DETAILS';
  end if;
  if jsonb_typeof(p_pricing_snapshot) <> 'object' then raise exception 'INVALID_PRICING_SNAPSHOT'; end if;
  if p_subtotal < 0 or p_service_fee < 0 or p_additional_fees < 0 or p_total <= 0
     or round(p_subtotal + p_service_fee + p_additional_fees, 2) <> round(p_total, 2) then
    raise exception 'INVALID_BOOKING_PRICE';
  end if;
  host_gross := round(p_subtotal + p_additional_fees, 2);

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 1));
  select b.* into existing_row from public.bookings b
   where b.idempotency_key = p_idempotency_key for update;
  if found then
    if existing_row.listing_id <> p_listing_id or existing_row.check_in <> p_check_in
       or existing_row.check_out <> p_check_out or existing_row.guests_count <> p_guests
       or existing_row.children_count <> p_children or existing_row.pets_count <> p_pets
       or existing_row.guest_id is distinct from p_guest_id
       or existing_row.guest_email <> lower(trim(p_guest_email))
       or existing_row.guest_confirmation_token_hash is distinct from p_confirmation_token_hash
       or existing_row.pricing_snapshot is distinct from p_pricing_snapshot then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return query select existing_row.id, existing_row.status::text,
      existing_row.total_amount::numeric, existing_row.commission_amount::numeric,
      existing_row.host_payout_amount::numeric, existing_row.booking_reference,
      existing_row.hold_expires_at;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_listing_id::text, 0));
  update public.bookings b set status = 'cancelled'
   where b.listing_id = p_listing_id and b.status = 'pending' and b.hold_expires_at <= now();
  update public.payments p set status = 'failed'
   where p.booking_id in (
     select b.id from public.bookings b
      where b.listing_id = p_listing_id and b.status = 'cancelled'
        and b.hold_expires_at <= now()
   ) and p.status = 'pending';
  update public.daraja_payment_attempts a set status = 'abandoned', updated_at = now()
   where a.booking_id in (
     select b.id from public.bookings b
      where b.listing_id = p_listing_id and b.status = 'cancelled'
        and b.hold_expires_at <= now()
   ) and a.status in ('initializing', 'pending');

  select l.id, l.host_id, l.max_guests, l.min_nights, l.status
    into listing_row from public.listings l where l.id = p_listing_id;
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
    total_amount, commission_amount, host_payout_amount, host_gross_amount,
    idempotency_key, guest_name, guest_email, guest_phone, guest_country,
    children_count, pets_count, rooms_count, special_requests, terms_agreed_at,
    hold_expires_at, guest_confirmation_token_hash, pricing_snapshot
  ) values (
    p_listing_id, p_guest_id, listing_row.host_id, p_check_in, p_check_out,
    p_guests, 'pending', p_total, p_service_fee, host_gross, host_gross,
    p_idempotency_key, trim(p_guest_name), lower(trim(p_guest_email)),
    trim(p_guest_phone), nullif(trim(p_guest_country), ''), p_children, p_pets,
    1, nullif(trim(p_special_requests), ''), now(), hold_deadline,
    p_confirmation_token_hash, p_pricing_snapshot
  ) returning bookings.id into booking_id;

  insert into public.payments (booking_id, amount, method, status)
  values (booking_id, p_total, 'mpesa'::public.payment_method, 'pending');
  return query select b.id, b.status::text, b.total_amount::numeric,
    b.commission_amount::numeric, b.host_payout_amount::numeric,
    b.booking_reference, b.hold_expires_at
    from public.bookings b where b.id = booking_id;
end;
$$;

revoke all on function public.create_booking_hold(
  uuid, uuid, date, date, integer, integer, integer, text, text, text, text,
  text, text, text, text, numeric, numeric, numeric, numeric, jsonb
) from public, anon, authenticated;
grant execute on function public.create_booking_hold(
  uuid, uuid, date, date, integer, integer, integer, text, text, text, text,
  text, text, text, text, numeric, numeric, numeric, numeric, jsonb
) to service_role;

drop function if exists public.settle_paystack_attempt(text, bigint, text, bigint, text, timestamptz, jsonb);
drop function if exists public.settle_paystack_attempt(text, bigint, text, bigint, text, timestamptz, jsonb, bigint);
drop function if exists public.admin_record_host_payout(uuid, numeric, numeric, text, uuid, text, boolean);
drop function if exists public.reconcile_reversed_host_payout(text, text, bigint);

drop table if exists public.paystack_payment_attempts;

alter table public.bookings
  drop constraint if exists bookings_paystack_fee_nonnegative_check,
  drop column if exists paystack_processing_fee_amount;

alter table public.payments
  drop constraint if exists payments_paystack_fee_nonnegative_check,
  drop column if exists paystack_fee_amount,
  drop column if exists paystack_transaction_id;

alter table public.profiles
  drop constraint if exists profiles_host_payout_fee_debt_nonnegative_check,
  drop column if exists host_payout_fee_debt;

comment on column public.payments.provider_fee_amount is
  'Actual provider collection fee recorded after administrative reconciliation.';
comment on column public.bookings.collection_fee_amount is
  'Actual Safaricom STK collection fee reconciled against the host fee balance.';