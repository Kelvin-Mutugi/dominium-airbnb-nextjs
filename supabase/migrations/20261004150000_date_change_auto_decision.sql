alter table public.booking_change_requests
  add column if not exists auto_decision_at timestamptz,
  add column if not exists decision_source text
    check (decision_source is null or decision_source in ('host', 'system'));

create or replace function public.set_date_change_auto_decision_deadline()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.request_type = 'date_change' then
    new.auto_decision_at := coalesce(new.created_at, now()) + case
      when new.requested_check_in <= ((coalesce(new.created_at, now()) at time zone 'Africa/Nairobi')::date + 1)
        then interval '5 hours'
      else interval '24 hours'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists set_date_change_auto_decision_deadline_before_insert
  on public.booking_change_requests;
create trigger set_date_change_auto_decision_deadline_before_insert
  before insert on public.booking_change_requests
  for each row execute function public.set_date_change_auto_decision_deadline();

revoke all on function public.set_date_change_auto_decision_deadline() from public, anon, authenticated;

update public.booking_change_requests
   set auto_decision_at = created_at + case
     when requested_check_in <= ((created_at at time zone 'Africa/Nairobi')::date + 1)
       then interval '5 hours'
     else interval '24 hours'
   end
 where request_type = 'date_change'
   and status = 'pending'
   and auto_decision_at is null;

