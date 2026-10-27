create or replace function public.admin_cancel_booking_with_full_refund(
  p_booking_id uuid
)
returns table (
  booking_id uuid,
  previous_status text,
  amount_paid numeric,
  refund_review_amount numeric,
  cancellation_refund_request_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  booking_row public.bookings%rowtype;
  pending_request public.booking_change_requests%rowtype;
  captured_amount numeric(12, 2) := 0;
  remaining_refund numeric(12, 2) := 0;
  previous_booking_status text;
  refund_request_id uuid;
begin
  if not exists (
    select 1
      from public.admin_roles
     where user_id = auth.uid()
       and privilege is true
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select b.*
    into booking_row
    from public.bookings b
   where b.id = p_booking_id
   for update;

  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if booking_row.status not in ('pending', 'confirmed') then
    raise exception 'BOOKING_NOT_CANCELLABLE';
  end if;
  previous_booking_status := booking_row.status::text;

  select
    coalesce(sum(p.amount), 0)::numeric(12, 2),
    coalesce(
      sum(
        case
          when p.status = 'refunded' then 0
          else greatest(
            p.amount - case
              when pr.status in ('awaiting_admin_review', 'awaiting_manual_processing')
                then p.amount
              when pr.status = 'processed'
                then least(coalesce(pr.actual_refund_amount, 0), p.amount)
              else 0
            end,
            0
          )
        end
      ),
      0
    )::numeric(12, 2)
    into captured_amount, remaining_refund
    from public.payments p
    left join public.payment_refund_requests pr on pr.payment_id = p.id
   where p.booking_id = p_booking_id
     and p.status in ('paid', 'success', 'refunded');

  if booking_row.status = 'pending' and captured_amount = 0 then
    update public.bookings
       set status = 'cancelled'
     where id = p_booking_id
       and status = 'pending';

    return query
      select p_booking_id, previous_booking_status, captured_amount, remaining_refund, null::uuid;
    return;
  end if;

  update public.payment_refund_requests
     set reason = left(
           'Full refund due to Dominium BNB cancellation. ' || reason,
           1000
         ),
         updated_at = now()
   where booking_id = p_booking_id
     and status in ('awaiting_admin_review', 'awaiting_manual_processing');

  update public.bookings
     set status = 'cancelled'
   where id = p_booking_id
     and status = 'confirmed';

  select r.*
    into pending_request
    from public.booking_change_requests r
   where r.booking_id = p_booking_id
     and r.status = 'pending'
   for update;

  if found and pending_request.request_type = 'date_change' then
    update public.booking_change_requests
       set status = 'declined',
           admin_response = 'Booking cancelled by Dominium BNB.',
           responded_by = auth.uid(),
           responded_at = now()
     where id = pending_request.id;

    insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
    values (
      p_booking_id,
      auth.uid(),
      'request_declined',
      'Date-change request closed because Dominium BNB cancelled the booking',
      jsonb_build_object('admin_response', 'Booking cancelled by Dominium BNB.')
    );
  elsif found and pending_request.request_type = 'cancellation' then
    refund_request_id := pending_request.id;

    update public.booking_change_requests
       set estimated_refund_amount = 0
     where id = pending_request.id;

    update public.booking_change_requests
       set status = 'approved',
           amount_paid = remaining_refund,
           refund_percent = 100,
           estimated_refund_amount = remaining_refund,
           refund_processing_status = case
             when remaining_refund > 0 then 'awaiting_admin_review'
             else 'not_eligible'
           end,
           admin_response = 'Dominium BNB cancelled this reservation. A full refund of the remaining paid amount is due.',
           refund_admin_response = 'Full refund due to Dominium BNB cancellation.',
           responded_by = auth.uid(),
           responded_at = now()
     where id = pending_request.id;
  end if;

  if refund_request_id is null and remaining_refund > 0 then
    insert into public.booking_change_requests (
      booking_id,
      guest_id,
      host_id,
      request_type,
      status,
      current_check_in,
      current_check_out,
      amount_paid,
      refund_percent,
      estimated_refund_amount,
      refund_processing_status,
      admin_response,
      responded_by,
      responded_at,
      refund_admin_response
    )
    values (
      p_booking_id,
      booking_row.guest_id,
      booking_row.host_id,
      'cancellation',
      'approved',
      booking_row.check_in,
      booking_row.check_out,
      remaining_refund,
      100,
      remaining_refund,
      'awaiting_admin_review',
      'Dominium BNB cancelled this reservation. A full refund of the remaining paid amount is due.',
      auth.uid(),
      now(),
      'Full refund due to Dominium BNB cancellation.'
    )
    returning id into refund_request_id;
  end if;

  insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
  values (
    p_booking_id,
    auth.uid(),
    'cancellation_approved',
    'Dominium BNB cancelled the reservation; a full refund is due for amounts paid',
    jsonb_build_object(
      'amount_paid', captured_amount,
      'remaining_refund_amount', remaining_refund,
      'cancellation_refund_request_id', refund_request_id
    )
  );

  return query
    select p_booking_id, previous_booking_status, captured_amount, remaining_refund, refund_request_id;
end;
$$;

revoke all on function public.admin_cancel_booking_with_full_refund(uuid)
  from public, anon;
grant execute on function public.admin_cancel_booking_with_full_refund(uuid)
  to authenticated;

comment on function public.admin_cancel_booking_with_full_refund(uuid) is
  'Cancels an admin-selected booking and routes all outstanding paid amounts to full refund review.';
