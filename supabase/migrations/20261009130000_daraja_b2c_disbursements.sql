alter table public.profiles
  add column if not exists host_fee_balance numeric(12, 2) not null default 0;

alter table public.profiles
  drop constraint if exists profiles_host_fee_balance_check;

alter table public.profiles
  add constraint profiles_host_fee_balance_check
    check (host_fee_balance between -1000000000 and 1000000000);

update public.profiles
   set host_fee_balance = coalesce(host_fee_balance, 0) + coalesce(host_payout_fee_debt, 0),
       host_payout_fee_debt = 0
 where coalesce(host_payout_fee_debt, 0) <> 0;

create table if not exists public.daraja_b2c_attempts (
  id uuid primary key default gen_random_uuid(),
  payout_request_id uuid not null references public.host_payout_requests(id) on delete restrict,
  idempotency_key text not null unique,
  conversation_id text unique,
  originator_conversation_id text unique,
  phone_number text not null check (phone_number ~ '^254[17][0-9]{8}$'),
  amount numeric(12, 2) not null check (amount > 0 and amount = trunc(amount)),
  estimated_fee numeric(12, 2) not null check (estimated_fee >= 0),
  fee_balance_applied numeric(12, 2) not null default 0,
  actual_fee numeric(12, 2) check (actual_fee is null or actual_fee >= 0),
  status text not null default 'initializing'
    check (status in (
      'initializing', 'submitted', 'succeeded', 'failed',
      'timeout', 'reconciliation_required', 'reversed'
    )),
  result_code text,
  result_description text,
  transaction_id text,
  response_payload jsonb,
  result_payload jsonb,
  timeout_payload jsonb,
  initiated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists daraja_b2c_attempts_active_request_uidx
  on public.daraja_b2c_attempts (payout_request_id)
  where status in ('initializing', 'submitted', 'reconciliation_required');
create index if not exists daraja_b2c_attempts_created_idx
  on public.daraja_b2c_attempts (created_at desc);

alter table public.daraja_b2c_attempts enable row level security;
revoke all on public.daraja_b2c_attempts from public, anon, authenticated;
grant all on public.daraja_b2c_attempts to service_role;

create table if not exists public.daraja_b2c_callback_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.daraja_b2c_attempts(id) on delete set null,
  conversation_id text,
  originator_conversation_id text,
  event_type text not null check (event_type in ('result', 'timeout')),
  fingerprint text not null unique,
  processing_status text not null default 'received'
    check (processing_status in (
      'received', 'processed', 'failed', 'reconciliation_required', 'unmatched'
    )),
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists daraja_b2c_callback_events_conversation_idx
  on public.daraja_b2c_callback_events (conversation_id, received_at desc);

alter table public.daraja_b2c_callback_events enable row level security;
revoke all on public.daraja_b2c_callback_events from public, anon, authenticated;
grant all on public.daraja_b2c_callback_events to service_role;

alter table public.host_payout_requests
  add column if not exists net_amount numeric(12, 2),
  add column if not exists fee_estimate numeric(12, 2),
  add column if not exists fee_difference numeric(12, 2),
  add column if not exists last_daraja_attempt_id uuid references public.daraja_b2c_attempts(id) on delete set null;

create or replace function public.admin_prepare_daraja_host_payout(
  p_request_id uuid,
  p_admin_id uuid,
  p_estimated_fee numeric,
  p_idempotency_key text
)
returns table (
  attempt_id uuid,
  host_id uuid,
  request_amount numeric,
  transfer_amount numeric,
  phone_number text,
  already_submitted boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row public.host_payout_requests%rowtype;
  profile_row public.profiles%rowtype;
  prior_attempt public.daraja_b2c_attempts%rowtype;
  available_amount numeric(12, 2);
  net_amount numeric(12, 2);
  attempt_uuid uuid;
  normalized_phone text;
  fee_balance numeric(12, 2);
begin
  if nullif(trim(p_idempotency_key), '') is null then raise exception 'MISSING_IDEMPOTENCY_KEY'; end if;
  if p_estimated_fee is null or p_estimated_fee < 0 then raise exception 'INVALID_ESTIMATED_FEE'; end if;

  select r.* into request_row from public.host_payout_requests r where r.id = p_request_id for update;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;
  if request_row.status <> 'processing' or request_row.processing_by is distinct from p_admin_id then
    raise exception 'PAYOUT_REQUEST_NOT_CLAIMED';
  end if;

  select a.* into prior_attempt from public.daraja_b2c_attempts a
   where a.idempotency_key = p_idempotency_key for update;
  if found then
    if prior_attempt.payout_request_id <> p_request_id then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return query select prior_attempt.id, request_row.host_id, request_row.amount,
      prior_attempt.amount, prior_attempt.phone_number, true;
    return;
  end if;

  select p.* into profile_row from public.profiles p where p.id = request_row.host_id;
  if not found then raise exception 'HOST_NOT_FOUND'; end if;
  if request_row.destination_method <> 'mpesa' then raise exception 'MPESA_DESTINATION_REQUIRED'; end if;

  normalized_phone := coalesce(
    request_row.destination_details->>'mpesa_number',
    request_row.destination_details->>'phone',
    request_row.destination_details->>'phone_number',
    ''
  );
  normalized_phone := regexp_replace(normalized_phone, '[^0-9]', '', 'g');
  if left(normalized_phone, 1) = '0' then
    normalized_phone := '254' || substring(normalized_phone from 2);
  elsif left(normalized_phone, 1) in ('7', '1') then
    normalized_phone := '254' || normalized_phone;
  end if;
  if normalized_phone !~ '^254[17][0-9]{8}$' then raise exception 'INVALID_MPESA_DESTINATION'; end if;

  fee_balance := coalesce(profile_row.host_fee_balance, 0);
  available_amount := round(request_row.amount - fee_balance, 2);
  net_amount := round(available_amount - p_estimated_fee);
  if available_amount <= 0 or net_amount <= 0 then
    raise exception 'INVALID_B2C_NET_AMOUNT';
  end if;

  insert into public.daraja_b2c_attempts (
    payout_request_id, idempotency_key, phone_number, amount,
    estimated_fee, fee_balance_applied, initiated_by, status
  ) values (
    p_request_id, p_idempotency_key, normalized_phone, net_amount,
    p_estimated_fee, fee_balance, p_admin_id, 'initializing'
  ) returning id into attempt_uuid;

  update public.host_payout_requests
     set fee_estimate = p_estimated_fee,
         net_amount = net_amount,
         last_daraja_attempt_id = attempt_uuid,
         updated_at = now()
   where id = p_request_id;

  return query select attempt_uuid, request_row.host_id, request_row.amount,
    net_amount, normalized_phone, false;
end;
$$;
revoke all on function public.admin_prepare_daraja_host_payout(uuid, uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.admin_prepare_daraja_host_payout(uuid, uuid, numeric, text) to service_role;

create or replace function public.record_daraja_b2c_submission(
  p_attempt_id uuid,
  p_conversation_id text,
  p_originator_conversation_id text,
  p_raw_response jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  attempt_row public.daraja_b2c_attempts%rowtype;
begin
  select a.* into attempt_row from public.daraja_b2c_attempts a where a.id = p_attempt_id for update;
  if not found then raise exception 'B2C_ATTEMPT_NOT_FOUND'; end if;
  if attempt_row.status in ('submitted', 'succeeded') then
    if attempt_row.conversation_id is distinct from p_conversation_id then raise exception 'B2C_CONVERSATION_MISMATCH'; end if;
    return;
  end if;
  if attempt_row.status <> 'initializing' then raise exception 'B2C_ATTEMPT_NOT_INITIALIZING'; end if;
  update public.daraja_b2c_attempts set status = 'submitted',
    conversation_id = p_conversation_id,
    originator_conversation_id = p_originator_conversation_id,
    response_payload = p_raw_response, updated_at = now()
   where id = p_attempt_id;
end;
$$;
revoke all on function public.record_daraja_b2c_submission(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_daraja_b2c_submission(uuid, text, text, jsonb) to service_role;

create or replace function public.settle_daraja_b2c_result(
  p_conversation_id text,
  p_originator_conversation_id text,
  p_result_code text,
  p_result_description text,
  p_transaction_id text,
  p_raw_response jsonb
)
returns table (host_id uuid, payout_request_id uuid, payout_status text, already_processed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  attempt_row public.daraja_b2c_attempts%rowtype;
  request_row public.host_payout_requests%rowtype;
  item_count integer;
begin
  select a.* into attempt_row from public.daraja_b2c_attempts a
   where a.conversation_id = p_conversation_id
     and a.originator_conversation_id = p_originator_conversation_id
   for update;
  if not found then raise exception 'B2C_ATTEMPT_NOT_FOUND'; end if;
  select r.* into request_row from public.host_payout_requests r where r.id = attempt_row.payout_request_id for update;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;

  if attempt_row.status = 'succeeded' then
    return query select request_row.host_id, request_row.id, request_row.status, true;
    return;
  end if;
  if attempt_row.status not in ('submitted', 'reconciliation_required') then raise exception 'B2C_ATTEMPT_NOT_SUBMITTED'; end if;
  if request_row.status <> 'processing' then raise exception 'PAYOUT_REQUEST_NOT_PROCESSING'; end if;

  if p_result_code <> '0' then
    update public.daraja_b2c_attempts set status = 'failed', result_code = p_result_code,
      result_description = left(p_result_description, 500), result_payload = p_raw_response,
      completed_at = now(), updated_at = now() where id = attempt_row.id;
    update public.host_payout_requests set admin_note = concat_ws(E'\n', nullif(admin_note, ''),
      'Safaricom reported B2C failure; confirm the transfer did not complete before retry or cancellation.'),
      updated_at = now() where id = request_row.id;
    return query select request_row.host_id, request_row.id, request_row.status, false;
    return;
  end if;

  if nullif(trim(p_transaction_id), '') is null then raise exception 'B2C_TRANSACTION_ID_REQUIRED'; end if;
  select count(*)::integer into item_count from public.host_payout_request_items i where i.request_id = request_row.id;
  if item_count = 0 or round((select coalesce(sum(i.amount), 0) from public.host_payout_request_items i where i.request_id = request_row.id), 2) <> request_row.amount then
    raise exception 'PAYOUT_ITEMS_NOT_AVAILABLE';
  end if;

  update public.payouts p set status = 'paid', paid_at = now()
   where p.id in (select i.payout_id from public.host_payout_request_items i where i.request_id = request_row.id)
     and p.status = 'owed' and p.eligible_for_withdrawal;
  get diagnostics item_count = row_count;
  if item_count = 0 or item_count <> (select count(*) from public.host_payout_request_items i where i.request_id = request_row.id) then
    raise exception 'PAYOUT_ITEMS_NOT_AVAILABLE';
  end if;

  update public.daraja_b2c_attempts set status = 'succeeded', result_code = p_result_code,
    result_description = left(p_result_description, 500), transaction_id = p_transaction_id,
    result_payload = p_raw_response, completed_at = now(), updated_at = now()
   where id = attempt_row.id;
  update public.host_payout_requests set status = 'paid',
    transfer_fee = attempt_row.estimated_fee,
    net_amount = attempt_row.amount,
    external_reference = p_transaction_id, processed_at = now(),
    processed_by = attempt_row.initiated_by, updated_at = now()
   where id = request_row.id;

  update public.profiles
     set host_fee_balance = coalesce(host_fee_balance, 0) - attempt_row.fee_balance_applied
   where id = request_row.host_id;

  return query select request_row.host_id, request_row.id, 'paid'::text, false;
end;
$$;
revoke all on function public.settle_daraja_b2c_result(text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.settle_daraja_b2c_result(text, text, text, text, text, jsonb) to service_role;

create or replace function public.reconcile_daraja_host_payout_fee(
  p_attempt_id uuid,
  p_actual_fee numeric,
  p_admin_id uuid,
  p_admin_note text default null
)
returns table (host_id uuid, fee_difference numeric, host_fee_balance numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  attempt_row public.daraja_b2c_attempts%rowtype;
  request_row public.host_payout_requests%rowtype;
  difference numeric(12, 2);
  updated_balance numeric(12, 2);
begin
  if not exists (select 1 from public.admin_roles where user_id = p_admin_id and privilege is true) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_actual_fee is null or p_actual_fee < 0 then raise exception 'INVALID_ACTUAL_FEE'; end if;
  select a.* into attempt_row from public.daraja_b2c_attempts a where a.id = p_attempt_id for update;
  if not found or attempt_row.status <> 'succeeded' then raise exception 'B2C_ATTEMPT_NOT_SUCCEEDED'; end if;
  select r.* into request_row from public.host_payout_requests r where r.id = attempt_row.payout_request_id for update;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;
  if attempt_row.actual_fee is not null then
    if attempt_row.actual_fee <> p_actual_fee then raise exception 'B2C_FEE_ALREADY_RECONCILED'; end if;
    select p.host_fee_balance into updated_balance from public.profiles p where p.id = (
      select r.host_id from public.host_payout_requests r where r.id = request_row.id
    );
    return query select request_row.host_id, coalesce(request_row.fee_difference, 0), updated_balance;
    return;
  end if;

    difference := round(
      p_actual_fee + attempt_row.amount -
      (request_row.amount - attempt_row.fee_balance_applied),
      2
    );
    update public.profiles
      set host_fee_balance = coalesce(host_fee_balance, 0) + difference
   where id = request_row.host_id returning host_fee_balance into updated_balance;
  update public.daraja_b2c_attempts set actual_fee = p_actual_fee, updated_at = now() where id = attempt_row.id;
  update public.host_payout_requests set transfer_fee = p_actual_fee,
    fee_difference = difference,
    admin_note = coalesce(nullif(trim(p_admin_note), ''), admin_note), updated_at = now()
   where id = request_row.id;
  return query select request_row.host_id, difference, updated_balance;
end;
$$;
revoke all on function public.reconcile_daraja_host_payout_fee(uuid, numeric, uuid, text) from public, anon, authenticated;
grant execute on function public.reconcile_daraja_host_payout_fee(uuid, numeric, uuid, text) to service_role;

create or replace function public.mark_daraja_b2c_reconciliation_required(
  p_attempt_id uuid,
  p_description text,
  p_raw_response jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.daraja_b2c_attempts set status = 'reconciliation_required',
    result_description = left(p_description, 500), result_payload = p_raw_response,
    updated_at = now()
   where id = p_attempt_id and status in ('initializing', 'submitted', 'reconciliation_required');
end;
$$;
revoke all on function public.mark_daraja_b2c_reconciliation_required(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.mark_daraja_b2c_reconciliation_required(uuid, text, jsonb) to service_role;

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
    payout_status := case when new.completion_source = 'system'
      then 'owed'::public.payout_status else 'processing'::public.payout_status end;
    payout_is_eligible := coalesce(
      new.collection_fee_reconciled
      and jsonb_typeof(new.pricing_snapshot->'line_items') = 'array'
      and new.host_gross_amount > 0
      and exists (select 1 from public.payments p where p.booking_id = new.id and p.status = 'paid'),
      false
    );
    insert into public.payouts (booking_id, host_id, amount, status, eligible_for_withdrawal)
    select new.id, new.host_id, new.host_payout_amount, payout_status, payout_is_eligible
     where new.host_payout_amount > 0 and not exists (select 1 from public.payouts p where p.booking_id = new.id);
  end if;
  return new;
end;
$$;

comment on column public.profiles.host_fee_balance is
  'Signed fee balance: positive is owed by host and reduces future payouts; negative is a host credit added to future payout availability.';

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
  if profile_row.payout_method <> 'mpesa' or profile_row.payout_details is null then
    raise exception 'PAYOUT_DESTINATION_REQUIRED';
  end if;
  select coalesce(array_agg(eligible.id), '{}'::uuid[]), round(coalesce(sum(eligible.amount), 0), 2)
    into eligible_payout_ids, requested_amount
    from (
      select p.id, p.amount from public.payouts p
       where p.host_id = p_host_id and p.status = 'owed' and p.eligible_for_withdrawal
         and not exists (
           select 1 from public.host_payout_request_items i
           join public.host_payout_requests r on r.id = i.request_id
           where i.payout_id = p.id and r.status in ('requested', 'processing')
         )
       order by p.created_at, p.id
       for update
    ) eligible;
  if requested_amount <= 0 then raise exception 'NO_PAYOUTS_AVAILABLE'; end if;
  if requested_amount - coalesce(profile_row.host_fee_balance, 0) <= 0 then
    raise exception 'HOST_FEE_BALANCE_EXCEEDS_PAYOUT';
  end if;

  insert into public.host_payout_requests (host_id, amount, destination_method, destination_details)
    values (p_host_id, requested_amount, 'mpesa', profile_row.payout_details)
    returning id into new_request_id;
  insert into public.host_payout_request_items (request_id, payout_id, amount)
    select new_request_id, p.id, p.amount from public.payouts p
     where p.id = any(eligible_payout_ids) and p.host_id = p_host_id and p.status = 'owed';
  return query select new_request_id, requested_amount;
end;
$$;
revoke all on function public.create_host_payout_request(uuid) from public, anon, authenticated;
grant execute on function public.create_host_payout_request(uuid) to service_role;