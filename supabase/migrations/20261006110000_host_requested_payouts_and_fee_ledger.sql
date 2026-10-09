alter table public.bookings
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists host_gross_amount numeric(12, 2),
  add column if not exists paystack_processing_fee_amount numeric(12, 2) not null default 0,
  add column if not exists host_fee_debt_applied numeric(12, 2) not null default 0,
  add column if not exists host_processing_fee_debt_reconciled boolean not null default false;

update public.bookings
   set host_gross_amount = coalesce(host_base_amount + additional_charges_amount, host_payout_amount, 0)
 where host_gross_amount is null;

alter table public.bookings
  alter column host_gross_amount set default 0,
  alter column host_gross_amount set not null;

alter table public.payments
  add column if not exists paystack_fee_amount numeric(12, 2) not null default 0;

alter table public.paystack_payment_attempts
  add column if not exists paystack_fee_amount numeric(12, 2);

alter table public.profiles
  add column if not exists host_payout_fee_debt numeric(12, 2) not null default 0;

alter table public.payouts
  add column if not exists eligible_for_withdrawal boolean not null default false;

update public.listings
   set platform_fee_per_night = round(price_per_night * coalesce(service_fee_percent, 0), 2)
 where platform_fee_per_night is null;

alter table public.bookings
  drop constraint if exists bookings_pricing_snapshot_object_check,
  drop constraint if exists bookings_host_gross_amount_nonnegative_check,
  drop constraint if exists bookings_paystack_fee_nonnegative_check,
  drop constraint if exists bookings_host_fee_debt_applied_nonnegative_check;

alter table public.bookings
  add constraint bookings_pricing_snapshot_object_check check (jsonb_typeof(pricing_snapshot) = 'object'),
  add constraint bookings_host_gross_amount_nonnegative_check check (host_gross_amount >= 0),
  add constraint bookings_paystack_fee_nonnegative_check check (paystack_processing_fee_amount >= 0),
  add constraint bookings_host_fee_debt_applied_nonnegative_check check (host_fee_debt_applied >= 0);

alter table public.payments
  drop constraint if exists payments_paystack_fee_nonnegative_check;
alter table public.payments
  add constraint payments_paystack_fee_nonnegative_check check (paystack_fee_amount >= 0);

alter table public.profiles
  drop constraint if exists profiles_host_payout_fee_debt_nonnegative_check;
alter table public.profiles
  add constraint profiles_host_payout_fee_debt_nonnegative_check check (host_payout_fee_debt >= 0);

alter table public.admin_audit_logs
  drop constraint if exists admin_audit_logs_entity_type_check;
alter table public.admin_audit_logs
  add constraint admin_audit_logs_entity_type_check
    check (entity_type in ('listing', 'booking', 'user', 'host_verification', 'support_case', 'review', 'payout'));

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
    new.host_gross_amount - coalesce(new.paystack_processing_fee_amount, 0) - coalesce(new.host_fee_debt_applied, 0), 2
  ), 0);
  return new;
end;
$$;

drop trigger if exists snapshot_booking_host_payout_breakdown_on_insert on public.bookings;
create trigger snapshot_booking_host_payout_breakdown_on_insert
before insert on public.bookings
for each row execute function public.snapshot_booking_host_payout_breakdown();

drop trigger if exists snapshot_booking_host_payout_breakdown_on_reprice on public.bookings;
create trigger snapshot_booking_host_payout_breakdown_on_reprice
before update of listing_id, check_in, check_out, host_gross_amount on public.bookings
for each row execute function public.snapshot_booking_host_payout_breakdown();

drop function if exists public.create_booking_hold(
  uuid, uuid, date, date, integer, integer, integer, text, text, text, text,
  text, text, text, text, numeric, numeric, numeric, numeric
);