create or replace function public.respond_to_booking_change_request(
  p_request_id uuid,
  p_approve boolean,
  p_host_response text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row record;
  revised_total numeric(12, 2);
  requested_nights integer;
  normalized_response text := nullif(left(trim(coalesce(p_host_response, '')), 1000), '');
begin
  select r.id, r.booking_id, r.request_type, r.status, r.auto_decision_at, r.requested_check_in,
         r.requested_check_out, r.current_check_in, r.current_check_out,
         r.estimated_refund_amount, b.status as booking_status, b.listing_id,
         b.check_in, b.check_out, b.total_amount, l.price_per_night,
         l.platform_fee_per_night, l.service_fee_percent, l.additional_charges
    into request_row
    from public.booking_change_requests r
    join public.bookings b on b.id = r.booking_id
    join public.listings l on l.id = b.listing_id
   where r.id = p_request_id and r.host_id = (select auth.uid())
   for update of r, b;

  if not found then raise exception 'REQUEST_NOT_FOUND_OR_FORBIDDEN'; end if;
  if request_row.status <> 'pending' then raise exception 'REQUEST_ALREADY_HANDLED'; end if;
  if request_row.request_type = 'date_change' and request_row.auto_decision_at <= now() then
    raise exception 'RESPONSE_WINDOW_EXPIRED';
  end if;
  if not p_approve then
    if request_row.request_type = 'date_change' and char_length(coalesce(normalized_response, '')) < 5 then
      raise exception 'DECLINE_REASON_REQUIRED';
    end if;
    update public.booking_change_requests
       set status = 'declined',
           host_response = normalized_response,
           responded_at = now(),
           decision_source = 'host'
     where id = p_request_id;
    insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
    values (
      request_row.booking_id,
      (select auth.uid()),
      'request_declined',
      case when request_row.request_type = 'cancellation' then 'Host declined cancellation request' else 'Host declined the date-change request' end,
      jsonb_build_object('host_response', normalized_response)
    );
    return;
  end if;

  if request_row.booking_status <> 'confirmed' then raise exception 'BOOKING_NOT_CHANGEABLE'; end if;
  if request_row.check_in <> request_row.current_check_in or request_row.check_out <> request_row.current_check_out then
    raise exception 'BOOKING_DATES_CHANGED';
  end if;

  if request_row.request_type = 'cancellation' then
    if request_row.check_in <= (now() at time zone 'Africa/Nairobi')::date then raise exception 'CANCELLATION_WINDOW_CLOSED'; end if;
    update public.bookings set status = 'cancelled' where id = request_row.booking_id and status = 'confirmed';
    update public.booking_change_requests
       set status = 'approved',
           refund_processing_status = case when estimated_refund_amount > 0 then 'awaiting_manual_processing' else 'not_eligible' end,
           host_response = normalized_response,
           responded_at = now(),
           decision_source = 'host'
     where id = p_request_id;
    insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
    values (request_row.booking_id, (select auth.uid()), 'cancellation_approved',
      'Host approved cancellation request; refund requires manual processing',
      jsonb_build_object('estimated_refund_amount', request_row.estimated_refund_amount));
    return;
  end if;

  if request_row.requested_check_in <= (now() at time zone 'Africa/Nairobi')::date
     or request_row.requested_check_out <= request_row.requested_check_in then
    raise exception 'INVALID_REQUESTED_DATES';
  end if;

  requested_nights := request_row.requested_check_out - request_row.requested_check_in;
  revised_total := round(
    request_row.price_per_night * requested_nights
    + case when request_row.platform_fee_per_night is not null
        then request_row.platform_fee_per_night * requested_nights
        else request_row.price_per_night * requested_nights * coalesce(request_row.service_fee_percent, 0)
      end
    + public.calculate_listing_additional_charges(request_row.additional_charges, requested_nights),
    2
  );
  if revised_total <> request_row.total_amount then raise exception 'PRICE_CHANGE_REQUIRES_SUPPORT'; end if;

  if exists (
    select 1 from public.bookings b
     where b.listing_id = request_row.listing_id and b.id <> request_row.booking_id
       and b.status in ('pending', 'confirmed')
       and daterange(b.check_in, b.check_out, '[)') && daterange(request_row.requested_check_in, request_row.requested_check_out, '[)')
  ) or exists (
    select 1 from public.host_external_calendar_events e
     where e.listing_id = request_row.listing_id
       and request_row.requested_check_in < e.end_date and request_row.requested_check_out > e.start_date
  ) then raise exception 'REQUESTED_DATES_UNAVAILABLE'; end if;

  update public.bookings set check_in = request_row.requested_check_in, check_out = request_row.requested_check_out
   where id = request_row.booking_id and status = 'confirmed';
  update public.booking_change_requests
     set status = 'approved',
         host_response = normalized_response,
         responded_at = now(),
         decision_source = 'host'
   where id = p_request_id;
  insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
  values (request_row.booking_id, (select auth.uid()), 'date_change_approved', 'Host approved date-change request',
    jsonb_build_object('check_in', request_row.requested_check_in, 'check_out', request_row.requested_check_out, 'decision_source', 'host'));
end;
$$;

revoke all on function public.respond_to_booking_change_request(uuid, boolean, text) from public, anon;
grant execute on function public.respond_to_booking_change_request(uuid, boolean, text) to authenticated;

create or replace function public.auto_decide_due_date_change_requests()
returns table (auto_approved integer, auto_declined integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row record;
  revised_total numeric(12, 2);
  requested_nights integer;
  decline_reason text;
begin
  auto_approved := 0;
  auto_declined := 0;

  for request_row in
    select r.id, r.booking_id, r.current_check_in, r.current_check_out,
           r.requested_check_in, r.requested_check_out, r.auto_decision_at,
           b.status as booking_status, b.check_in, b.check_out, b.total_amount,
           b.listing_id, l.price_per_night, l.platform_fee_per_night,
           l.service_fee_percent, l.additional_charges
      from public.booking_change_requests r
      join public.bookings b on b.id = r.booking_id
      join public.listings l on l.id = b.listing_id
     where r.request_type = 'date_change'
       and r.status = 'pending'
       and r.auto_decision_at <= now()
     order by r.auto_decision_at
     for update of r, b skip locked
  loop
    decline_reason := null;

    if request_row.booking_status <> 'confirmed'
       or request_row.check_in <> request_row.current_check_in
       or request_row.check_out <> request_row.current_check_out then
      decline_reason := 'The request could not be auto-approved because the booking changed before the review deadline. Please contact support if you still need help.';
    elsif request_row.requested_check_in <= (now() at time zone 'Africa/Nairobi')::date
       or request_row.requested_check_out <= request_row.requested_check_in then
      decline_reason := 'The requested dates were no longer eligible when the automatic review ran. Please contact support to discuss other dates.';
    else
      requested_nights := request_row.requested_check_out - request_row.requested_check_in;
      revised_total := round(
        request_row.price_per_night * requested_nights
        + case when request_row.platform_fee_per_night is not null
            then request_row.platform_fee_per_night * requested_nights
            else request_row.price_per_night * requested_nights * coalesce(request_row.service_fee_percent, 0)
          end
        + public.calculate_listing_additional_charges(request_row.additional_charges, requested_nights),
        2
      );
      if revised_total <> request_row.total_amount then
        decline_reason := 'This request could not be auto-approved because the booking total would change. Please contact support to arrange the price adjustment.';
      elsif exists (
        select 1 from public.bookings b
         where b.listing_id = request_row.listing_id and b.id <> request_row.booking_id
           and b.status in ('pending', 'confirmed')
           and daterange(b.check_in, b.check_out, '[)') && daterange(request_row.requested_check_in, request_row.requested_check_out, '[)')
      ) or exists (
        select 1 from public.host_external_calendar_events e
         where e.listing_id = request_row.listing_id
           and request_row.requested_check_in < e.end_date and request_row.requested_check_out > e.start_date
      ) then
        decline_reason := 'The requested dates could not be auto-approved because they are no longer available. Please contact support to discuss other dates.';
      end if;
    end if;

    if decline_reason is not null then
      update public.booking_change_requests
         set status = 'declined', host_response = decline_reason,
             responded_at = now(), decision_source = 'system'
       where id = request_row.id and status = 'pending';
      insert into public.booking_updates (booking_id, event_type, summary, details)
      values (request_row.booking_id, 'request_declined', 'System could not safely auto-approve the date-change request',
        jsonb_build_object('decision_source', 'system', 'reason', decline_reason));
      auto_declined := auto_declined + 1;
    else
      update public.bookings
         set check_in = request_row.requested_check_in,
             check_out = request_row.requested_check_out
       where id = request_row.booking_id and status = 'confirmed';
      update public.booking_change_requests
         set status = 'approved',
             host_response = 'Automatically approved by the system because no host decision was received within the response window.',
             responded_at = now(), decision_source = 'system'
       where id = request_row.id and status = 'pending';
      insert into public.booking_updates (booking_id, event_type, summary, details)
      values (request_row.booking_id, 'date_change_approved',
        'System automatically approved the requested dates after the host response window expired',
        jsonb_build_object('decision_source', 'system', 'check_in', request_row.requested_check_in,
                           'check_out', request_row.requested_check_out, 'auto_decision_at', request_row.auto_decision_at));
      auto_approved := auto_approved + 1;
    end if;
  end loop;

  return next;
end;
$$;

revoke all on function public.auto_decide_due_date_change_requests() from public, anon, authenticated;
grant execute on function public.auto_decide_due_date_change_requests() to service_role;