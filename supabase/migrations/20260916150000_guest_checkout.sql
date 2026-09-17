alter table public.bookings
  alter column guest_id drop not null;

alter table public.bookings
  add column if not exists guest_name text,
  add column if not exists guest_email text,
  add column if not exists guest_phone text,
  add column if not exists children_count integer not null default 0,
  add column if not exists rooms_count integer not null default 1,
  add column if not exists special_requests text,
  add column if not exists terms_agreed_at timestamptz;

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

  select l.id, l.host_id, l.price_per_night, l.max_guests, l.service_fee_percent, l.status
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
    select 1
      from public.bookings b
     where b.listing_id = p_listing_id
       and b.status in ('pending', 'confirmed')
       and daterange(b.check_in, b.check_out, '[)') && daterange(p_check_in, p_check_out, '[)')
  ) then
    raise exception 'DATES_UNAVAILABLE';
  end if;

  select b.id
    into booking_id
    from public.bookings b
   where b.idempotency_key = p_idempotency_key
   limit 1;

  if booking_id is not null then
    return query
    select b.id::uuid, b.status::text, b.total_amount::numeric, b.commission_amount::numeric, b.host_payout_amount::numeric
      from public.bookings b
     where b.id = booking_id;
    return;
  end if;

  nights := p_check_out - p_check_in;
  subtotal := round(listing_row.price_per_night * nights, 2);
  service_fee := round(subtotal * coalesce(listing_row.service_fee_percent, 0), 2);
  final_total := subtotal + service_fee;

  insert into public.bookings (
    listing_id,
    guest_id,
    host_id,
    check_in,
    check_out,
    guests_count,
    status,
    total_amount,
    commission_amount,
    host_payout_amount,
    idempotency_key,
    guest_name,
    guest_email,
    guest_phone,
    children_count,
    rooms_count,
    special_requests,
    terms_agreed_at
  ) values (
    p_listing_id,
    null,
    listing_row.host_id,
    p_check_in,
    p_check_out,
    p_guests,
    'pending',
    final_total,
    service_fee,
    subtotal,
    p_idempotency_key,
    trim(p_guest_name),
    lower(trim(p_guest_email)),
    trim(p_guest_phone),
    p_children,
    p_rooms,
    nullif(trim(p_special_requests), ''),
    now()
  )
  returning bookings.id into booking_id;

  insert into public.payments (booking_id, amount, method, status)
  values (booking_id, final_total, p_payment_method::public.payment_method, 'pending');

  return query
  select b.id::uuid, b.status::text, b.total_amount::numeric, b.commission_amount::numeric, b.host_payout_amount::numeric
    from public.bookings b
   where b.id = booking_id;
end;
$$;

revoke all on function public.create_guest_booking(uuid, date, date, integer, integer, integer, text, text, text, text, text, text) from public;
grant execute on function public.create_guest_booking(uuid, date, date, integer, integer, integer, text, text, text, text, text, text) to anon, authenticated;
