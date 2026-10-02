alter table public.booking_change_requests
  drop constraint if exists booking_change_requests_refund_processing_status_check;

alter table public.booking_change_requests
  add constraint booking_change_requests_refund_processing_status_check
  check (refund_processing_status in (
    'not_applicable',
    'not_eligible',
    'awaiting_admin_review',
    'awaiting_manual_processing',
    'declined',
    'processed'
  ));

alter table public.booking_change_requests
  add column if not exists refund_admin_response text
    check (refund_admin_response is null or char_length(refund_admin_response) <= 1000),
  add column if not exists refund_decided_by uuid references auth.users(id) on delete set null,
  add column if not exists refund_decided_at timestamptz,
  add column if not exists actual_refund_amount numeric(12, 2)
    check (actual_refund_amount is null or actual_refund_amount >= 0),
  add column if not exists refund_processed_at timestamptz,
  add column if not exists refund_transaction_reference text
    check (refund_transaction_reference is null or char_length(refund_transaction_reference) <= 200);

update public.booking_change_requests
   set refund_processing_status = 'awaiting_admin_review'
 where request_type = 'cancellation'
   and status = 'approved'
   and refund_processing_status = 'awaiting_manual_processing'
   and estimated_refund_amount > 0
   and refund_processed_at is null;

create index if not exists booking_change_requests_refund_review_idx
  on public.booking_change_requests (refund_processing_status, created_at desc)
  where request_type = 'cancellation';

create or replace function public.route_approved_cancellation_to_refund_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.request_type = 'cancellation'
     and old.status = 'pending'
     and new.status = 'approved'
     and old.estimated_refund_amount > 0 then
    new.refund_processing_status := 'awaiting_admin_review';
  end if;
  return new;
end;
$$;

revoke all on function public.route_approved_cancellation_to_refund_review() from public, anon, authenticated;

drop trigger if exists route_approved_cancellation_to_refund_review_before_update
  on public.booking_change_requests;
create trigger route_approved_cancellation_to_refund_review_before_update
  before update of status on public.booking_change_requests
  for each row execute function public.route_approved_cancellation_to_refund_review();

