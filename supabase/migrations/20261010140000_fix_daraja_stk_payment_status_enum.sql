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
       and p.status::text in ('paid', 'success')
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