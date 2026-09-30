alter table public.bookings
  add column if not exists guest_country text
    check (guest_country is null or char_length(guest_country) <= 100),
  add column if not exists nights integer
    generated always as (check_out - check_in) stored,
  add column if not exists adults_count integer
    generated always as (greatest(guests_count - children_count, 0)) stored;

grant select (guest_country, nights, adults_count)
  on table public.bookings to authenticated;