create function public.create_booking_hold(
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
returns table (id uuid, status text, total_amount numeric, commission_amount numeric,
               host_payout_amount numeric, booking_reference text, hold_expires_at timestamptz)
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
  if p_payment_method not in ('mpesa', 'card') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if p_check_out <= p_check_in or p_check_in < current_date then raise exception 'INVALID_DATES'; end if;
  if p_guests < 1 or p_children < 0 or p_children > p_guests or p_pets < 0 or p_pets > 10 then
    raise exception 'INVALID_GUEST_COUNTS';
  end if;
  if nullif(trim(p_guest_name), '') is null or nullif(trim(p_guest_email), '') is null or nullif(trim(p_guest_phone), '') is null then
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
    return query select existing_row.id, existing_row.status::text, existing_row.total_amount::numeric,
      existing_row.commission_amount::numeric, existing_row.host_payout_amount::numeric,
      existing_row.booking_reference, existing_row.hold_expires_at;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_listing_id::text, 0));
  update public.bookings b set status = 'cancelled'
   where b.listing_id = p_listing_id and b.status = 'pending' and b.hold_expires_at <= now();
  update public.payments p set status = 'failed'
   where p.booking_id in (select b.id from public.bookings b where b.listing_id = p_listing_id
     and b.status = 'cancelled' and b.hold_expires_at <= now()) and p.status = 'pending';
  update public.paystack_payment_attempts a set status = 'abandoned', updated_at = now()
   where a.booking_id in (select b.id from public.bookings b where b.listing_id = p_listing_id
     and b.status = 'cancelled' and b.hold_expires_at <= now()) and a.status in ('initializing', 'pending');

  select l.id, l.host_id, l.max_guests, l.min_nights, l.status into listing_row
    from public.listings l where l.id = p_listing_id;
  if not found or listing_row.status <> 'published' then raise exception 'LISTING_UNAVAILABLE'; end if;
  if p_guests > listing_row.max_guests then raise exception 'TOO_MANY_GUESTS'; end if;
  if p_check_out - p_check_in < greatest(coalesce(listing_row.min_nights, 1), 1) then
    raise exception 'MINIMUM_STAY_NOT_MET';
  end if;
  if exists (select 1 from public.bookings b where b.listing_id = p_listing_id
       and (b.status = 'confirmed' or (b.status = 'pending' and b.hold_expires_at > now()))
       and daterange(b.check_in, b.check_out, '[)') && daterange(p_check_in, p_check_out, '[)')) then
    raise exception 'DATES_UNAVAILABLE';
  end if;

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
    trim(p_guest_phone), nullif(trim(p_guest_country), ''), p_children, p_pets, 1,
    nullif(trim(p_special_requests), ''), now(), hold_deadline,
    p_confirmation_token_hash, p_pricing_snapshot
  ) returning bookings.id into booking_id;

  insert into public.payments (booking_id, amount, method, status)
  values (booking_id, p_total, p_payment_method::public.payment_method, 'pending');
  return query select b.id, b.status::text, b.total_amount::numeric,
    b.commission_amount::numeric, b.host_payout_amount::numeric,
    b.booking_reference, b.hold_expires_at from public.bookings b where b.id = booking_id;
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

