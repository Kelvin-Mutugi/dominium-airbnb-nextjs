create or replace function public.create_host_payout_request_with_amount(
  p_host_id uuid,
  p_request_amount numeric,
  p_mpesa_number text
)
returns table (request_id uuid, request_amount numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_row public.profiles%rowtype;
  payout_row record;
  new_request_id uuid;
  available_for_request numeric(12, 2);
  amount_left numeric(12, 2);
  item_amount numeric(12, 2);
begin
  if p_request_amount is null or p_request_amount <= 0
     or round(p_request_amount, 2) <> p_request_amount then
    raise exception 'INVALID_PAYOUT_REQUEST_AMOUNT';
  end if;
  if p_mpesa_number is null or p_mpesa_number !~ '^254[17][0-9]{8}$' then
    raise exception 'INVALID_MPESA_DESTINATION';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_host_id::text, 4));
  select p.* into profile_row
    from public.profiles p
   where p.id = p_host_id
   for update;
  if not found then raise exception 'HOST_NOT_FOUND'; end if;
  if profile_row.role <> 'host' then raise exception 'HOST_REQUIRED'; end if;

  select round(coalesce(sum(remaining.amount), 0), 2)
    into available_for_request
    from (
      select greatest(
        p.amount - coalesce((
          select sum(i.amount)
            from public.host_payout_request_items i
            join public.host_payout_requests r on r.id = i.request_id
           where i.payout_id = p.id
             and r.status in ('requested', 'processing', 'paid')
        ), 0),
        0
      ) as amount
        from public.payouts p
       where p.host_id = p_host_id
         and p.status = 'owed'
         and p.eligible_for_withdrawal
    ) remaining;

  if available_for_request <= 0 then raise exception 'NO_PAYOUTS_AVAILABLE'; end if;
  if p_request_amount > available_for_request then
    raise exception 'INVALID_PAYOUT_REQUEST_AMOUNT';
  end if;
  if p_request_amount - coalesce(profile_row.host_fee_balance, 0) <= 0 then
    raise exception 'PAYOUT_PROCESSING_FEES_EXCEED_REQUEST';
  end if;

  insert into public.host_payout_requests (
    host_id, amount, destination_method, destination_details
  ) values (
    p_host_id,
    p_request_amount,
    'mpesa',
    jsonb_build_object('phone', p_mpesa_number, 'mpesa_number', p_mpesa_number)
  )
  returning id into new_request_id;

  amount_left := p_request_amount;
  for payout_row in
    select p.id, p.amount
      from public.payouts p
     where p.host_id = p_host_id
       and p.status = 'owed'
       and p.eligible_for_withdrawal
     order by p.created_at, p.id
     for update
  loop
    exit when amount_left <= 0;
    select greatest(
      payout_row.amount - coalesce(sum(i.amount), 0),
      0
    )
      into available_for_request
      from public.host_payout_request_items i
      join public.host_payout_requests r on r.id = i.request_id
     where i.payout_id = payout_row.id
       and r.status in ('requested', 'processing', 'paid');

    item_amount := least(available_for_request, amount_left);
    if item_amount > 0 then
      insert into public.host_payout_request_items (request_id, payout_id, amount)
      values (new_request_id, payout_row.id, item_amount);
      amount_left := round(amount_left - item_amount, 2);
    end if;
  end loop;

  if amount_left > 0 then raise exception 'INVALID_PAYOUT_REQUEST_AMOUNT'; end if;
  return query select new_request_id, p_request_amount;