create or replace function public.admin_respond_to_booking_cancellation(
  p_request_id uuid,
  p_approve boolean,
  p_admin_response text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row record;
  normalized_response text := nullif(left(trim(coalesce(p_admin_response, '')), 1000), '');
  next_refund_status text;
begin
  if not exists (
    select 1 from public.admin_roles
     where user_id = auth.uid()
       and privilege is true
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select r.id, r.booking_id, r.status, r.current_check_in, r.current_check_out,
         r.estimated_refund_amount, b.status as booking_status,
         b.check_in, b.check_out
    into request_row
    from public.booking_change_requests r
    join public.bookings b on b.id = r.booking_id
   where r.id = p_request_id
     and r.request_type = 'cancellation'
   for update of r, b;

  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if request_row.status <> 'pending' then raise exception 'REQUEST_ALREADY_HANDLED'; end if;
  if request_row.booking_status <> 'confirmed' then raise exception 'BOOKING_NOT_CHANGEABLE'; end if;
  if request_row.check_in <> request_row.current_check_in
     or request_row.check_out <> request_row.current_check_out then
    raise exception 'BOOKING_DATES_CHANGED';
  end if;
  if request_row.check_in <= current_date then raise exception 'CANCELLATION_WINDOW_CLOSED'; end if;
  if not p_approve and normalized_response is null then
    raise exception 'DECLINE_REASON_REQUIRED';
  end if;

  if not p_approve then
    update public.booking_change_requests
       set status = 'declined',
           admin_response = normalized_response,
           responded_by = auth.uid(),
           responded_at = now()
     where id = p_request_id;

    insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
    values (
      request_row.booking_id,
      auth.uid(),
      'request_declined',
      'Administrator declined cancellation request',
      jsonb_build_object('admin_response', normalized_response)
    );
    return;
  end if;

  update public.bookings
     set status = 'cancelled'
   where id = request_row.booking_id
     and status = 'confirmed';

  next_refund_status := case
    when request_row.estimated_refund_amount > 0 then 'awaiting_admin_review'
    else 'not_eligible'
  end;

  update public.booking_change_requests
     set status = 'approved',
         refund_processing_status = next_refund_status,
         admin_response = normalized_response,
         responded_by = auth.uid(),
         responded_at = now()
   where id = p_request_id;

  insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
  values (
    request_row.booking_id,
    auth.uid(),
    'cancellation_approved',
    case when next_refund_status = 'awaiting_admin_review'
      then 'Administrator approved cancellation; eligible refund awaits separate admin review'
      else 'Administrator approved cancellation; no refund is eligible under the estimate'
    end,
    jsonb_build_object(
      'estimated_refund_amount', request_row.estimated_refund_amount,
      'admin_response', normalized_response,
      'refund_processing_status', next_refund_status
    )
  );
end;
$$;

revoke all on function public.admin_respond_to_booking_cancellation(uuid, boolean, text) from public, anon;
grant execute on function public.admin_respond_to_booking_cancellation(uuid, boolean, text) to authenticated;

create or replace function public.admin_decide_cancellation_refund(
  p_request_id uuid,
  p_action text,
  p_admin_response text default null,
  p_actual_refund_amount numeric default null,
  p_transaction_reference text default null
)
returns table (
  booking_id uuid,
  refund_status text,
  actual_refund numeric,
  payment_marked_refunded boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row record;
  normalized_response text := nullif(left(trim(coalesce(p_admin_response, '')), 1000), '');
  normalized_reference text := nullif(left(trim(coalesce(p_transaction_reference, '')), 200), '');
  next_status text;
  fully_refunded boolean := false;
begin
  if not exists (
    select 1 from public.admin_roles
     where user_id = auth.uid()
       and privilege is true
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if p_action not in ('approve', 'decline', 'processed') then
    raise exception 'INVALID_REFUND_ACTION';
  end if;

  select r.id, r.booking_id, r.status, r.refund_processing_status,
         r.amount_paid, r.estimated_refund_amount
    into request_row
    from public.booking_change_requests r
   where r.id = p_request_id
     and r.request_type = 'cancellation'
   for update;

  if not found then raise exception 'REFUND_REQUEST_NOT_FOUND'; end if;
  if request_row.status <> 'approved' then raise exception 'CANCELLATION_NOT_APPROVED'; end if;

  if p_action = 'approve' then
    if request_row.refund_processing_status <> 'awaiting_admin_review' then
      raise exception 'REFUND_NOT_AWAITING_REVIEW';
    end if;
    next_status := 'awaiting_manual_processing';
    update public.booking_change_requests
       set refund_processing_status = next_status,
           refund_admin_response = normalized_response,
           refund_decided_by = auth.uid(),
           refund_decided_at = now()
     where id = p_request_id;
    booking_id := request_row.booking_id;
    refund_status := next_status;
    actual_refund := null;
    payment_marked_refunded := false;
    return next;
    return;
  end if;

  if p_action = 'decline' then
    if request_row.refund_processing_status <> 'awaiting_admin_review' then
      raise exception 'REFUND_NOT_AWAITING_REVIEW';
    end if;
    if normalized_response is null then raise exception 'REFUND_DECLINE_REASON_REQUIRED'; end if;
    next_status := 'declined';
    update public.booking_change_requests
       set refund_processing_status = next_status,
           refund_admin_response = normalized_response,
           refund_decided_by = auth.uid(),
           refund_decided_at = now()
     where id = p_request_id;
    booking_id := request_row.booking_id;
    refund_status := next_status;
    actual_refund := null;
    payment_marked_refunded := false;
    return next;
    return;
  end if;

  if request_row.refund_processing_status <> 'awaiting_manual_processing' then
    raise exception 'REFUND_NOT_APPROVED_FOR_PROCESSING';
  end if;
  if p_actual_refund_amount is null
     or p_actual_refund_amount <= 0
     or p_actual_refund_amount > request_row.estimated_refund_amount then
    raise exception 'INVALID_ACTUAL_REFUND_AMOUNT';
  end if;
  if normalized_reference is null then raise exception 'REFUND_REFERENCE_REQUIRED'; end if;

  next_status := 'processed';
  fully_refunded := p_actual_refund_amount >= request_row.amount_paid;
  update public.booking_change_requests
     set refund_processing_status = next_status,
         actual_refund_amount = round(p_actual_refund_amount, 2),
         refund_transaction_reference = normalized_reference,
         refund_processed_at = now(),
         refund_admin_response = coalesce(normalized_response, refund_admin_response),
         refund_decided_by = auth.uid(),
         refund_decided_at = coalesce(refund_decided_at, now())
   where id = p_request_id;

  if fully_refunded then
    update public.payments
       set status = 'refunded'
     where payments.booking_id = request_row.booking_id
       and payments.status in ('paid', 'success');
  end if;

  booking_id := request_row.booking_id;
  refund_status := next_status;
  actual_refund := round(p_actual_refund_amount, 2);
  payment_marked_refunded := fully_refunded;
  return next;
end;
$$;

revoke all on function public.admin_decide_cancellation_refund(uuid, text, text, numeric, text) from public, anon;
grant execute on function public.admin_decide_cancellation_refund(uuid, text, text, numeric, text) to authenticated;