create function public.settle_paystack_attempt(
  p_reference text,
  p_amount_minor bigint,
  p_currency text,
  p_transaction_id bigint,
  p_channel text,
  p_paid_at timestamptz,
  p_raw_response jsonb,
  p_fee_minor bigint
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
  fee_amount numeric(12, 2);
  prior_debt numeric(12, 2);
  debt_applied numeric(12, 2);
  next_debt numeric(12, 2);
begin
  select a.* into attempt_row from public.paystack_payment_attempts a where a.reference = p_reference for update;
  if not found then raise exception 'PAYMENT_ATTEMPT_NOT_FOUND'; end if;
  if p_fee_minor is null or p_fee_minor < 0 then raise exception 'PAYMENT_FEE_MISSING'; end if;
  expected_amount_minor := round(attempt_row.amount * 100)::bigint;
  if p_currency <> 'KES' or p_amount_minor <> expected_amount_minor then raise exception 'PAYMENT_AMOUNT_MISMATCH'; end if;

  select b.* into booking_row from public.bookings b where b.id = attempt_row.booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if attempt_row.status in ('paid', 'late_success') then
    return query select attempt_row.booking_id, attempt_row.payment_id,
      booking_row.status in ('confirmed', 'completed'), true;
    return;
  end if;

  if exists (select 1 from public.payments p where p.id = attempt_row.payment_id
      and p.status = 'paid' and p.provider_reference is distinct from p_reference) then
    update public.paystack_payment_attempts set status = 'late_success', payment_channel = p_channel,
      paystack_transaction_id = p_transaction_id, paystack_fee_amount = round(p_fee_minor / 100.0, 2),
      paid_at = coalesce(p_paid_at, now()), raw_response = p_raw_response, updated_at = now()
      where id = attempt_row.id;
    return query select booking_row.id, attempt_row.payment_id, false, false;
    return;
  end if;

  fee_amount := round(p_fee_minor / 100.0, 2);
  update public.payments set status = 'paid', provider = 'paystack', provider_reference = p_reference,
    method = case when p_channel = 'card' then 'card'::public.payment_method
                  when p_channel = 'mobile_money' then 'mpesa'::public.payment_method else method end,
    payment_channel = p_channel, paystack_transaction_id = p_transaction_id,
    paystack_fee_amount = fee_amount, paid_at = coalesce(p_paid_at, now()), raw_response = p_raw_response
    where id = attempt_row.payment_id;

  if booking_row.status = 'pending' and booking_row.hold_expires_at > now() then
    select coalesce(p.host_payout_fee_debt, 0) into prior_debt from public.profiles p
      where p.id = booking_row.host_id for update;
    prior_debt := coalesce(prior_debt, 0);
    debt_applied := least(prior_debt, greatest(booking_row.host_gross_amount - fee_amount, 0));
    next_debt := greatest(prior_debt - debt_applied + greatest(fee_amount - booking_row.host_gross_amount, 0), 0);
    update public.profiles set host_payout_fee_debt = next_debt where id = booking_row.host_id;
    update public.bookings set paystack_processing_fee_amount = fee_amount,
      host_fee_debt_applied = debt_applied,
      host_payout_amount = greatest(booking_row.host_gross_amount - fee_amount - debt_applied, 0),
      status = 'confirmed' where id = booking_row.id;
    update public.paystack_payment_attempts set status = 'paid', payment_channel = p_channel,
      paystack_transaction_id = p_transaction_id, paystack_fee_amount = fee_amount,
      paid_at = coalesce(p_paid_at, now()), raw_response = p_raw_response, updated_at = now()
      where id = attempt_row.id;
    return query select booking_row.id, attempt_row.payment_id, true, false;
  else
    update public.profiles set host_payout_fee_debt = coalesce(host_payout_fee_debt, 0) + fee_amount
      where id = booking_row.host_id and not booking_row.host_processing_fee_debt_reconciled;
    update public.bookings set paystack_processing_fee_amount = fee_amount, host_payout_amount = 0,
      host_processing_fee_debt_reconciled = true
      where id = booking_row.id;
    update public.paystack_payment_attempts set status = 'late_success', payment_channel = p_channel,
      paystack_transaction_id = p_transaction_id, paystack_fee_amount = fee_amount,
      paid_at = coalesce(p_paid_at, now()), raw_response = p_raw_response, updated_at = now()
      where id = attempt_row.id;
    return query select booking_row.id, attempt_row.payment_id, false, false;
  end if;
end;
$$;

revoke all on function public.settle_paystack_attempt(text, bigint, text, bigint, text, timestamptz, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.settle_paystack_attempt(text, bigint, text, bigint, text, timestamptz, jsonb, bigint) to service_role;

create or replace function public.reconcile_cancelled_booking_paystack_fee()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actual_fee numeric(12, 2);
  payment_is_paid boolean;
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled'
     and not new.host_processing_fee_debt_reconciled then
    select coalesce(p.paystack_fee_amount, new.paystack_processing_fee_amount, 0),
           p.status in ('paid', 'success')
      into actual_fee, payment_is_paid
      from public.payments p where p.booking_id = new.id
      order by p.created_at desc limit 1;
    if coalesce(payment_is_paid, false) and coalesce(actual_fee, 0) > 0 then
      update public.profiles set host_payout_fee_debt = coalesce(host_payout_fee_debt, 0) + actual_fee
       where id = new.host_id;
      update public.bookings set host_processing_fee_debt_reconciled = true
       where id = new.id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists reconcile_cancelled_booking_paystack_fee_after_update on public.bookings;
create trigger reconcile_cancelled_booking_paystack_fee_after_update
after update of status on public.bookings
for each row execute function public.reconcile_cancelled_booking_paystack_fee();

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
    payout_is_eligible := coalesce(jsonb_typeof(new.pricing_snapshot->'line_items') = 'array'
      and new.host_gross_amount > 0
      and new.paystack_processing_fee_amount >= 0
      and exists (select 1 from public.payments p where p.booking_id = new.id and p.status = 'paid'), false);

    insert into public.payouts (booking_id, host_id, amount, status, eligible_for_withdrawal)
    select new.id, new.host_id, new.host_payout_amount, payout_status, payout_is_eligible
    where new.host_payout_amount > 0
      and not exists (select 1 from public.payouts p where p.booking_id = new.id);
  end if;
  return new;
end;
$$;

update public.payouts set eligible_for_withdrawal = false;

create table if not exists public.host_payout_requests (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  transfer_fee numeric(12, 2),
  net_amount numeric(12, 2),
  destination_method text not null check (destination_method in ('mpesa', 'bank')),
  destination_details jsonb not null,
  status text not null default 'requested' check (status in ('requested', 'processing', 'paid', 'reversed', 'cancelled')),
  external_reference text,
  admin_note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references public.profiles(id) on delete set null,
  processing_by uuid references public.profiles(id) on delete set null,
  processing_started_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'paid' and transfer_fee is not null and net_amount is not null and external_reference is not null and processed_at is not null) or status <> 'paid'),
  check (transfer_fee is null or transfer_fee >= 0),
  check (net_amount is null or net_amount > 0),
  check (external_reference is null or length(external_reference) between 1 and 200)
);

