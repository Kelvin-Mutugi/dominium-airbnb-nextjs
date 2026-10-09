create table if not exists public.daraja_b2c_reversals (
  id uuid primary key default gen_random_uuid(),
  payout_request_id uuid not null references public.host_payout_requests(id) on delete restrict,
  payout_attempt_id uuid not null references public.daraja_b2c_attempts(id) on delete restrict,
  idempotency_key text not null unique,
  original_transaction_id text not null,
  amount numeric(12, 2) not null check (amount > 0 and amount = trunc(amount)),
  reason text not null check (char_length(trim(reason)) between 5 and 500),
  conversation_id text unique,
  originator_conversation_id text unique,
  status text not null default 'initializing'
    check (status in ('initializing', 'submitted', 'reversed', 'failed', 'reconciliation_required')),
  result_code text,
  result_description text,
  response_payload jsonb,
  result_payload jsonb,
  timeout_payload jsonb,
  actual_fee numeric(12, 2) check (actual_fee is null or actual_fee >= 0),
  fee_reconciliation_note text,
  initiated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  fee_reconciled_at timestamptz
);

create unique index if not exists daraja_b2c_reversals_active_request_uidx
  on public.daraja_b2c_reversals (payout_request_id)
  where status in ('initializing', 'submitted', 'reconciliation_required');
create index if not exists daraja_b2c_reversals_attempt_created_idx
  on public.daraja_b2c_reversals (payout_attempt_id, created_at desc);

alter table public.daraja_b2c_reversals enable row level security;
revoke all on public.daraja_b2c_reversals from public, anon, authenticated;
grant all on public.daraja_b2c_reversals to service_role;

alter table public.host_payout_requests
  add column if not exists last_daraja_reversal_id uuid references public.daraja_b2c_reversals(id) on delete set null;

