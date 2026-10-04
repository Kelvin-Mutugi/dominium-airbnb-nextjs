create or replace function public.guard_payment_refund_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  booking_status text;
  payment_status text;
begin
  if tg_op = 'INSERT' then
    select b.status, p.status
      into booking_status, payment_status
      from public.bookings b
      join public.payments p on p.id = new.payment_id
     where b.id = new.booking_id
     for update of b;

    if not found then raise exception 'PAYMENT_BOOKING_MISMATCH'; end if;
    if payment_status not in ('paid', 'success') then raise exception 'PAYMENT_NOT_REFUNDABLE'; end if;
  elsif new.status in ('awaiting_manual_processing', 'processed')
        and old.status is distinct from new.status then
    select b.status
      into booking_status
      from public.bookings b
     where b.id = new.booking_id
     for update;
    if not found then raise exception 'REFUND_BOOKING_NOT_FOUND'; end if;
  end if;

  if booking_status = 'completed'
     and (tg_op = 'INSERT' or new.status in ('awaiting_manual_processing', 'processed')) then
    raise exception 'STAY_ALREADY_COMPLETED';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_payment_refund_request_before_write
  on public.payment_refund_requests;
create trigger guard_payment_refund_request_before_write
  before insert or update of status on public.payment_refund_requests
  for each row execute function public.guard_payment_refund_request();

create or replace function public.guard_booking_completion_for_refunds()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and (
    exists (
      select 1
        from public.payment_refund_requests r
       where r.booking_id = new.id
         and r.status in ('awaiting_admin_review', 'awaiting_manual_processing')
    )
    or exists (
      select 1
        from public.booking_change_requests r
       where r.booking_id = new.id
         and r.request_type = 'cancellation'
         and r.refund_processing_status in ('awaiting_admin_review', 'awaiting_manual_processing')
    )
  ) then
    raise exception 'PENDING_REFUND_REVIEW';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_booking_completion_for_refunds() from public, anon, authenticated;
drop trigger if exists guard_booking_completion_for_refunds_before_update
  on public.bookings;
create trigger guard_booking_completion_for_refunds_before_update
  before update of status on public.bookings
  for each row execute function public.guard_booking_completion_for_refunds();