alter table public.host_payout_requests
  add column if not exists destination_verified_by_admin boolean not null default false,
  add column if not exists transfer_fee_verified_by_admin boolean not null default false;

create unique index if not exists host_payout_requests_external_reference_uidx
  on public.host_payout_requests (external_reference) where external_reference is not null;
create index if not exists host_payout_requests_host_created_idx
  on public.host_payout_requests (host_id, created_at desc);

create table if not exists public.host_payout_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.host_payout_requests(id) on delete restrict,
  payout_id uuid not null references public.payouts(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (request_id, payout_id)
);
create index if not exists host_payout_request_items_payout_idx
  on public.host_payout_request_items (payout_id);

alter table public.host_payout_requests enable row level security;
alter table public.host_payout_request_items enable row level security;
revoke all on public.host_payout_requests, public.host_payout_request_items from public, anon, authenticated;
grant select on public.host_payout_requests, public.host_payout_request_items to authenticated;

drop policy if exists host_payout_requests_select_own on public.host_payout_requests;
create policy host_payout_requests_select_own on public.host_payout_requests
  for select to authenticated using (host_id = auth.uid());
drop policy if exists host_payout_request_items_select_own on public.host_payout_request_items;
create policy host_payout_request_items_select_own on public.host_payout_request_items
  for select to authenticated using (exists (
    select 1 from public.host_payout_requests r where r.id = request_id and r.host_id = auth.uid()
  ));

