alter table public.payments
  add column if not exists provider_fee_amount numeric(12, 2) not null default 0;

alter table public.bookings
  add column if not exists collection_fee_amount numeric(12, 2) not null default 0;

alter table public.daraja_payment_attempts
  add column if not exists actual_collection_fee numeric(12, 2),
  add column if not exists fee_reconciliation_note text,
  add column if not exists fee_reconciled_at timestamptz,
  add column if not exists fee_reconciled_by uuid references auth.users(id) on delete set null;

alter table public.daraja_b2c_attempts
  alter column payout_request_id drop not null,
  add column if not exists purpose text not null default 'host_payout',
  add column if not exists payment_refund_request_id uuid references public.payment_refund_requests(id) on delete restrict,
  add column if not exists cancellation_refund_request_id uuid references public.booking_change_requests(id) on delete restrict;

alter table public.daraja_b2c_attempts
  add column if not exists fee_reconciliation_note text;

alter table public.daraja_b2c_attempts
  drop constraint if exists daraja_b2c_attempts_purpose_links_check,
  add constraint daraja_b2c_attempts_purpose_check
    check (purpose in ('host_payout', 'guest_payment_refund', 'cancellation_refund')),
  add constraint daraja_b2c_attempts_purpose_links_check check (
    (purpose = 'host_payout' and payout_request_id is not null
      and payment_refund_request_id is null and cancellation_refund_request_id is null)
    or (purpose = 'guest_payment_refund' and payout_request_id is null
      and payment_refund_request_id is not null and cancellation_refund_request_id is null)
    or (purpose = 'cancellation_refund' and payout_request_id is null
      and payment_refund_request_id is null and cancellation_refund_request_id is not null)
  );

drop index if exists public.daraja_b2c_attempts_active_request_uidx;
create unique index daraja_b2c_attempts_active_payout_uidx
  on public.daraja_b2c_attempts (payout_request_id)
  where purpose = 'host_payout' and payout_request_id is not null
    and status in ('initializing', 'submitted', 'reconciliation_required');
create unique index daraja_b2c_attempts_active_payment_refund_uidx
  on public.daraja_b2c_attempts (payment_refund_request_id)
  where purpose = 'guest_payment_refund' and payment_refund_request_id is not null
    and status in ('initializing', 'submitted', 'reconciliation_required');
create unique index daraja_b2c_attempts_active_cancellation_refund_uidx
  on public.daraja_b2c_attempts (cancellation_refund_request_id)
  where purpose = 'cancellation_refund' and cancellation_refund_request_id is not null
    and status in ('initializing', 'submitted', 'reconciliation_required');

