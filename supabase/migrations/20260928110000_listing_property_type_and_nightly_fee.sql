alter table public.listings
  add column if not exists property_type text,
  add column if not exists platform_fee_per_night numeric(12, 2);

alter table public.listings
  drop constraint if exists listings_property_type_length_check,
  drop constraint if exists listings_platform_fee_per_night_check;

alter table public.listings
  add constraint listings_property_type_length_check
    check (property_type is null or char_length(trim(property_type)) between 1 and 80),
  add constraint listings_platform_fee_per_night_check
    check (platform_fee_per_night is null or platform_fee_per_night >= 0);

drop function if exists public.create_guest_booking(
  uuid, date, date, integer, integer, integer,
  text, text, text, text, text, text
);

create or replace function public.create_guest_booking(
  p_listing_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_children integer,
  p_rooms integer,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_special_requests text,
  p_payment_method text,
  p_idempotency_key text
)
returns table (
  id uuid,
  status text,
  total_amount numeric,
  commission_amount numeric,
  host_payout_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_row record;
  booking_id uuid;
  nights integer;
  subtotal numeric;
  service_fee numeric;
  final_total numeric;
begin
  if p_check_out <= p_check_in or p_check_in < current_date then
    raise exception 'INVALID_DATES';
  end if;
  if p_guests < 1 or p_children < 0 or p_rooms < 1 then
    raise exception 'INVALID_GUESTS';
  end if;
  if nullif(trim(p_guest_name), '') is null
     or nullif(trim(p_guest_email), '') is null
     or nullif(trim(p_guest_phone), '') is null then
    raise exception 'INVALID_GUEST_DETAILS';
  end if;

  select l.id, l.host_id, l.price_per_night, l.platform_fee_per_night,
         l.max_guests, l.service_fee_percent, l.status
    into listing_row
    from public.listings l
   where l.id = p_listing_id;
  if not found or listing_row.status <> 'published' then
    raise exception 'LISTING_UNAVAILABLE';
  end if;
  if p_guests > listing_row.max_guests then
    raise exception 'TOO_MANY_GUESTS';
  end if;
  if exists (
    select 1 from public.bookings b
     where b.listing_id = p_listing_id
       and b.status in ('pending', 'confirmed')
       and daterange(b.check_in, b.check_out, '[)') && daterange(p_check_in, p_check_out, '[)')
  ) then
    raise exception 'DATES_UNAVAILABLE';
  end if;

  select b.id into booking_id
    from public.bookings b
   where b.idempotency_key = p_idempotency_key
   limit 1;
  if booking_id is not null then
    return query
    select b.id::uuid, b.status::text, b.total_amount::numeric,
           b.commission_amount::numeric, b.host_payout_amount::numeric
      from public.bookings b where b.id = booking_id;
    return;
  end if;

  nights := p_check_out - p_check_in;
  subtotal := round(listing_row.price_per_night * nights, 2);
  service_fee := round(
    case when listing_row.platform_fee_per_night is not null
      then listing_row.platform_fee_per_night * nights
      else subtotal * coalesce(listing_row.service_fee_percent, 0)
    end,
    2
  );
  final_total := subtotal + service_fee;

  insert into public.bookings (
    listing_id, guest_id, host_id, check_in, check_out, guests_count, status,
    total_amount, commission_amount, host_payout_amount, idempotency_key,
    guest_name, guest_email, guest_phone, children_count, rooms_count,
    special_requests, terms_agreed_at
  ) values (
    p_listing_id, null, listing_row.host_id, p_check_in, p_check_out, p_guests,
    'pending', final_total, service_fee, subtotal, p_idempotency_key,
    trim(p_guest_name), lower(trim(p_guest_email)), trim(p_guest_phone),
    p_children, p_rooms, nullif(trim(p_special_requests), ''), now()
  ) returning bookings.id into booking_id;

  insert into public.payments (booking_id, amount, method, status)
  values (booking_id, final_total, p_payment_method::public.payment_method, 'pending');

  return query
  select b.id::uuid, b.status::text, b.total_amount::numeric,
         b.commission_amount::numeric, b.host_payout_amount::numeric
    from public.bookings b where b.id = booking_id;
end;
$$;

revoke all on function public.create_guest_booking(
  uuid, date, date, integer, integer, integer,
  text, text, text, text, text, text
) from public;
grant execute on function public.create_guest_booking(
  uuid, date, date, integer, integer, integer,
  text, text, text, text, text, text
) to anon, authenticated;

create or replace function public.create_booking(
  p_listing_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_payment_method text,
  p_idempotency_key text
)
returns table (
  id uuid,
  status text,
  total_amount numeric,
  commission_amount numeric,
  host_payout_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_row record;
  booking_id uuid;
  nights integer;
  subtotal numeric;
  service_fee numeric;
  final_total numeric;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_check_out <= p_check_in or p_check_in < current_date then raise exception 'INVALID_DATES'; end if;
  if p_guests < 1 then raise exception 'INVALID_GUESTS'; end if;
  if p_payment_method not in ('mpesa', 'card') then raise exception 'INVALID_PAYMENT_METHOD'; end if;

  select l.id, l.host_id, l.price_per_night, l.platform_fee_per_night,
         l.max_guests, l.service_fee_percent, l.status
    into listing_row
    from public.listings l where l.id = p_listing_id;
  if not found or listing_row.status <> 'published' then raise exception 'LISTING_UNAVAILABLE'; end if;
  if p_guests > listing_row.max_guests then raise exception 'TOO_MANY_GUESTS'; end if;
  if exists (
    select 1 from public.bookings b
     where b.listing_id = p_listing_id
       and b.status in ('pending', 'confirmed')
       and daterange(b.check_in, b.check_out, '[)') && daterange(p_check_in, p_check_out, '[)')
  ) then raise exception 'DATES_UNAVAILABLE'; end if;

  select b.id into booking_id
    from public.bookings b
   where b.idempotency_key = p_idempotency_key and b.guest_id = auth.uid()
   limit 1;
  if booking_id is not null then
    return query
    select b.id::uuid, b.status::text, b.total_amount::numeric,
           b.commission_amount::numeric, b.host_payout_amount::numeric
      from public.bookings b where b.id = booking_id;
    return;
  end if;

  nights := p_check_out - p_check_in;
  subtotal := round(listing_row.price_per_night * nights, 2);
  service_fee := round(
    case when listing_row.platform_fee_per_night is not null
      then listing_row.platform_fee_per_night * nights
      else subtotal * coalesce(listing_row.service_fee_percent, 0)
    end,
    2
  );
  final_total := subtotal + service_fee;

  insert into public.bookings (
    listing_id, guest_id, host_id, check_in, check_out, guests_count, status,
    total_amount, commission_amount, host_payout_amount, idempotency_key,
    guest_email, children_count, rooms_count, terms_agreed_at
  ) values (
    p_listing_id, auth.uid(), listing_row.host_id, p_check_in, p_check_out,
    p_guests, 'pending', final_total, service_fee, subtotal, p_idempotency_key,
    lower(auth.email()), 0, 1, now()
  ) returning bookings.id into booking_id;

  insert into public.payments (booking_id, amount, method, status)
  values (booking_id, final_total, p_payment_method::public.payment_method, 'pending');

  return query
  select b.id::uuid, b.status::text, b.total_amount::numeric,
         b.commission_amount::numeric, b.host_payout_amount::numeric
    from public.bookings b where b.id = booking_id;
end;
$$;

revoke all on function public.create_booking(uuid, date, date, integer, text, text) from public;
grant execute on function public.create_booking(uuid, date, date, integer, text, text) to authenticated;

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
      r.estimated_refund_amount, b.status as booking_status, b.listing_id,
      b.check_in, b.check_out, b.total_amount, l.price_per_night,
      l.platform_fee_per_night, l.service_fee_percent
    into request_row
    from public.booking_change_requests r
    join public.bookings b on b.id = r.booking_id
    join public.listings l on l.id = b.listing_id
   where r.id = p_request_id and r.host_id = (select auth.uid())
   for update of r, b;

  if not found then raise exception 'REQUEST_NOT_FOUND_OR_FORBIDDEN'; end if;
  if request_row.status <> 'pending' then raise exception 'REQUEST_ALREADY_HANDLED'; end if;

  if not p_approve then
    update public.booking_change_requests
       set status = 'declined',
           host_response = nullif(left(trim(coalesce(p_host_response, '')), 1000), ''),
           responded_at = now()
     where id = p_request_id;
    insert into public.booking_updates (booking_id, actor_id, event_type, summary)
    values (request_row.booking_id, (select auth.uid()), 'request_declined',
      case when request_row.request_type = 'cancellation' then 'Host declined cancellation request' else 'Host declined date-change request' end);
    return;
  end if;

  if request_row.booking_status <> 'confirmed' then raise exception 'BOOKING_NOT_CHANGEABLE'; end if;
  if request_row.check_in <> request_row.current_check_in or request_row.check_out <> request_row.current_check_out then
    raise exception 'BOOKING_DATES_CHANGED';
  end if;

  if request_row.request_type = 'cancellation' then
    if request_row.check_in <= current_date then raise exception 'CANCELLATION_WINDOW_CLOSED'; end if;
    update public.bookings set status = 'cancelled' where id = request_row.booking_id and status = 'confirmed';
    update public.booking_change_requests
       set status = 'approved',
           refund_processing_status = case when estimated_refund_amount > 0 then 'awaiting_manual_processing' else 'not_eligible' end,
           host_response = nullif(left(trim(coalesce(p_host_response, '')), 1000), ''),
           responded_at = now()
     where id = p_request_id;
    insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
    values (request_row.booking_id, (select auth.uid()), 'cancellation_approved',
      'Host approved cancellation request; refund requires manual processing',
      jsonb_build_object('estimated_refund_amount', request_row.estimated_refund_amount));
    return;
  end if;

  if request_row.requested_check_in <= current_date or request_row.requested_check_out <= request_row.requested_check_in then
    raise exception 'INVALID_REQUESTED_DATES';
  end if;

  revised_total := round(
    request_row.price_per_night * (request_row.requested_check_out - request_row.requested_check_in)
    + case when request_row.platform_fee_per_night is not null
        then request_row.platform_fee_per_night * (request_row.requested_check_out - request_row.requested_check_in)
        else request_row.price_per_night * (request_row.requested_check_out - request_row.requested_check_in) * coalesce(request_row.service_fee_percent, 0)
      end,
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
     set status = 'approved', host_response = nullif(left(trim(coalesce(p_host_response, '')), 1000), ''), responded_at = now()
   where id = p_request_id;
  insert into public.booking_updates (booking_id, actor_id, event_type, summary, details)
  values (request_row.booking_id, (select auth.uid()), 'date_change_approved', 'Host approved date-change request',
    jsonb_build_object('check_in', request_row.requested_check_in, 'check_out', request_row.requested_check_out));
end;
$$;

revoke all on function public.respond_to_booking_change_request(uuid, boolean, text) from public, anon;
grant execute on function public.respond_to_booking_change_request(uuid, boolean, text) to authenticated;