create or replace function public.create_host_payout_request(p_host_id uuid)
returns table (request_id uuid, request_amount numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_row public.profiles%rowtype;
  requested_amount numeric(12, 2);
  new_request_id uuid;
  eligible_payout_ids uuid[];
begin
  perform pg_advisory_xact_lock(hashtextextended(p_host_id::text, 4));
  select p.* into profile_row from public.profiles p where p.id = p_host_id for update;
  if not found then raise exception 'HOST_NOT_FOUND'; end if;
  if profile_row.role <> 'host' then raise exception 'HOST_REQUIRED'; end if;
  if profile_row.payout_method not in ('mpesa', 'bank') or profile_row.payout_details is null then
    raise exception 'PAYOUT_DESTINATION_REQUIRED';
  end if;
  if profile_row.host_payout_fee_debt > 0 then raise exception 'HOST_FEE_DEBT_REMAINS'; end if;

  select coalesce(array_agg(eligible.id), '{}'::uuid[]), round(coalesce(sum(eligible.amount), 0), 2)
    into eligible_payout_ids, requested_amount
    from (
      select p.id, p.amount from public.payouts p
       where p.host_id = p_host_id and p.status = 'owed' and p.eligible_for_withdrawal
         and not exists (select 1 from public.host_payout_request_items i
           join public.host_payout_requests r on r.id = i.request_id
           where i.payout_id = p.id and r.status = 'requested')
       order by p.created_at, p.id
       for update
    ) eligible;
  if requested_amount <= 0 then raise exception 'NO_PAYOUTS_AVAILABLE'; end if;

  insert into public.host_payout_requests (host_id, amount, destination_method, destination_details)
    values (p_host_id, requested_amount, profile_row.payout_method, profile_row.payout_details)
    returning id into new_request_id;
  insert into public.host_payout_request_items (request_id, payout_id, amount)
    select new_request_id, p.id, p.amount from public.payouts p
     where p.id = any(eligible_payout_ids) and p.host_id = p_host_id and p.status = 'owed';
  return query select new_request_id, requested_amount;
end;
$$;
revoke all on function public.create_host_payout_request(uuid) from public, anon, authenticated;
grant execute on function public.create_host_payout_request(uuid) to service_role;

create or replace function public.admin_claim_host_payout_request(p_request_id uuid, p_admin_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row public.host_payout_requests%rowtype;
begin
  select r.* into request_row from public.host_payout_requests r where r.id = p_request_id for update;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;
  if request_row.status = 'processing' and request_row.processing_by = p_admin_id then
    return request_row.id;
  end if;
  if request_row.status <> 'requested' then raise exception 'PAYOUT_REQUEST_NOT_PENDING'; end if;

  update public.host_payout_requests set status = 'processing', processing_by = p_admin_id,
    processing_started_at = now(), updated_at = now() where id = p_request_id;
  return p_request_id;
end;
$$;
revoke all on function public.admin_claim_host_payout_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_claim_host_payout_request(uuid, uuid) to service_role;

create or replace function public.admin_record_host_payout(
  p_request_id uuid,
  p_transfer_fee numeric,
  p_net_amount numeric,
  p_external_reference text,
  p_admin_id uuid,
  p_admin_note text default null,
  p_details_verified boolean default false
)
returns table (host_id uuid, request_amount numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row public.host_payout_requests%rowtype;
  item_count integer;
  item_total numeric(12, 2);
begin
  select r.* into request_row from public.host_payout_requests r where r.id = p_request_id for update;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;
  if request_row.status <> 'processing' or request_row.processing_by is distinct from p_admin_id then
    raise exception 'PAYOUT_REQUEST_NOT_CLAIMED';
  end if;
  if p_details_verified is distinct from true then raise exception 'PAYOUT_DETAILS_NOT_VERIFIED'; end if;
  if p_transfer_fee is null or p_net_amount is null or p_transfer_fee < 0
     or p_net_amount <= 0 or round(p_transfer_fee + p_net_amount, 2) <> request_row.amount then
    raise exception 'PAYOUT_AMOUNT_MISMATCH';
  end if;
  if nullif(trim(p_external_reference), '') is null or length(p_external_reference) > 200 then
    raise exception 'PAYOUT_REFERENCE_REQUIRED';
  end if;

  select count(*)::integer, round(coalesce(sum(i.amount), 0), 2)
    into item_count, item_total
    from public.host_payout_request_items i where i.request_id = request_row.id;
  if item_count = 0 or item_total <> request_row.amount then raise exception 'PAYOUT_ITEMS_NOT_AVAILABLE'; end if;

  update public.payouts p set status = 'paid', paid_at = now()
   where p.id in (select i.payout_id from public.host_payout_request_items i where i.request_id = request_row.id)
     and p.status = 'owed' and p.eligible_for_withdrawal;
  get diagnostics item_count = row_count;
  if item_count = 0 or item_count <> (select count(*) from public.host_payout_request_items i where i.request_id = request_row.id) then
    raise exception 'PAYOUT_ITEMS_NOT_AVAILABLE';
  end if;

  update public.host_payout_requests set status = 'paid', transfer_fee = p_transfer_fee,
    net_amount = p_net_amount, external_reference = trim(p_external_reference),
    admin_note = nullif(trim(p_admin_note), ''), processed_at = now(),
    processed_by = p_admin_id, destination_verified_by_admin = true,
    transfer_fee_verified_by_admin = true, updated_at = now() where id = request_row.id;
  return query select request_row.host_id, request_row.amount;
end;
$$;
revoke all on function public.admin_record_host_payout(uuid, numeric, numeric, text, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_record_host_payout(uuid, numeric, numeric, text, uuid, text, boolean) to service_role;

create or replace function public.reconcile_reversed_host_payout(
  p_external_reference text,
  p_currency text,
  p_amount_minor bigint
)
returns table (host_id uuid, already_reversed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row public.host_payout_requests%rowtype;
  affected_items integer;
begin
  select r.* into request_row from public.host_payout_requests r
   where r.external_reference = p_external_reference for update;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;
  if request_row.status = 'reversed' then
    return query select request_row.host_id, true;
    return;
  end if;
  if request_row.status <> 'paid' then raise exception 'PAYOUT_NOT_RECORDED_AS_PAID'; end if;
  if p_currency <> 'KES' or p_amount_minor <> round(coalesce(request_row.net_amount, 0) * 100)::bigint then
    raise exception 'PAYOUT_REVERSAL_AMOUNT_MISMATCH';
  end if;

  update public.payouts p set status = 'owed', paid_at = null
   where p.id in (select i.payout_id from public.host_payout_request_items i where i.request_id = request_row.id)
     and p.status = 'paid';
  get diagnostics affected_items = row_count;
  if affected_items = 0 or affected_items <> (select count(*) from public.host_payout_request_items i where i.request_id = request_row.id) then
    raise exception 'PAYOUT_REVERSAL_ITEMS_MISMATCH';
  end if;

  update public.profiles set host_payout_fee_debt = coalesce(host_payout_fee_debt, 0) + coalesce(request_row.transfer_fee, 0)
   where id = request_row.host_id;
  update public.host_payout_requests set status = 'reversed', reversed_at = now(),
    admin_note = concat_ws(E'\n', nullif(admin_note, ''), 'Paystack reversed the transfer; reserved booking payouts restored and transfer fee carried against future host earnings.'),
    updated_at = now()
   where id = request_row.id;
  return query select request_row.host_id, false;
end;
$$;
revoke all on function public.reconcile_reversed_host_payout(text, text, bigint) from public, anon, authenticated;
grant execute on function public.reconcile_reversed_host_payout(text, text, bigint) to service_role;

create or replace function public.admin_cancel_host_payout_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_admin_note text,
  p_transfer_not_sent_confirmed boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row public.host_payout_requests%rowtype;
begin
  if p_transfer_not_sent_confirmed is distinct from true then raise exception 'PAYOUT_TRANSFER_STATE_NOT_CONFIRMED'; end if;
  select r.* into request_row from public.host_payout_requests r where r.id = p_request_id for update;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_PENDING'; end if;
  if request_row.status not in ('requested', 'processing') then raise exception 'PAYOUT_REQUEST_NOT_PENDING'; end if;
  if request_row.status = 'processing' and request_row.processing_by is distinct from p_admin_id then
    raise exception 'PAYOUT_REQUEST_NOT_CLAIMED';
  end if;
  update public.host_payout_requests set status = 'cancelled', admin_note = nullif(trim(p_admin_note), ''),
    processed_by = p_admin_id, updated_at = now() where id = p_request_id;
  return request_row.host_id;
end;
$$;
revoke all on function public.admin_cancel_host_payout_request(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_cancel_host_payout_request(uuid, uuid, text, boolean) to service_role;

comment on column public.bookings.pricing_snapshot is
  'Immutable guest price breakdown and selected listing extra lines used for checkout and receipts.';
comment on column public.bookings.host_gross_amount is
  'Host nightly rate plus host-owned listing extras before collection and payout fees.';
comment on column public.bookings.paystack_processing_fee_amount is
  'Actual Paystack collection fee deducted from host earnings after a verified charge.';
comment on column public.profiles.host_payout_fee_debt is
  'Collection processing fees exceeding current host gross earnings, carried forward against future earnings.';