create or replace function public.admin_prepare_daraja_refund(
  p_refund_kind text,
  p_request_id uuid,
  p_admin_id uuid,
  p_amount numeric,
  p_idempotency_key text
)
returns table (attempt_id uuid, booking_id uuid, transfer_amount numeric, phone_number text, already_active boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  booking_row public.bookings%rowtype;
  refund_request public.payment_refund_requests%rowtype;
  cancellation_request public.booking_change_requests%rowtype;
  existing_attempt public.daraja_b2c_attempts%rowtype;
  maximum_amount numeric(12, 2);
  whole_amount numeric(12, 2);
  normalized_phone text;
  attempt_uuid uuid;
begin
  if not exists (select 1 from public.admin_roles where user_id = p_admin_id and privilege is true) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_refund_kind not in ('guest_payment_refund', 'cancellation_refund') then raise exception 'INVALID_REFUND_KIND'; end if;
  if nullif(trim(p_idempotency_key), '') is null then raise exception 'MISSING_IDEMPOTENCY_KEY'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_REFUND_AMOUNT'; end if;

  if p_refund_kind = 'guest_payment_refund' then
    select r.* into refund_request from public.payment_refund_requests r where r.id = p_request_id for update;
    if not found then raise exception 'REFUND_REQUEST_NOT_FOUND'; end if;
    if refund_request.status <> 'awaiting_manual_processing' then raise exception 'REFUND_NOT_APPROVED_FOR_PROCESSING'; end if;
    maximum_amount := refund_request.amount_paid;
    select b.* into booking_row from public.bookings b where b.id = refund_request.booking_id for update;
  else
    select r.* into cancellation_request
      from public.booking_change_requests r
     where r.id = p_request_id and r.request_type = 'cancellation'
     for update;
    if not found then raise exception 'REFUND_REQUEST_NOT_FOUND'; end if;
    if cancellation_request.status <> 'approved'
       or cancellation_request.refund_processing_status <> 'awaiting_manual_processing' then
      raise exception 'REFUND_NOT_APPROVED_FOR_PROCESSING';
    end if;
    maximum_amount := cancellation_request.estimated_refund_amount;
    select b.* into booking_row from public.bookings b where b.id = cancellation_request.booking_id for update;
  end if;
  if not found then raise exception 'REFUND_BOOKING_NOT_FOUND'; end if;
  if booking_row.status = 'completed' then raise exception 'STAY_ALREADY_COMPLETED'; end if;
  if p_amount > maximum_amount then raise exception 'INVALID_REFUND_AMOUNT'; end if;

  whole_amount := floor(p_amount);
  if whole_amount <= 0 then raise exception 'REFUND_AMOUNT_BELOW_ONE_KES'; end if;
  normalized_phone := regexp_replace(coalesce(booking_row.guest_phone, ''), '[^0-9]', '', 'g');
  if left(normalized_phone, 1) = '0' then
    normalized_phone := '254' || substring(normalized_phone from 2);
  elsif left(normalized_phone, 1) in ('7', '1') then
    normalized_phone := '254' || normalized_phone;
  end if;
  if normalized_phone !~ '^254[17][0-9]{8}$' then raise exception 'INVALID_GUEST_MPESA_PHONE'; end if;

  select a.* into existing_attempt
    from public.daraja_b2c_attempts a
   where a.purpose = p_refund_kind
     and a.status in ('initializing', 'submitted', 'reconciliation_required')
     and (
       (p_refund_kind = 'guest_payment_refund' and a.payment_refund_request_id = p_request_id)
       or (p_refund_kind = 'cancellation_refund' and a.cancellation_refund_request_id = p_request_id)
     )
   for update;
  if found then
    return query select existing_attempt.id, booking_row.id, existing_attempt.amount,
      existing_attempt.phone_number, true;
    return;
  end if;

  select a.* into existing_attempt
    from public.daraja_b2c_attempts a
   where a.idempotency_key = p_idempotency_key
   for update;
  if found then
    if p_refund_kind = 'guest_payment_refund'
       and existing_attempt.payment_refund_request_id <> p_request_id then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    elsif p_refund_kind = 'cancellation_refund'
       and existing_attempt.cancellation_refund_request_id <> p_request_id then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return query select existing_attempt.id, booking_row.id, existing_attempt.amount,
      existing_attempt.phone_number, true;
    return;
  end if;

  insert into public.daraja_b2c_attempts (
    purpose, payment_refund_request_id, cancellation_refund_request_id,
    idempotency_key, phone_number, amount, estimated_fee, fee_balance_applied,
    initiated_by, status
  ) values (
    p_refund_kind,
    case when p_refund_kind = 'guest_payment_refund' then p_request_id else null end,
    case when p_refund_kind = 'cancellation_refund' then p_request_id else null end,
    p_idempotency_key, normalized_phone, whole_amount, 0, 0, p_admin_id, 'initializing'
  ) returning id into attempt_uuid;

  return query select attempt_uuid, booking_row.id, whole_amount, normalized_phone, false;
end;
$$;
revoke all on function public.admin_prepare_daraja_refund(text, uuid, uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.admin_prepare_daraja_refund(text, uuid, uuid, numeric, text) to service_role;

drop function if exists public.settle_daraja_b2c_result(text, text, text, text, text, jsonb);
create function public.settle_daraja_b2c_result(
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
  payment_refund public.payment_refund_requests%rowtype;
  cancellation_refund public.booking_change_requests%rowtype;
  booking_row public.bookings%rowtype;
  item_count integer;
begin
  select a.* into attempt_row from public.daraja_b2c_attempts a
   where a.conversation_id = p_conversation_id
     and a.originator_conversation_id = p_originator_conversation_id
   for update;
  if not found then raise exception 'B2C_ATTEMPT_NOT_FOUND'; end if;
  if attempt_row.status = 'succeeded' then
    if attempt_row.purpose = 'host_payout' then
      select r.* into request_row from public.host_payout_requests r where r.id = attempt_row.payout_request_id;
      return query select request_row.host_id, request_row.id, request_row.status, true;
    else
      select b.* into booking_row from public.bookings b
       where b.id = coalesce(
         (select r.booking_id from public.payment_refund_requests r where r.id = attempt_row.payment_refund_request_id),
         (select r.booking_id from public.booking_change_requests r where r.id = attempt_row.cancellation_refund_request_id)
       );
      return query select booking_row.host_id, null::uuid, 'processed'::text, true;
    end if;
    return;
  end if;
  if attempt_row.status not in ('submitted', 'reconciliation_required') then raise exception 'B2C_ATTEMPT_NOT_SUBMITTED'; end if;

  if attempt_row.purpose = 'host_payout' then
    select r.* into request_row from public.host_payout_requests r where r.id = attempt_row.payout_request_id for update;
    if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;
    if request_row.status <> 'processing' then raise exception 'PAYOUT_REQUEST_NOT_PROCESSING'; end if;
  elsif attempt_row.purpose = 'guest_payment_refund' then
    select r.* into payment_refund from public.payment_refund_requests r
     where r.id = attempt_row.payment_refund_request_id for update;
    if not found or payment_refund.status <> 'awaiting_manual_processing' then raise exception 'REFUND_NOT_APPROVED_FOR_PROCESSING'; end if;
    select b.* into booking_row from public.bookings b where b.id = payment_refund.booking_id for update;
  else
    select r.* into cancellation_refund from public.booking_change_requests r
     where r.id = attempt_row.cancellation_refund_request_id for update;
    if not found or cancellation_refund.status <> 'approved'
       or cancellation_refund.refund_processing_status <> 'awaiting_manual_processing' then
      raise exception 'REFUND_NOT_APPROVED_FOR_PROCESSING';
    end if;
    select b.* into booking_row from public.bookings b where b.id = cancellation_refund.booking_id for update;
  end if;

  if p_result_code <> '0' then
    update public.daraja_b2c_attempts set status = 'failed', result_code = p_result_code,
      result_description = left(p_result_description, 500), result_payload = p_raw_response,
      completed_at = now(), updated_at = now() where id = attempt_row.id;
    return query select coalesce(request_row.host_id, booking_row.host_id),
      request_row.id, 'awaiting_manual_processing'::text, false;
    return;
  end if;
  if nullif(trim(p_transaction_id), '') is null then raise exception 'B2C_TRANSACTION_ID_REQUIRED'; end if;

  if attempt_row.purpose = 'host_payout' then
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
    update public.host_payout_requests set status = 'paid', transfer_fee = attempt_row.estimated_fee,
      net_amount = attempt_row.amount, external_reference = p_transaction_id,
      processed_at = now(), processed_by = attempt_row.initiated_by, updated_at = now()
     where id = request_row.id;
    update public.profiles set host_fee_balance = coalesce(host_fee_balance, 0) - attempt_row.fee_balance_applied
     where id = request_row.host_id;
  else
    if booking_row.status = 'completed' then raise exception 'STAY_ALREADY_COMPLETED'; end if;
    if attempt_row.purpose = 'guest_payment_refund' then
      update public.payment_refund_requests set status = 'processed',
        actual_refund_amount = attempt_row.amount, transaction_reference = p_transaction_id,
        processed_at = now(), updated_at = now()
       where id = payment_refund.id and status = 'awaiting_manual_processing';
      if attempt_row.amount >= payment_refund.amount_paid then
        update public.payments set status = 'refunded'
         where id = payment_refund.payment_id and status in ('paid', 'success');
      end if;
    else
      update public.booking_change_requests set refund_processing_status = 'processed',
        actual_refund_amount = attempt_row.amount,
        refund_transaction_reference = p_transaction_id,
        refund_processed_at = now()
       where id = cancellation_refund.id and refund_processing_status = 'awaiting_manual_processing';
      if attempt_row.amount >= cancellation_refund.amount_paid then
        update public.payments set status = 'refunded'
         where booking_id = cancellation_refund.booking_id and status in ('paid', 'success');
      end if;
    end if;

    if booking_row.guest_id is not null then
      insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
      values (
        booking_row.id,
        attempt_row.initiated_by,
        'payment_status_changed',
        'Safaricom confirmed a guest refund of KES ' || to_char(attempt_row.amount, 'FM999999999990.00'),
        jsonb_build_object(
          'refund_status', 'processed',
          'amount', attempt_row.amount,
          'provider', 'safaricom',
          'transaction_reference', p_transaction_id
        )
      );
    end if;
  end if;

  update public.daraja_b2c_attempts set status = 'succeeded', result_code = p_result_code,
    result_description = left(p_result_description, 500), transaction_id = p_transaction_id,
    result_payload = p_raw_response, completed_at = now(), updated_at = now()
   where id = attempt_row.id;
  if attempt_row.purpose = 'host_payout' then
    return query select request_row.host_id, request_row.id, 'paid'::text, false;
  else
    return query select booking_row.host_id, null::uuid, 'processed'::text, false;
  end if;
end;
$$;
revoke all on function public.settle_daraja_b2c_result(text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.settle_daraja_b2c_result(text, text, text, text, text, jsonb) to service_role;

create or replace function public.reconcile_daraja_b2c_fee(
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
  booking_row public.bookings%rowtype;
  difference numeric(12, 2);
  updated_balance numeric(12, 2);
begin
  if not exists (select 1 from public.admin_roles where user_id = p_admin_id and privilege is true) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_actual_fee is null or p_actual_fee < 0 then raise exception 'INVALID_ACTUAL_FEE'; end if;
  select a.* into attempt_row from public.daraja_b2c_attempts a where a.id = p_attempt_id for update;
  if not found or attempt_row.status <> 'succeeded' then raise exception 'B2C_ATTEMPT_NOT_SUCCEEDED'; end if;

  if attempt_row.purpose = 'host_payout' then
    select r.* into request_row from public.host_payout_requests r where r.id = attempt_row.payout_request_id for update;
    if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;
    select p.host_fee_balance into updated_balance from public.profiles p where p.id = request_row.host_id for update;
    difference := round(p_actual_fee + attempt_row.amount - (request_row.amount - attempt_row.fee_balance_applied), 2);
  else
    select b.* into booking_row from public.bookings b
     where b.id = coalesce(
       (select r.booking_id from public.payment_refund_requests r where r.id = attempt_row.payment_refund_request_id),
       (select r.booking_id from public.booking_change_requests r where r.id = attempt_row.cancellation_refund_request_id)
     ) for update;
    if not found then raise exception 'REFUND_BOOKING_NOT_FOUND'; end if;
    select p.host_fee_balance into updated_balance from public.profiles p where p.id = booking_row.host_id for update;
    difference := p_actual_fee;
  end if;

  if attempt_row.actual_fee is not null then
    if attempt_row.actual_fee <> p_actual_fee then raise exception 'B2C_FEE_ALREADY_RECONCILED'; end if;
    return query select coalesce(request_row.host_id, booking_row.host_id),
      coalesce(request_row.fee_difference, attempt_row.actual_fee), updated_balance;
    return;
  end if;

  update public.profiles set host_fee_balance = coalesce(host_fee_balance, 0) + difference
   where id = coalesce(request_row.host_id, booking_row.host_id)
   returning host_fee_balance into updated_balance;
  update public.daraja_b2c_attempts set actual_fee = p_actual_fee, updated_at = now() where id = attempt_row.id;
  update public.daraja_b2c_attempts set fee_reconciliation_note = nullif(left(trim(coalesce(p_admin_note, '')), 500), '')
   where id = attempt_row.id;
  if attempt_row.purpose = 'host_payout' then
    update public.host_payout_requests set transfer_fee = p_actual_fee, fee_difference = difference,
      admin_note = coalesce(nullif(trim(p_admin_note), ''), admin_note), updated_at = now()
     where id = request_row.id;
  end if;
  return query select coalesce(request_row.host_id, booking_row.host_id), difference, updated_balance;
end;
$$;
revoke all on function public.reconcile_daraja_b2c_fee(uuid, numeric, uuid, text) from public, anon, authenticated;
grant execute on function public.reconcile_daraja_b2c_fee(uuid, numeric, uuid, text) to service_role;

create or replace function public.reconcile_daraja_collection_fee(
  p_attempt_id uuid,
  p_actual_fee numeric,
  p_admin_id uuid,
  p_admin_note text default null
)
returns table (booking_id uuid, host_id uuid, actual_fee numeric, host_fee_balance numeric, already_reconciled boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  attempt_row public.daraja_payment_attempts%rowtype;
  booking_row public.bookings%rowtype;
  balance numeric(12, 2);
begin
  if not exists (select 1 from public.admin_roles where user_id = p_admin_id and privilege is true) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_actual_fee is null or p_actual_fee < 0 then raise exception 'INVALID_ACTUAL_COLLECTION_FEE'; end if;
  select a.* into attempt_row from public.daraja_payment_attempts a where a.id = p_attempt_id for update;
  if not found or attempt_row.status not in ('succeeded', 'late_success') then raise exception 'DARAJA_PAYMENT_NOT_SUCCESSFUL'; end if;
  select b.* into booking_row from public.bookings b where b.id = attempt_row.booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  if attempt_row.actual_collection_fee is not null then
    if attempt_row.actual_collection_fee <> p_actual_fee then raise exception 'COLLECTION_FEE_ALREADY_RECONCILED'; end if;
    select p.host_fee_balance into balance from public.profiles p where p.id = booking_row.host_id;
    return query select booking_row.id, booking_row.host_id, p_actual_fee, balance, true;
    return;
  end if;

  update public.profiles set host_fee_balance = coalesce(host_fee_balance, 0) + p_actual_fee
   where id = booking_row.host_id returning host_fee_balance into balance;
  update public.daraja_payment_attempts set actual_collection_fee = p_actual_fee,
    fee_reconciliation_note = nullif(left(trim(coalesce(p_admin_note, '')), 500), ''),
    fee_reconciled_at = now(), fee_reconciled_by = p_admin_id, updated_at = now()
   where id = attempt_row.id;
  update public.payments set provider_fee_amount = p_actual_fee where id = attempt_row.payment_id;
  update public.bookings set collection_fee_amount = p_actual_fee, collection_fee_reconciled = true
   where id = booking_row.id;
  update public.payouts set eligible_for_withdrawal = true
   where booking_id = booking_row.id and status in ('processing', 'owed')
     and exists (select 1 from public.payments p where p.booking_id = booking_row.id and p.status = 'paid')
     and jsonb_typeof(booking_row.pricing_snapshot->'line_items') = 'array'
     and booking_row.host_gross_amount > 0;
  return query select booking_row.id, booking_row.host_id, p_actual_fee, balance, false;
end;
$$;
revoke all on function public.reconcile_daraja_collection_fee(uuid, numeric, uuid, text) from public, anon, authenticated;
grant execute on function public.reconcile_daraja_collection_fee(uuid, numeric, uuid, text) to service_role;