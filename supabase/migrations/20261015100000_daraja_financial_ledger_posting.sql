create or replace function public.post_daraja_stk_financial_transaction(
  p_checkout_request_id text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  attempt_row public.daraja_payment_attempts%rowtype;
  payment_row public.payments%rowtype;
  booking_row public.bookings%rowtype;
  transaction_id uuid;
  guest_amount numeric(12, 2);
  host_amount numeric(12, 2);
  platform_amount numeric(12, 2);
  entries jsonb;
  is_late boolean;
begin
  select a.* into attempt_row
    from public.daraja_payment_attempts a
   where a.checkout_request_id = p_checkout_request_id;
  if not found then raise exception 'DARAJA_ATTEMPT_NOT_FOUND'; end if;
  if attempt_row.status not in ('succeeded', 'late_success') then
    raise exception 'DARAJA_PAYMENT_NOT_SUCCESSFUL';
  end if;

  select p.* into payment_row from public.payments p where p.id = attempt_row.payment_id;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  select b.* into booking_row from public.bookings b where b.id = attempt_row.booking_id;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  guest_amount := round(attempt_row.amount, 2);
  is_late := attempt_row.status = 'late_success'
    or booking_row.status not in ('confirmed', 'completed')
    or payment_row.status::text <> 'paid';

  if is_late then
    entries := jsonb_build_array(
      jsonb_build_object('account_code', '1100_M_PESA_CLEARING', 'debit_amount', guest_amount),
      jsonb_build_object('account_code', '3100_GUEST_REFUND_PAYABLE', 'credit_amount', guest_amount)
    );
    transaction_id := public.post_financial_transaction(
      'late_guest_payment_received', 'payment', payment_row.id::text,
      booking_row.id, payment_row.id, null, booking_row.host_id,
      'KES', 'daraja-stk-attempt:' || attempt_row.id::text,
      'Successful M-PESA collection received after the booking could not be confirmed.',
      jsonb_build_object('provider', 'safaricom', 'attempt_id', attempt_row.id,
        'receipt_number', attempt_row.mpesa_receipt_number,
        'checkout_request_id', p_checkout_request_id, 'requires_refund_or_reconciliation', true),
      entries
    );
    return transaction_id;
  end if;

  host_amount := round(booking_row.host_payout_amount, 2);
  platform_amount := round(guest_amount - host_amount, 2);
  if guest_amount <= 0 or host_amount < 0 or platform_amount < 0 then
    raise exception 'INVALID_DARAJA_COLLECTION_LEDGER_AMOUNTS';
  end if;

  entries := jsonb_build_array(
    jsonb_build_object('account_code', '1100_M_PESA_CLEARING', 'debit_amount', guest_amount)
  );
  if host_amount > 0 then
    entries := entries || jsonb_build_array(
      jsonb_build_object('account_code', '2100_HOST_PAYABLES', 'credit_amount', host_amount)
    );
  end if;
  if platform_amount > 0 then
    entries := entries || jsonb_build_array(
      jsonb_build_object('account_code', '2200_DEFERRED_PLATFORM_REVENUE', 'credit_amount', platform_amount)
    );
  end if;

  transaction_id := public.post_financial_transaction(
    'guest_payment_received', 'payment', payment_row.id::text,
    booking_row.id, payment_row.id, null, booking_row.host_id,
    'KES', 'daraja-stk-attempt:' || attempt_row.id::text,
    'Verified Safaricom STK collection',
    jsonb_build_object('provider', 'safaricom', 'attempt_id', attempt_row.id,
      'receipt_number', attempt_row.mpesa_receipt_number,
      'checkout_request_id', p_checkout_request_id,
      'booking_commission_amount', booking_row.commission_amount,
      'guest_rounding_adjustment', booking_row.guest_rounding_adjustment),
    entries
  );
  return transaction_id;
end;
$$;
revoke all on function public.post_daraja_stk_financial_transaction(text) from public, anon, authenticated;
grant execute on function public.post_daraja_stk_financial_transaction(text) to service_role;

create or replace function public.post_daraja_b2c_financial_transactions(
  p_conversation_id text,
  p_originator_conversation_id text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  attempt_row public.daraja_b2c_attempts%rowtype;
  request_row public.host_payout_requests%rowtype;
  refund_request public.payment_refund_requests%rowtype;
  cancellation_request public.booking_change_requests%rowtype;
  booking_row public.bookings%rowtype;
  payment_row public.payments%rowtype;
  item_row record;
  entries jsonb;
  posted_count integer := 0;
begin
  select a.* into attempt_row
    from public.daraja_b2c_attempts a
   where a.conversation_id = p_conversation_id
     and a.originator_conversation_id = p_originator_conversation_id;
  if not found then raise exception 'B2C_ATTEMPT_NOT_FOUND'; end if;
  if attempt_row.status <> 'succeeded'
     and not (attempt_row.status = 'reversed' and attempt_row.purpose = 'host_payout') then
    raise exception 'B2C_ATTEMPT_NOT_SUCCEEDED';
  end if;

  if attempt_row.purpose = 'host_payout' then
    select r.* into request_row from public.host_payout_requests r
     where r.id = attempt_row.payout_request_id;
    if not found or request_row.status not in ('paid', 'reversed') then
      raise exception 'PAYOUT_NOT_SETTLED';
    end if;

    for item_row in
      select i.payout_id, i.amount, p.booking_id
        from public.host_payout_request_items i
        join public.payouts p on p.id = i.payout_id
       where i.request_id = request_row.id
       order by i.payout_id
    loop
      entries := jsonb_build_array(
        jsonb_build_object('account_code', '2100_HOST_PAYABLES', 'debit_amount', item_row.amount),
        jsonb_build_object('account_code', '6100_HOST_PAYOUT_LIABILITIES', 'credit_amount', item_row.amount)
      );
      perform public.post_financial_transaction(
        'host_payout_settled', 'payout', item_row.payout_id::text,
        item_row.booking_id, null, item_row.payout_id, request_row.host_id,
        'KES', 'daraja-b2c-payout:' || attempt_row.id::text || ':' || item_row.payout_id::text,
        'Safaricom confirmed host payout',
        jsonb_build_object('provider', 'safaricom', 'b2c_attempt_id', attempt_row.id,
          'payout_request_id', request_row.id, 'transaction_id', attempt_row.transaction_id,
          'transfer_amount', attempt_row.amount),
        entries
      );
      posted_count := posted_count + 1;
    end loop;
    if posted_count = 0 then raise exception 'PAYOUT_ITEMS_NOT_FOUND'; end if;
    return posted_count;
  end if;

  if attempt_row.purpose = 'guest_payment_refund' then
    select r.* into refund_request from public.payment_refund_requests r
     where r.id = attempt_row.payment_refund_request_id;
    if not found then raise exception 'REFUND_REQUEST_NOT_FOUND'; end if;
    select b.* into booking_row from public.bookings b where b.id = refund_request.booking_id;
    select p.* into payment_row from public.payments p where p.id = refund_request.payment_id;
  elsif attempt_row.purpose = 'cancellation_refund' then
    select r.* into cancellation_request from public.booking_change_requests r
     where r.id = attempt_row.cancellation_refund_request_id;
    if not found then raise exception 'REFUND_REQUEST_NOT_FOUND'; end if;
    select b.* into booking_row from public.bookings b where b.id = cancellation_request.booking_id;
    select p.* into payment_row from public.payments p
     where p.booking_id = cancellation_request.booking_id
       and p.status::text in ('paid', 'success', 'refunded')
     order by p.paid_at desc nulls last, p.created_at desc
     limit 1;
  else
    raise exception 'UNSUPPORTED_B2C_PURPOSE';
  end if;
  if booking_row.id is null or payment_row.id is null then
    raise exception 'REFUND_PAYMENT_NOT_FOUND';
  end if;
  if attempt_row.amount <= 0 then raise exception 'INVALID_REFUND_AMOUNT'; end if;

  entries := jsonb_build_array(
    jsonb_build_object('account_code', '3100_GUEST_REFUND_PAYABLE', 'debit_amount', attempt_row.amount),
    jsonb_build_object('account_code', '1100_M_PESA_CLEARING', 'credit_amount', attempt_row.amount)
  );
  perform public.post_financial_transaction(
    'refund_posted', 'refund', payment_row.id::text,
    booking_row.id, payment_row.id, null, booking_row.host_id,
    'KES', 'daraja-b2c-refund:' || attempt_row.id::text,
    'Safaricom confirmed guest refund',
    jsonb_build_object('provider', 'safaricom', 'b2c_attempt_id', attempt_row.id,
      'refund_request_id', coalesce(attempt_row.payment_refund_request_id, attempt_row.cancellation_refund_request_id),
      'transaction_id', attempt_row.transaction_id, 'refund_amount', attempt_row.amount),
    entries
  );
  return 1;
end;
$$;
revoke all on function public.post_daraja_b2c_financial_transactions(text, text) from public, anon, authenticated;
grant execute on function public.post_daraja_b2c_financial_transactions(text, text) to service_role;

create or replace function public.post_daraja_b2c_reversal_financial_transactions(
  p_conversation_id text,
  p_originator_conversation_id text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reversal_row public.daraja_b2c_reversals%rowtype;
  request_row public.host_payout_requests%rowtype;
  item_row record;
  entries jsonb;
  posted_count integer := 0;
begin
  select r.* into reversal_row
    from public.daraja_b2c_reversals r
   where r.conversation_id = p_conversation_id
     and r.originator_conversation_id = p_originator_conversation_id;
  if not found then raise exception 'B2C_REVERSAL_NOT_FOUND'; end if;
  if reversal_row.status <> 'reversed' then raise exception 'B2C_REVERSAL_NOT_CONFIRMED'; end if;

  select r.* into request_row from public.host_payout_requests r
   where r.id = reversal_row.payout_request_id;
  if not found then raise exception 'PAYOUT_REQUEST_NOT_FOUND'; end if;

  for item_row in
    select i.payout_id, i.amount, p.booking_id
      from public.host_payout_request_items i
      join public.payouts p on p.id = i.payout_id
     where i.request_id = request_row.id
     order by i.payout_id
  loop
    entries := jsonb_build_array(
      jsonb_build_object('account_code', '6100_HOST_PAYOUT_LIABILITIES', 'debit_amount', item_row.amount),
      jsonb_build_object('account_code', '2100_HOST_PAYABLES', 'credit_amount', item_row.amount)
    );
    perform public.post_financial_transaction(
      'confirmed_reversal', 'payout', item_row.payout_id::text,
      item_row.booking_id, null, item_row.payout_id, request_row.host_id,
      'KES', 'daraja-b2c-reversal:' || reversal_row.id::text || ':' || item_row.payout_id::text,
      'Safaricom confirmed reversal of host payout',
      jsonb_build_object('provider', 'safaricom', 'reversal_id', reversal_row.id,
        'payout_attempt_id', reversal_row.payout_attempt_id,
        'payout_request_id', request_row.id, 'reversed_amount', reversal_row.amount),
      entries
    );
    posted_count := posted_count + 1;
  end loop;
  if posted_count = 0 then raise exception 'PAYOUT_ITEMS_NOT_FOUND'; end if;
  return posted_count;
end;
$$;
revoke all on function public.post_daraja_b2c_reversal_financial_transactions(text, text) from public, anon, authenticated;
grant execute on function public.post_daraja_b2c_reversal_financial_transactions(text, text) to service_role;

create or replace function public.post_daraja_fee_financial_transaction(
  p_attempt_id uuid,
  p_fee_kind text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  fee_amount numeric(12, 2);
  payment_id uuid;
  booking_id uuid;
  host_id uuid;
  payout_id uuid;
  source_ref text;
  fee_account text;
  contra_account text;
  entries jsonb;
  transaction_id uuid;
begin
  if p_fee_kind = 'collection' then
    select a.actual_collection_fee, a.payment_id, a.booking_id, b.host_id
      into fee_amount, payment_id, booking_id, host_id
      from public.daraja_payment_attempts a
      join public.bookings b on b.id = a.booking_id
     where a.id = p_attempt_id and a.status in ('succeeded', 'late_success');
    if not found then raise exception 'COLLECTION_FEE_NOT_RECONCILED'; end if;
    source_ref := p_attempt_id::text;
    contra_account := '1100_M_PESA_CLEARING';
  elsif p_fee_kind = 'b2c' then
    select a.actual_fee, coalesce(r.host_id, b.host_id),
      coalesce(pr.booking_id, cr.booking_id), coalesce(pr.payment_id, p.id),
      a.id::text
      into fee_amount, host_id, booking_id, payment_id, source_ref
      from public.daraja_b2c_attempts a
      left join public.host_payout_requests r on r.id = a.payout_request_id
      left join public.payment_refund_requests pr on pr.id = a.payment_refund_request_id
      left join public.booking_change_requests cr on cr.id = a.cancellation_refund_request_id
      left join public.bookings b on b.id = coalesce(pr.booking_id, cr.booking_id)
      left join lateral (
        select p0.id from public.payments p0
         where p0.booking_id = coalesce(pr.booking_id, cr.booking_id)
         order by p0.paid_at desc nulls last, p0.created_at desc limit 1
      ) p on true
     where a.id = p_attempt_id and a.status in ('succeeded', 'reversed');
    if not found then raise exception 'B2C_FEE_NOT_RECONCILED'; end if;
    source_ref := p_attempt_id::text;
    contra_account := '1200_SETTLEMENT_ACCOUNT';
  elsif p_fee_kind = 'reversal' then
    select r.actual_fee, r.id::text, q.host_id
      into fee_amount, source_ref, host_id
      from public.daraja_b2c_reversals r
      join public.host_payout_requests q on q.id = r.payout_request_id
     where r.id = p_attempt_id and r.status = 'reversed';
    if not found then raise exception 'REVERSAL_FEE_NOT_RECONCILED'; end if;
    contra_account := '1200_SETTLEMENT_ACCOUNT';
  else
    raise exception 'UNSUPPORTED_DARAJA_FEE_KIND';
  end if;

  if fee_amount is null then raise exception 'FEE_NOT_RECONCILED'; end if;
  if fee_amount = 0 then return null; end if;
  if fee_amount < 0 then raise exception 'INVALID_RECONCILED_FEE'; end if;

  fee_account := '4100_PAYMENT_PROCESSING_EXPENSE';
  entries := jsonb_build_array(
    jsonb_build_object('account_code', fee_account, 'debit_amount', fee_amount),
    jsonb_build_object('account_code', contra_account, 'credit_amount', fee_amount)
  );
  transaction_id := public.post_financial_transaction(
    'payment_processing_fee_reconciled', 'fee', source_ref,
    booking_id, payment_id, payout_id, host_id,
    'KES', 'daraja-' || p_fee_kind || '-fee:' || p_attempt_id::text,
    'Reconciled Safaricom processing fee',
    jsonb_build_object('provider', 'safaricom', 'attempt_id', p_attempt_id, 'fee_kind', p_fee_kind),
    entries
  );
  return transaction_id;
end;
$$;
revoke all on function public.post_daraja_fee_financial_transaction(uuid, text) from public, anon, authenticated;
grant execute on function public.post_daraja_fee_financial_transaction(uuid, text) to service_role;

create or replace function public.settle_daraja_stk_attempt_with_financial_posting(
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
  settlement_row record;
  attempt_status text;
begin
  for settlement_row in
    select * from public.settle_daraja_stk_attempt(
      p_checkout_request_id, p_amount_minor, p_phone_number, p_receipt_number, p_paid_at, p_raw_response
    )
  loop
      select a.status into attempt_status
        from public.daraja_payment_attempts a
       where a.checkout_request_id = p_checkout_request_id;
      if attempt_status in ('succeeded', 'late_success') then
        perform public.post_daraja_stk_financial_transaction(p_checkout_request_id);
      end if;
    booking_id := settlement_row.booking_id;
    payment_id := settlement_row.payment_id;
    booking_confirmed := settlement_row.booking_confirmed;
    already_settled := settlement_row.already_settled;
    return next;
  end loop;
end;
$$;
revoke all on function public.settle_daraja_stk_attempt_with_financial_posting(text, bigint, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.settle_daraja_stk_attempt_with_financial_posting(text, bigint, text, text, timestamptz, jsonb) to service_role;

create or replace function public.settle_daraja_b2c_result_with_financial_posting(
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
  settlement_row record;
begin
  for settlement_row in
    select * from public.settle_daraja_b2c_result(
      p_conversation_id, p_originator_conversation_id, p_result_code,
      p_result_description, p_transaction_id, p_raw_response
    )
  loop
    if settlement_row.payout_status in ('paid', 'processed') then
      perform public.post_daraja_b2c_financial_transactions(
        p_conversation_id, p_originator_conversation_id
      );
    end if;
    host_id := settlement_row.host_id;
    payout_request_id := settlement_row.payout_request_id;
    payout_status := settlement_row.payout_status;
    already_processed := settlement_row.already_processed;
    return next;
  end loop;
end;
$$;
revoke all on function public.settle_daraja_b2c_result_with_financial_posting(text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.settle_daraja_b2c_result_with_financial_posting(text, text, text, text, text, jsonb) to service_role;

create or replace function public.settle_daraja_b2c_reversal_result_with_financial_posting(
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
  settlement_row record;
begin
  for settlement_row in
    select * from public.settle_daraja_b2c_reversal_result(
      p_conversation_id, p_originator_conversation_id, p_result_code,
      p_result_description, p_raw_response
    )
  loop
    if settlement_row.reversal_status = 'reversed' then
      perform public.post_daraja_b2c_reversal_financial_transactions(
        p_conversation_id, p_originator_conversation_id
      );
    end if;
    host_id := settlement_row.host_id;
    payout_request_id := settlement_row.payout_request_id;
    reversal_status := settlement_row.reversal_status;
    already_processed := settlement_row.already_processed;
    return next;
  end loop;
end;
$$;
revoke all on function public.settle_daraja_b2c_reversal_result_with_financial_posting(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.settle_daraja_b2c_reversal_result_with_financial_posting(text, text, text, text, jsonb) to service_role;

create or replace function public.reconcile_daraja_collection_fee_with_financial_posting(
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
  reconciliation_row record;
begin
  for reconciliation_row in
    select * from public.reconcile_daraja_collection_fee(
      p_attempt_id, p_actual_fee, p_admin_id, p_admin_note
    )
  loop
    perform public.post_daraja_fee_financial_transaction(p_attempt_id, 'collection');
    booking_id := reconciliation_row.booking_id;
    host_id := reconciliation_row.host_id;
    actual_fee := reconciliation_row.actual_fee;
    host_fee_balance := reconciliation_row.host_fee_balance;
    already_reconciled := reconciliation_row.already_reconciled;
    return next;
  end loop;
end;
$$;
revoke all on function public.reconcile_daraja_collection_fee_with_financial_posting(uuid, numeric, uuid, text) from public, anon, authenticated;
grant execute on function public.reconcile_daraja_collection_fee_with_financial_posting(uuid, numeric, uuid, text) to service_role;

create or replace function public.reconcile_daraja_b2c_fee_with_financial_posting(
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
  reconciliation_row record;
begin
  for reconciliation_row in
    select * from public.reconcile_daraja_b2c_fee(
      p_attempt_id, p_actual_fee, p_admin_id, p_admin_note
    )
  loop
    perform public.post_daraja_fee_financial_transaction(p_attempt_id, 'b2c');
    host_id := reconciliation_row.host_id;
    fee_difference := reconciliation_row.fee_difference;
    host_fee_balance := reconciliation_row.host_fee_balance;
    return next;
  end loop;
end;
$$;
revoke all on function public.reconcile_daraja_b2c_fee_with_financial_posting(uuid, numeric, uuid, text) from public, anon, authenticated;
grant execute on function public.reconcile_daraja_b2c_fee_with_financial_posting(uuid, numeric, uuid, text) to service_role;

create or replace function public.reconcile_daraja_b2c_reversal_fee_with_financial_posting(
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
  reconciliation_row record;
begin
  for reconciliation_row in
    select * from public.reconcile_daraja_b2c_reversal_fee(
      p_reversal_id, p_actual_fee, p_admin_id, p_admin_note
    )
  loop
    perform public.post_daraja_fee_financial_transaction(p_reversal_id, 'reversal');
    host_id := reconciliation_row.host_id;
    host_fee_balance := reconciliation_row.host_fee_balance;
    already_reconciled := reconciliation_row.already_reconciled;
    return next;
  end loop;
end;
$$;
revoke all on function public.reconcile_daraja_b2c_reversal_fee_with_financial_posting(uuid, numeric, uuid, text) from public, anon, authenticated;
grant execute on function public.reconcile_daraja_b2c_reversal_fee_with_financial_posting(uuid, numeric, uuid, text) to service_role;

do $$
declare
  attempt_row record;
  reversal_row record;
begin
  for attempt_row in
    select a.checkout_request_id
      from public.daraja_payment_attempts a
     where a.status in ('succeeded', 'late_success')
  loop
    perform public.post_daraja_stk_financial_transaction(attempt_row.checkout_request_id);
  end loop;

  for attempt_row in
    select a.conversation_id, a.originator_conversation_id
      from public.daraja_b2c_attempts a
     where a.status in ('succeeded', 'reversed')
       and a.conversation_id is not null
       and a.originator_conversation_id is not null
  loop
    perform public.post_daraja_b2c_financial_transactions(
      attempt_row.conversation_id, attempt_row.originator_conversation_id
    );
  end loop;

  for reversal_row in
    select r.conversation_id, r.originator_conversation_id
      from public.daraja_b2c_reversals r
     where r.status = 'reversed'
       and r.conversation_id is not null
       and r.originator_conversation_id is not null
  loop
    perform public.post_daraja_b2c_reversal_financial_transactions(
      reversal_row.conversation_id, reversal_row.originator_conversation_id
    );
  end loop;

  for attempt_row in
    select a.id from public.daraja_payment_attempts a
     where a.actual_collection_fee is not null
       and a.status in ('succeeded', 'late_success')
  loop
    perform public.post_daraja_fee_financial_transaction(attempt_row.id, 'collection');
  end loop;

  for attempt_row in
    select a.id from public.daraja_b2c_attempts a
     where a.actual_fee is not null and a.status in ('succeeded', 'reversed')
  loop
    perform public.post_daraja_fee_financial_transaction(attempt_row.id, 'b2c');
  end loop;

  for reversal_row in
    select r.id from public.daraja_b2c_reversals r
     where r.actual_fee is not null and r.status = 'reversed'
  loop
    perform public.post_daraja_fee_financial_transaction(reversal_row.id, 'reversal');
  end loop;
end;
$$;