create or replace function public.admin_prepare_daraja_b2c_reversal(
  p_request_id uuid,
  p_admin_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns table (
  reversal_id uuid,
  payout_request_id uuid,
  payout_attempt_id uuid,
  original_transaction_id text,
  amount numeric,
  already_active boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row public.host_payout_requests%rowtype;
  payout_attempt public.daraja_b2c_attempts%rowtype;
  existing_reversal public.daraja_b2c_reversals%rowtype;
  reversal_uuid uuid;
  normalized_reason text := nullif(left(trim(coalesce(p_reason, '')), 500), '');
begin
  if not exists (select 1 from public.admin_roles where user_id = p_admin_id and privilege is true) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if nullif(trim(p_idempotency_key), '') is null then raise exception 'MISSING_IDEMPOTENCY_KEY'; end if;
  if normalized_reason is null or char_length(normalized_reason) < 5 then raise exception 'REVERSAL_REASON_REQUIRED'; end if;

  select r.* into request_row from public.host_payout_requests r where r.id = p_request_id for update;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;
  if request_row.status <> 'paid' then raise exception 'PAYOUT_NOT_PAID'; end if;

  select a.* into payout_attempt from public.daraja_b2c_attempts a
   where a.id = request_row.last_daraja_attempt_id
     and a.purpose = 'host_payout'
     and a.status = 'succeeded'
   for update;
  if not found or payout_attempt.transaction_id is null then raise exception 'SUCCESSFUL_B2C_TRANSACTION_NOT_FOUND'; end if;
  if payout_attempt.actual_fee is null then raise exception 'PAYOUT_FEE_NOT_RECONCILED'; end if;

  select r.* into existing_reversal from public.daraja_b2c_reversals r
   where r.idempotency_key = p_idempotency_key for update;
  if found then
    if existing_reversal.payout_request_id <> p_request_id then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return query select existing_reversal.id, existing_reversal.payout_request_id,
      existing_reversal.payout_attempt_id, existing_reversal.original_transaction_id,
      existing_reversal.amount, true;
    return;
  end if;

  select r.* into existing_reversal from public.daraja_b2c_reversals r
   where r.payout_request_id = p_request_id
     and r.status in ('initializing', 'submitted', 'reconciliation_required')
   for update;
  if found then
    return query select existing_reversal.id, existing_reversal.payout_request_id,
      existing_reversal.payout_attempt_id, existing_reversal.original_transaction_id,
      existing_reversal.amount, true;
    return;
  end if;

  insert into public.daraja_b2c_reversals (
    payout_request_id, payout_attempt_id, idempotency_key,
    original_transaction_id, amount, reason, initiated_by, status
  ) values (
    request_row.id, payout_attempt.id, p_idempotency_key,
    payout_attempt.transaction_id, payout_attempt.amount,
    normalized_reason, p_admin_id, 'initializing'
  ) returning id into reversal_uuid;

  update public.host_payout_requests
     set last_daraja_reversal_id = reversal_uuid,
         admin_note = concat_ws(E'\n', nullif(admin_note, ''),
           'Safaricom reversal initiated: ' || normalized_reason),
         updated_at = now()
   where id = request_row.id;

  return query select reversal_uuid, request_row.id, payout_attempt.id,
    payout_attempt.transaction_id, payout_attempt.amount, false;
end;
$$;
revoke all on function public.admin_prepare_daraja_b2c_reversal(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_prepare_daraja_b2c_reversal(uuid, uuid, text, text) to service_role;

create or replace function public.record_daraja_b2c_reversal_submission(
  p_reversal_id uuid,
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
  reversal_row public.daraja_b2c_reversals%rowtype;
begin
  select r.* into reversal_row from public.daraja_b2c_reversals r where r.id = p_reversal_id for update;
  if not found then raise exception 'B2C_REVERSAL_NOT_FOUND'; end if;
  if reversal_row.status in ('submitted', 'reversed') then
    if reversal_row.conversation_id is distinct from p_conversation_id then raise exception 'REVERSAL_CONVERSATION_MISMATCH'; end if;
    return;
  end if;
  if reversal_row.status <> 'initializing' then raise exception 'REVERSAL_NOT_INITIALIZING'; end if;
  update public.daraja_b2c_reversals set status = 'submitted',
    conversation_id = p_conversation_id,
    originator_conversation_id = p_originator_conversation_id,
    response_payload = p_raw_response, updated_at = now()
   where id = p_reversal_id;
end;
$$;
revoke all on function public.record_daraja_b2c_reversal_submission(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_daraja_b2c_reversal_submission(uuid, text, text, jsonb) to service_role;

create or replace function public.settle_daraja_b2c_reversal_result(
  p_conversation_id text,
  p_originator_conversation_id text,
  p_result_code text,
  p_result_description text,
  p_raw_response jsonb
)
returns table (host_id uuid, payout_request_id uuid, reversal_status text, already_processed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reversal_row public.daraja_b2c_reversals%rowtype;
  request_row public.host_payout_requests%rowtype;
  payout_attempt public.daraja_b2c_attempts%rowtype;
  changed_count integer;
begin
  select r.* into reversal_row from public.daraja_b2c_reversals r
   where r.conversation_id = p_conversation_id
     and r.originator_conversation_id = p_originator_conversation_id
   for update;
  if not found then raise exception 'B2C_REVERSAL_NOT_FOUND'; end if;
  select r.* into request_row from public.host_payout_requests r where r.id = reversal_row.payout_request_id for update;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;
  select a.* into payout_attempt from public.daraja_b2c_attempts a where a.id = reversal_row.payout_attempt_id for update;
  if not found then raise exception 'B2C_PAYOUT_ATTEMPT_NOT_FOUND'; end if;

  if reversal_row.status = 'reversed' then
    return query select request_row.host_id, request_row.id, reversal_row.status, true;
    return;
  end if;
  if reversal_row.status not in ('submitted', 'reconciliation_required') then raise exception 'REVERSAL_NOT_SUBMITTED'; end if;
  if request_row.status <> 'paid' or payout_attempt.status <> 'succeeded' then raise exception 'PAYOUT_NOT_REVERSIBLE'; end if;

  if p_result_code <> '0' then
    update public.daraja_b2c_reversals set status = 'failed', result_code = p_result_code,
      result_description = left(p_result_description, 500), result_payload = p_raw_response,
      completed_at = now(), updated_at = now() where id = reversal_row.id;
    return query select request_row.host_id, request_row.id, 'failed'::text, false;
    return;
  end if;

  update public.payouts set status = 'owed', paid_at = null, eligible_for_withdrawal = true
   where id in (select i.payout_id from public.host_payout_request_items i where i.request_id = request_row.id)
     and status = 'paid';
  get diagnostics changed_count = row_count;
  if changed_count = 0 or changed_count <> (
    select count(*) from public.host_payout_request_items i where i.request_id = request_row.id
  ) then raise exception 'PAYOUT_REVERSAL_ITEMS_MISMATCH'; end if;

  update public.profiles
     set host_fee_balance = coalesce(host_fee_balance, 0) + request_row.amount - payout_attempt.amount
   where id = request_row.host_id;
  update public.host_payout_requests set status = 'reversed', reversed_at = now(),
    admin_note = concat_ws(E'\n', nullif(admin_note, ''),
      'Safaricom confirmed the B2C reversal; payout ledger restored pending reversal-fee reconciliation.'),
    updated_at = now()
   where id = request_row.id;
  update public.daraja_b2c_attempts set status = 'reversed', updated_at = now()
   where id = payout_attempt.id;
  update public.daraja_b2c_reversals set status = 'reversed', result_code = p_result_code,
    result_description = left(p_result_description, 500), result_payload = p_raw_response,
    completed_at = now(), updated_at = now()
   where id = reversal_row.id;

  return query select request_row.host_id, request_row.id, 'reversed'::text, false;
end;
$$;
revoke all on function public.settle_daraja_b2c_reversal_result(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.settle_daraja_b2c_reversal_result(text, text, text, text, jsonb) to service_role;

create or replace function public.mark_daraja_b2c_reversal_reconciliation_required(
  p_reversal_id uuid,
  p_description text,
  p_raw_response jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.daraja_b2c_reversals set status = 'reconciliation_required',
    result_description = left(p_description, 500), result_payload = p_raw_response,
    updated_at = now()
   where id = p_reversal_id and status in ('initializing', 'submitted', 'reconciliation_required');
end;
$$;
revoke all on function public.mark_daraja_b2c_reversal_reconciliation_required(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.mark_daraja_b2c_reversal_reconciliation_required(uuid, text, jsonb) to service_role;

create or replace function public.reconcile_daraja_b2c_reversal_fee(
  p_reversal_id uuid,
  p_actual_fee numeric,
  p_admin_id uuid,
  p_admin_note text default null
)
returns table (host_id uuid, host_fee_balance numeric, already_reconciled boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reversal_row public.daraja_b2c_reversals%rowtype;
  request_row public.host_payout_requests%rowtype;
  balance numeric(12, 2);
begin
  if not exists (select 1 from public.admin_roles where user_id = p_admin_id and privilege is true) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_actual_fee is null or p_actual_fee < 0 then raise exception 'INVALID_ACTUAL_FEE'; end if;
  select r.* into reversal_row from public.daraja_b2c_reversals r where r.id = p_reversal_id for update;
  if not found or reversal_row.status <> 'reversed' then raise exception 'B2C_REVERSAL_NOT_CONFIRMED'; end if;
  select r.* into request_row from public.host_payout_requests r where r.id = reversal_row.payout_request_id for update;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;
  if reversal_row.actual_fee is not null then
    if reversal_row.actual_fee <> p_actual_fee then raise exception 'REVERSAL_FEE_ALREADY_RECONCILED'; end if;
    select p.host_fee_balance into balance from public.profiles p where p.id = request_row.host_id;
    return query select request_row.host_id, balance, true;
    return;
  end if;
  update public.profiles set host_fee_balance = coalesce(host_fee_balance, 0) + p_actual_fee
   where id = request_row.host_id returning host_fee_balance into balance;
  update public.daraja_b2c_reversals set actual_fee = p_actual_fee,
    fee_reconciliation_note = nullif(left(trim(coalesce(p_admin_note, '')), 500), ''),
    fee_reconciled_at = now(), updated_at = now()
   where id = reversal_row.id;
  update public.host_payout_requests set admin_note = concat_ws(E'\n', nullif(admin_note, ''),
    'Safaricom reversal fee reconciled: KES ' || p_actual_fee::text), updated_at = now()
   where id = request_row.id;
  return query select request_row.host_id, balance, false;
end;
$$;
revoke all on function public.reconcile_daraja_b2c_reversal_fee(uuid, numeric, uuid, text) from public, anon, authenticated;
grant execute on function public.reconcile_daraja_b2c_reversal_fee(uuid, numeric, uuid, text) to service_role;