end;
$$;
revoke all on function public.create_host_payout_request_with_amount(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.create_host_payout_request_with_amount(uuid, numeric, text) to service_role;

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
  select a.* into attempt_row
    from public.daraja_b2c_attempts a
   where a.conversation_id = p_conversation_id
     and a.originator_conversation_id = p_originator_conversation_id
   for update;
  if not found then raise exception 'B2C_ATTEMPT_NOT_FOUND'; end if;
  select r.* into request_row
    from public.host_payout_requests r
   where r.id = attempt_row.payout_request_id
   for update;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;

  if attempt_row.status = 'succeeded' then
    return query select request_row.host_id, request_row.id, request_row.status, true;
    return;
  end if;
  if attempt_row.status not in ('submitted', 'reconciliation_required') then
    raise exception 'B2C_ATTEMPT_NOT_SUBMITTED';
  end if;
  if request_row.status <> 'processing' then raise exception 'PAYOUT_REQUEST_NOT_PROCESSING'; end if;

  if p_result_code <> '0' then
    update public.daraja_b2c_attempts
       set status = 'failed', result_code = p_result_code,
           result_description = left(p_result_description, 500),
           result_payload = p_raw_response, completed_at = now(), updated_at = now()
     where id = attempt_row.id;
    update public.host_payout_requests
       set admin_note = concat_ws(E'\n', nullif(admin_note, ''),
         'Safaricom reported B2C failure; confirm the transfer did not complete before retry or cancellation.'),
           updated_at = now()
     where id = request_row.id;
    return query select request_row.host_id, request_row.id, request_row.status, false;
    return;
  end if;

  if nullif(trim(p_transaction_id), '') is null then raise exception 'B2C_TRANSACTION_ID_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(request_row.host_id::text, 4));

  select count(*)::integer
    into item_count
    from public.host_payout_request_items i
   where i.request_id = request_row.id;
  if item_count = 0 or round((
    select coalesce(sum(i.amount), 0)
      from public.host_payout_request_items i
     where i.request_id = request_row.id
  ), 2) <> request_row.amount then
    raise exception 'PAYOUT_ITEMS_NOT_AVAILABLE';
  end if;
  if exists (
    select 1
      from public.host_payout_request_items current_item
      join public.payouts p on p.id = current_item.payout_id
     where current_item.request_id = request_row.id
       and (
         p.status <> 'owed'
         or not p.eligible_for_withdrawal
         or coalesce((
           select sum(i.amount)
             from public.host_payout_request_items i
             join public.host_payout_requests r on r.id = i.request_id
            where i.payout_id = p.id
              and r.status in ('requested', 'processing', 'paid')
         ), 0) > p.amount
       )
  ) then
    raise exception 'PAYOUT_ITEMS_NOT_AVAILABLE';
  end if;

  update public.daraja_b2c_attempts
     set status = 'succeeded', result_code = p_result_code,
         result_description = left(p_result_description, 500),
         transaction_id = p_transaction_id, result_payload = p_raw_response,
         completed_at = now(), updated_at = now()
   where id = attempt_row.id;
  update public.host_payout_requests
     set status = 'paid', transfer_fee = attempt_row.estimated_fee,
         net_amount = attempt_row.amount, external_reference = p_transaction_id,
         processed_at = now(), processed_by = attempt_row.initiated_by, updated_at = now()
   where id = request_row.id;

  update public.payouts p
     set status = 'paid', paid_at = now()
   where p.status = 'owed'
     and p.id in (
       select i.payout_id
         from public.host_payout_request_items i
        where i.request_id = request_row.id
     )
     and coalesce((
       select sum(i.amount)
         from public.host_payout_request_items i
         join public.host_payout_requests r on r.id = i.request_id
        where i.payout_id = p.id
          and r.status = 'paid'
     ), 0) >= p.amount;

  update public.profiles
     set host_fee_balance = coalesce(host_fee_balance, 0) - attempt_row.fee_balance_applied
   where id = request_row.host_id;

  return query select request_row.host_id, request_row.id, 'paid'::text, false;
end;
$$;
revoke all on function public.settle_daraja_b2c_result(text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.settle_daraja_b2c_result(text, text, text, text, text, jsonb) to service_role;

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
  item_count integer;
begin
  select r.* into reversal_row
    from public.daraja_b2c_reversals r
   where r.conversation_id = p_conversation_id
     and r.originator_conversation_id = p_originator_conversation_id
   for update;
  if not found then raise exception 'B2C_REVERSAL_NOT_FOUND'; end if;
  select r.* into request_row
    from public.host_payout_requests r
   where r.id = reversal_row.payout_request_id
   for update;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;
  select a.* into payout_attempt
    from public.daraja_b2c_attempts a
   where a.id = reversal_row.payout_attempt_id
   for update;
  if not found then raise exception 'B2C_PAYOUT_ATTEMPT_NOT_FOUND'; end if;

  if reversal_row.status = 'reversed' then
    return query select request_row.host_id, request_row.id, reversal_row.status, true;
    return;
  end if;
  if reversal_row.status not in ('submitted', 'reconciliation_required') then
    raise exception 'REVERSAL_NOT_SUBMITTED';
  end if;
  if request_row.status <> 'paid' or payout_attempt.status <> 'succeeded' then
    raise exception 'PAYOUT_NOT_REVERSIBLE';
  end if;

  if p_result_code <> '0' then
    update public.daraja_b2c_reversals
       set status = 'failed', result_code = p_result_code,
           result_description = left(p_result_description, 500),
           result_payload = p_raw_response, completed_at = now(), updated_at = now()
     where id = reversal_row.id;
    return query select request_row.host_id, request_row.id, 'failed'::text, false;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(request_row.host_id::text, 4));
  select count(*)::integer into item_count
    from public.host_payout_request_items i
   where i.request_id = request_row.id;
  if item_count = 0 then raise exception 'PAYOUT_REVERSAL_ITEMS_MISMATCH'; end if;

  update public.profiles
     set host_fee_balance = coalesce(host_fee_balance, 0) + request_row.amount - payout_attempt.amount
   where id = request_row.host_id;
  update public.host_payout_requests
     set status = 'reversed', reversed_at = now(),
         admin_note = concat_ws(E'\n', nullif(admin_note, ''),
           'Safaricom confirmed the B2C reversal; payout processing fee may apply to a future payout.'),
         updated_at = now()
   where id = request_row.id;

  update public.payouts p
     set status = case
           when coalesce((
             select sum(i.amount)
               from public.host_payout_request_items i
               join public.host_payout_requests r on r.id = i.request_id
              where i.payout_id = p.id and r.status = 'paid'
           ), 0) >= p.amount then 'paid'::public.payout_status
           else 'owed'::public.payout_status
         end,
         paid_at = case
           when coalesce((
             select sum(i.amount)
               from public.host_payout_request_items i
               join public.host_payout_requests r on r.id = i.request_id
              where i.payout_id = p.id and r.status = 'paid'
           ), 0) >= p.amount then p.paid_at
           else null
         end,
         eligible_for_withdrawal = true
   where p.id in (
     select i.payout_id
       from public.host_payout_request_items i
      where i.request_id = request_row.id
   );

  update public.daraja_b2c_attempts set status = 'reversed', updated_at = now()
   where id = payout_attempt.id;
  update public.daraja_b2c_reversals
     set status = 'reversed', result_code = p_result_code,
         result_description = left(p_result_description, 500),
         result_payload = p_raw_response, completed_at = now(), updated_at = now()
   where id = reversal_row.id;

  return query select request_row.host_id, request_row.id, 'reversed'::text, false;
end;
$$;
revoke all on function public.settle_daraja_b2c_reversal_result(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.settle_daraja_b2c_reversal_result(text, text, text, text, jsonb) to service_role;
