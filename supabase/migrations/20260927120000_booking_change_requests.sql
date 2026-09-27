create table if not exists public.booking_change_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  guest_id uuid not null references auth.users(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('cancellation', 'date_change')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  current_check_in date not null,
  current_check_out date not null,
  requested_check_in date,
  requested_check_out date,
  quoted_total_amount numeric(12, 2),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  refund_percent integer not null default 0 check (refund_percent between 0 and 100),
  estimated_refund_amount numeric(12, 2) not null default 0 check (estimated_refund_amount >= 0),
  refund_processing_status text not null default 'not_applicable'
    check (refund_processing_status in ('not_applicable', 'not_eligible', 'awaiting_manual_processing')),
  reason text check (reason is null or char_length(reason) <= 1000),
  host_response text check (host_response is null or char_length(host_response) <= 1000),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint booking_change_request_dates_valid check (
    (request_type = 'cancellation' and requested_check_in is null and requested_check_out is null)
    or
    (request_type = 'date_change' and requested_check_in is not null and requested_check_out is not null and requested_check_out > requested_check_in)
  )
);

create index if not exists booking_change_requests_host_pending_idx
  on public.booking_change_requests (host_id, created_at desc)
  where status = 'pending';

create index if not exists booking_change_requests_guest_created_idx
  on public.booking_change_requests (guest_id, created_at desc);

create unique index if not exists booking_change_requests_one_pending_per_booking_idx
  on public.booking_change_requests (booking_id)
  where status = 'pending';

alter table public.booking_change_requests enable row level security;
revoke all on public.booking_change_requests from anon, authenticated;
grant select on public.booking_change_requests to authenticated;

drop policy if exists "Guests and hosts can read their booking change requests"
  on public.booking_change_requests;

create policy "Guests and hosts can read their booking change requests"
  on public.booking_change_requests for select
  to authenticated
  using (guest_id = (select auth.uid()) or host_id = (select auth.uid()));

create or replace function public.respond_to_booking_change_request(
  p_request_id uuid,
  p_approve boolean,
  p_host_response text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row record;
  revised_total numeric(12, 2);
begin
  select r.id, r.booking_id, r.request_type, r.status, r.requested_check_in,
      r.requested_check_out, r.current_check_in, r.current_check_out,
      r.estimated_refund_amount,
         b.status as booking_status, b.listing_id, b.check_in, b.check_out,
         b.total_amount, l.price_per_night, l.service_fee_percent
    into request_row
    from public.booking_change_requests r
    join public.bookings b on b.id = r.booking_id
    join public.listings l on l.id = b.listing_id
   where r.id = p_request_id
     and r.host_id = (select auth.uid())
   for update of r, b;

  if not found then
    raise exception 'REQUEST_NOT_FOUND_OR_FORBIDDEN';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'REQUEST_ALREADY_HANDLED';
  end if;

  if not p_approve then
    update public.booking_change_requests
       set status = 'declined',
           host_response = nullif(left(trim(coalesce(p_host_response, '')), 1000), ''),
           responded_at = now()
     where id = p_request_id;
    insert into public.booking_updates (booking_id, actor_id, event_type, summary)
    values (
      request_row.booking_id,
      (select auth.uid()),
      'request_declined',
      case when request_row.request_type = 'cancellation' then 'Host declined cancellation request' else 'Host declined date-change request' end
    );
    return;
  end if;

  if request_row.booking_status <> 'confirmed' then
    raise exception 'BOOKING_NOT_CHANGEABLE';
  end if;
  if request_row.check_in <> request_row.current_check_in
     or request_row.check_out <> request_row.current_check_out then
    raise exception 'BOOKING_DATES_CHANGED';
  end if;

  if request_row.request_type = 'cancellation' then
    if request_row.check_in <= current_date then
      raise exception 'CANCELLATION_WINDOW_CLOSED';
    end if;

    update public.bookings
       set status = 'cancelled'
     where id = request_row.booking_id
       and status = 'confirmed';

    update public.booking_change_requests
       set status = 'approved',
           refund_processing_status = case
             when estimated_refund_amount > 0 then 'awaiting_manual_processing'
             else 'not_eligible'
           end,
           host_response = nullif(left(trim(coalesce(p_host_response, '')), 1000), ''),
           responded_at = now()
     where id = p_request_id;
    insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
    values (
      request_row.booking_id,
      (select auth.uid()),
      'cancellation_approved',
      'Host approved cancellation request; refund requires manual processing',
      jsonb_build_object('estimated_refund_amount', request_row.estimated_refund_amount)
    );
    return;
  end if;

  if request_row.requested_check_in <= current_date
     or request_row.requested_check_out <= request_row.requested_check_in then
    raise exception 'INVALID_REQUESTED_DATES';
  end if;

  revised_total := round(
    request_row.price_per_night
    * (request_row.requested_check_out - request_row.requested_check_in)
    * (1 + coalesce(request_row.service_fee_percent, 0)),
    2
  );
  if revised_total <> request_row.total_amount then
    raise exception 'PRICE_CHANGE_REQUIRES_SUPPORT';
  end if;

  if exists (
    select 1
      from public.bookings b
     where b.listing_id = request_row.listing_id
       and b.id <> request_row.booking_id
       and b.status in ('pending', 'confirmed')
       and daterange(b.check_in, b.check_out, '[)')
           && daterange(request_row.requested_check_in, request_row.requested_check_out, '[)')
  ) or exists (
    select 1
      from public.host_external_calendar_events e
     where e.listing_id = request_row.listing_id
       and request_row.requested_check_in < e.end_date
       and request_row.requested_check_out > e.start_date
  ) then
    raise exception 'REQUESTED_DATES_UNAVAILABLE';
  end if;

  update public.bookings
     set check_in = request_row.requested_check_in,
         check_out = request_row.requested_check_out
   where id = request_row.booking_id
     and status = 'confirmed';

  update public.booking_change_requests
     set status = 'approved',
         host_response = nullif(left(trim(coalesce(p_host_response, '')), 1000), ''),
         responded_at = now()
   where id = p_request_id;
  insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
  values (
    request_row.booking_id,
    (select auth.uid()),
    'date_change_approved',
    'Host approved date-change request',
    jsonb_build_object('check_in', request_row.requested_check_in, 'check_out', request_row.requested_check_out)
  );
end;
$$;

revoke all on function public.respond_to_booking_change_request(uuid, boolean, text) from public, anon;
grant execute on function public.respond_to_booking_change_request(uuid, boolean, text) to authenticated;

comment on table public.booking_change_requests is
  'Guest cancellation and date-change requests. Refund values are estimates until manually processed.';