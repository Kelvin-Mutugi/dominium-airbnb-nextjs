alter table public.booking_change_requests
  add column if not exists admin_response text
    check (admin_response is null or char_length(admin_response) <= 1000),
  add column if not exists responded_by uuid references auth.users(id) on delete set null;

create or replace function public.enforce_admin_cancellation_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.request_type = 'cancellation'
     and old.status = 'pending'
     and new.status in ('approved', 'declined')
     and not exists (
       select 1
         from public.admin_roles
        where user_id = (select auth.uid())
          and privilege is true
     ) then
    raise exception 'ADMIN_REVIEW_REQUIRED';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_admin_cancellation_review() from public, anon, authenticated;

drop trigger if exists enforce_admin_cancellation_review_before_update
  on public.booking_change_requests;
create trigger enforce_admin_cancellation_review_before_update
  before update of status on public.booking_change_requests
  for each row execute function public.enforce_admin_cancellation_review();

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
begin
  if not exists (
    select 1
      from public.admin_roles
     where user_id = (select auth.uid())
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

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'REQUEST_ALREADY_HANDLED';
  end if;
  if request_row.booking_status <> 'confirmed' then
    raise exception 'BOOKING_NOT_CHANGEABLE';
  end if;
  if request_row.check_in <> request_row.current_check_in
     or request_row.check_out <> request_row.current_check_out then
    raise exception 'BOOKING_DATES_CHANGED';
  end if;
  if request_row.check_in <= current_date then
    raise exception 'CANCELLATION_WINDOW_CLOSED';
  end if;
  if not p_approve and normalized_response is null then
    raise exception 'DECLINE_REASON_REQUIRED';
  end if;

  if not p_approve then
    update public.booking_change_requests
       set status = 'declined',
           admin_response = normalized_response,
           responded_by = (select auth.uid()),
           responded_at = now()
     where id = p_request_id;

    insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
    values (
      request_row.booking_id,
      (select auth.uid()),
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

  update public.booking_change_requests
     set status = 'approved',
         refund_processing_status = case
           when request_row.estimated_refund_amount > 0 then 'awaiting_manual_processing'
           else 'not_eligible'
         end,
         admin_response = normalized_response,
         responded_by = (select auth.uid()),
         responded_at = now()
   where id = p_request_id;

  insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
  values (
    request_row.booking_id,
    (select auth.uid()),
    'cancellation_approved',
    'Administrator approved cancellation request; refund requires manual processing',
    jsonb_build_object(
      'estimated_refund_amount', request_row.estimated_refund_amount,
      'admin_response', normalized_response,
      'refund_processing_status', case
        when request_row.estimated_refund_amount > 0 then 'awaiting_manual_processing'
        else 'not_eligible'
      end
    )
  );
end;
$$;

revoke all on function public.admin_respond_to_booking_cancellation(uuid, boolean, text) from public, anon;
grant execute on function public.admin_respond_to_booking_cancellation(uuid, boolean, text) to authenticated;