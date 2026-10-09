-- One-time test reset. Run manually against the intended test Supabase project.
-- This deletes bookings and their payment/payout/refund dependents, plus
-- booking-linked support cases, notifications, and audit rows.
-- It preserves auth.users, profiles, listings, storage objects, and unrelated
-- support/contact/audit rows. It zeros host_fee_balance only for hosts linked
-- to the deleted bookings. Do not run against production.
begin;

do $$
declare
  booking_ids uuid[];
  host_ids uuid[];
  payment_ids uuid[];
  payout_ids uuid[];
  payout_request_ids uuid[];
  stk_attempt_ids uuid[];
  b2c_attempt_ids uuid[];
  reversal_ids uuid[];
  payment_refund_ids uuid[];
  change_request_ids uuid[];
  review_ids uuid[];
  guest_review_ids uuid[];
  support_case_ids uuid[];
  deleted_bookings integer := 0;
begin
  select coalesce(array_agg(id), '{}'::uuid[])
    into booking_ids
    from public.bookings;

  if cardinality(booking_ids) = 0 then
    raise notice 'Test cleanup skipped: there are no bookings.';
    return;
  end if;

  select coalesce(array_agg(distinct host_id), '{}'::uuid[])
    into host_ids
    from public.bookings
   where id = any(booking_ids)
     and host_id is not null;

  select coalesce(array_agg(id), '{}'::uuid[])
    into payment_ids
    from public.payments
   where booking_id = any(booking_ids);

  select coalesce(array_agg(id), '{}'::uuid[])
    into payout_ids
    from public.payouts
   where booking_id = any(booking_ids);

  select coalesce(array_agg(id), '{}'::uuid[])
    into payout_request_ids
    from public.host_payout_requests r
   where exists (
     select 1 from public.host_payout_request_items i
      where i.request_id = r.id
        and i.payout_id = any(payout_ids)
   );

  select coalesce(array_agg(id), '{}'::uuid[])
    into stk_attempt_ids
    from public.daraja_payment_attempts
   where booking_id = any(booking_ids);

  select coalesce(array_agg(id), '{}'::uuid[])
    into payment_refund_ids
    from public.payment_refund_requests
   where booking_id = any(booking_ids);

  select coalesce(array_agg(id), '{}'::uuid[])
    into change_request_ids
    from public.booking_change_requests
   where booking_id = any(booking_ids);

  select coalesce(array_agg(id), '{}'::uuid[])
    into b2c_attempt_ids
    from public.daraja_b2c_attempts
   where payout_request_id = any(payout_request_ids)
      or payment_refund_request_id = any(payment_refund_ids)
      or cancellation_refund_request_id = any(change_request_ids);

  select coalesce(array_agg(id), '{}'::uuid[])
    into reversal_ids
    from public.daraja_b2c_reversals
   where payout_request_id = any(payout_request_ids);

  select coalesce(array_agg(id), '{}'::uuid[])
    into support_case_ids
    from public.support_cases
   where booking_id = any(booking_ids);

  select coalesce(array_agg(id), '{}'::uuid[])
    into review_ids
    from public.host_reviews
   where booking_id = any(booking_ids);

  select coalesce(array_agg(id), '{}'::uuid[])
    into guest_review_ids
    from public.reviews
   where booking_id = any(booking_ids);

  delete from public.admin_audit_logs
   where (entity_type = 'booking' and entity_id = any(booking_ids))
      or (entity_type = 'payout' and entity_id = any(payout_ids))
      or (entity_type = 'payout' and entity_id = any(payout_request_ids))
      or (entity_type = 'review' and entity_id = any(review_ids))
      or (entity_type = 'review' and entity_id = any(guest_review_ids))
      or (entity_type = 'support_case' and entity_id = any(support_case_ids));

  delete from public.reviews
   where id = any(guest_review_ids);
  delete from public.host_reviews
   where id = any(review_ids);

  delete from public.support_case_messages
   where case_id = any(support_case_ids);
  delete from public.support_cases
   where id = any(support_case_ids);

  delete from public.user_notifications
   where booking_id = any(booking_ids);

  delete from public.daraja_b2c_callback_events
   where attempt_id = any(b2c_attempt_ids);
  delete from public.daraja_b2c_reversals
   where id = any(reversal_ids);
  delete from public.daraja_b2c_attempts
   where id = any(b2c_attempt_ids);

  delete from public.daraja_stk_callback_events
   where attempt_id = any(stk_attempt_ids);
  delete from public.daraja_payment_attempts
   where id = any(stk_attempt_ids);

  delete from public.payment_refund_requests
   where id = any(payment_refund_ids);
  delete from public.host_payout_request_items
   where request_id = any(payout_request_ids)
      or payout_id = any(payout_ids);
  delete from public.host_payout_requests
   where id = any(payout_request_ids);
  delete from public.payouts
   where id = any(payout_ids);
  delete from public.payments
   where id = any(payment_ids);

  delete from public.bookings
   where id = any(booking_ids);
  get diagnostics deleted_bookings = row_count;

  update public.profiles
     set host_fee_balance = 0
   where id = any(host_ids);

  raise notice 'Test cleanup complete. Removed % booking rows and linked test data; preserved users, profile identity/contact fields, listings, storage, and unrelated records; reset linked hosts fee balances.',
    deleted_bookings;
end;
$$;

commit;