revoke select on table public.bookings from public, anon, authenticated;
grant select (
  id,
  listing_id,
  guest_id,
  host_id,
  check_in,
  check_out,
  guests_count,
  children_count,
  rooms_count,
  status,
  total_amount,
  commission_amount,
  host_payout_amount,
  host_base_amount,
  additional_charges_amount,
  guest_name,
  special_requests,
  created_at
) on table public.bookings to authenticated;
grant all on table public.bookings to service_role;

drop policy if exists "Booked guests can read listing arrival guides"
  on public.listing_arrival_guides;

create or replace function public.get_guest_arrival_guide(p_booking_id uuid)
returns table (
  arrival_address text,
  arrival_directions text,
  check_in_instructions text,
  wifi_name text,
  wifi_password text,
  local_tips text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    guide.arrival_address,
    guide.arrival_directions,
    guide.check_in_instructions,
    guide.wifi_name,
    guide.wifi_password,
    guide.local_tips
  from public.listing_arrival_guides as guide
  join public.bookings as booking on booking.listing_id = guide.listing_id
  where booking.id = p_booking_id
    and booking.guest_id = (select auth.uid())
    and booking.status in ('confirmed', 'completed');
$$;

revoke all on function public.get_guest_arrival_guide(uuid) from public, anon, authenticated;
grant execute on function public.get_guest_arrival_guide(uuid) to authenticated;