create or replace function public.complete_due_host_bookings(p_grace_hours integer default 24)
returns table (completed_count integer, payouts_released integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_grace_hours < 0 or p_grace_hours > 168 then
    raise exception 'INVALID_COMPLETION_GRACE';
  end if;

  with due_bookings as (
    select b.id
      from public.bookings b
      join public.listings l on l.id = b.listing_id
     where b.status = 'confirmed'
       and (((b.check_out + public.parse_listing_checkout_time(l.check_out_time))
             at time zone 'Africa/Nairobi') + make_interval(hours => p_grace_hours)) <= now()
       and not exists (
         select 1 from public.support_cases sc
          where sc.booking_id = b.id
            and sc.status in ('new', 'in_review', 'waiting_on_user')
       )
       and not exists (
         select 1 from public.booking_change_requests r
          where r.booking_id = b.id and r.status = 'pending'
       )
       and not exists (
         select 1 from public.payment_refund_requests r
          where r.booking_id = b.id
            and r.status in ('awaiting_admin_review', 'awaiting_manual_processing')
       )
     for update of b skip locked
  ), completed as (
    update public.bookings b
       set status = 'completed',
           completed_at = now(),
           completion_source = 'system'
      from due_bookings d
     where b.id = d.id and b.status = 'confirmed'
    returning b.id
  )
  select count(*)::integer into completed_count from completed;

  with releasable as (
    select p.id
      from public.payouts p
      join public.bookings b on b.id = p.booking_id
      join public.listings l on l.id = b.listing_id
     where p.status = 'processing'
       and b.status = 'completed'
       and b.completion_source = 'host'
       and (((b.check_out + public.parse_listing_checkout_time(l.check_out_time))
             at time zone 'Africa/Nairobi') + make_interval(hours => p_grace_hours)) <= now()
       and not exists (
         select 1 from public.support_cases sc
          where sc.booking_id = b.id
            and sc.status in ('new', 'in_review', 'waiting_on_user')
       )
       and not exists (
         select 1 from public.booking_change_requests r
          where r.booking_id = b.id and r.status = 'pending'
       )
       and not exists (
         select 1 from public.payment_refund_requests r
          where r.booking_id = b.id
            and r.status in ('awaiting_admin_review', 'awaiting_manual_processing')
       )
     for update of p skip locked
  ), released as (
    update public.payouts p
       set status = 'owed'
      from releasable r
     where p.id = r.id and p.status = 'processing'
    returning p.id
  )
  select count(*)::integer into payouts_released from released;

  return next;
end;
$$;

revoke all on function public.complete_due_host_bookings(integer) from public, anon, authenticated;
grant execute on function public.complete_due_host_bookings(integer) to service_role;

create or replace function public.host_mark_booking_completed(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  booking_row record;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;

  select b.id, b.host_id, b.status, b.check_out, l.check_out_time
    into booking_row
    from public.bookings b
    join public.listings l on l.id = b.listing_id
   where b.id = p_booking_id and b.host_id = auth.uid()
   for update of b;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if booking_row.status <> 'confirmed' then raise exception 'BOOKING_NOT_CONFIRMED'; end if;
  if ((booking_row.check_out + public.parse_listing_checkout_time(booking_row.check_out_time))
       at time zone 'Africa/Nairobi') > now() then
    raise exception 'CHECKOUT_TIME_NOT_REACHED';
  end if;
  if exists (
    select 1 from public.booking_change_requests r
     where r.booking_id = p_booking_id and r.status = 'pending'
  ) then raise exception 'PENDING_GUEST_REQUEST'; end if;
  if exists (
    select 1 from public.payment_refund_requests r
     where r.booking_id = p_booking_id
       and r.status in ('awaiting_admin_review', 'awaiting_manual_processing')
  ) then raise exception 'PENDING_REFUND_REVIEW'; end if;

  update public.bookings
     set status = 'completed', completed_at = now(), completion_source = 'host'
   where id = p_booking_id and host_id = auth.uid() and status = 'confirmed';
end;
$$;

revoke all on function public.host_mark_booking_completed(uuid) from public, anon;
grant execute on function public.host_mark_booking_completed(uuid) to authenticated;

create or replace function public.guard_cancellation_refund_completion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  booking_status text;
begin
  if new.refund_processing_status in ('awaiting_manual_processing', 'processed')
     and old.refund_processing_status is distinct from new.refund_processing_status then
    select b.status into booking_status
      from public.bookings b
     where b.id = new.booking_id
     for update;
    if booking_status = 'completed' then raise exception 'STAY_ALREADY_COMPLETED'; end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_cancellation_refund_completion() from public, anon, authenticated;
drop trigger if exists guard_cancellation_refund_completion_before_update
  on public.booking_change_requests;
create trigger guard_cancellation_refund_completion_before_update
  before update of refund_processing_status on public.booking_change_requests
  for each row execute function public.guard_cancellation_refund_completion();

create or replace function public.admin_decide_payment_refund_request(
  p_request_id uuid,
  p_action text,
  p_admin_response text default null,
  p_actual_refund_amount numeric default null,
  p_transaction_reference text default null
)
returns table (booking_id uuid, refund_status text, payment_marked_refunded boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row record;
  booking_status text;
  normalized_response text := nullif(left(trim(coalesce(p_admin_response, '')), 1000), '');
  normalized_reference text := nullif(left(trim(coalesce(p_transaction_reference, '')), 200), '');
  next_status text;
  fully_refunded boolean := false;
begin
  if not exists (
    select 1 from public.admin_roles
     where user_id = auth.uid() and privilege is true
  ) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_action not in ('approve', 'decline', 'processed') then raise exception 'INVALID_REFUND_ACTION'; end if;

  select r.id, r.payment_id, r.booking_id, r.amount_paid, r.status
    into request_row
    from public.payment_refund_requests r
   where r.id = p_request_id
   for update;
  if not found then raise exception 'REFUND_REQUEST_NOT_FOUND'; end if;

  if p_action in ('approve', 'processed') then
    select b.status into booking_status
      from public.bookings b
     where b.id = request_row.booking_id
     for update;
    if not found then raise exception 'REFUND_BOOKING_NOT_FOUND'; end if;
    if booking_status = 'completed' then raise exception 'STAY_ALREADY_COMPLETED'; end if;
  end if;

  if p_action = 'approve' then
    if request_row.status <> 'awaiting_admin_review' then raise exception 'REFUND_NOT_AWAITING_REVIEW'; end if;
    next_status := 'awaiting_manual_processing';
    update public.payment_refund_requests
       set status = next_status, admin_response = normalized_response,
           decided_by = auth.uid(), decided_at = now(), updated_at = now()
     where id = p_request_id;
  elsif p_action = 'decline' then
    if request_row.status <> 'awaiting_admin_review' then raise exception 'REFUND_NOT_AWAITING_REVIEW'; end if;
    if normalized_response is null then raise exception 'REFUND_DECLINE_REASON_REQUIRED'; end if;
    next_status := 'declined';
    update public.payment_refund_requests
       set status = next_status, admin_response = normalized_response,
           decided_by = auth.uid(), decided_at = now(), updated_at = now()
     where id = p_request_id;
  else
    if request_row.status <> 'awaiting_manual_processing' then raise exception 'REFUND_NOT_APPROVED_FOR_PROCESSING'; end if;
    if p_actual_refund_amount is null or p_actual_refund_amount <= 0
       or p_actual_refund_amount > request_row.amount_paid then
      raise exception 'INVALID_ACTUAL_REFUND_AMOUNT';
    end if;
    if normalized_reference is null then raise exception 'REFUND_REFERENCE_REQUIRED'; end if;
    next_status := 'processed';
    fully_refunded := p_actual_refund_amount >= request_row.amount_paid;
    update public.payment_refund_requests
       set status = next_status,
           actual_refund_amount = round(p_actual_refund_amount, 2),
           transaction_reference = normalized_reference,
           admin_response = coalesce(normalized_response, admin_response),
           decided_by = auth.uid(), decided_at = coalesce(decided_at, now()),
           processed_at = now(), updated_at = now()
     where id = p_request_id;

    if fully_refunded then
      update public.payments set status = 'refunded'
       where id = request_row.payment_id and status in ('paid', 'success');
    end if;
  end if;

  booking_id := request_row.booking_id;
  refund_status := next_status;
  payment_marked_refunded := fully_refunded;
  return next;
end;
$$;

revoke all on function public.admin_decide_payment_refund_request(uuid, text, text, numeric, text) from public, anon;
grant execute on function public.admin_decide_payment_refund_request(uuid, text, text, numeric, text) to authenticated;