create table if not exists public.listing_arrival_guides (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  arrival_address text check (arrival_address is null or char_length(arrival_address) <= 1000),
  arrival_directions text check (arrival_directions is null or char_length(arrival_directions) <= 5000),
  check_in_instructions text check (check_in_instructions is null or char_length(check_in_instructions) <= 5000),
  wifi_name text check (wifi_name is null or char_length(wifi_name) <= 120),
  wifi_password text check (wifi_password is null or char_length(wifi_password) <= 200),
  arrival_contact text check (arrival_contact is null or char_length(arrival_contact) <= 500),
  local_tips text check (local_tips is null or char_length(local_tips) <= 5000),
  updated_at timestamptz not null default now()
);

insert into public.listing_arrival_guides (listing_id, host_id, arrival_address)
select l.id, l.host_id, nullif(trim(l.address), '')
  from public.listings l
 where nullif(trim(l.address), '') is not null
on conflict (listing_id) do update
  set arrival_address = coalesce(public.listing_arrival_guides.arrival_address, excluded.arrival_address);

create index if not exists listing_arrival_guides_host_idx
  on public.listing_arrival_guides (host_id);

alter table public.listing_arrival_guides enable row level security;
revoke all on public.listing_arrival_guides from anon, authenticated;
grant select, insert, update on public.listing_arrival_guides to authenticated;

drop policy if exists "Hosts can manage their listing arrival guides" on public.listing_arrival_guides;
create policy "Hosts can manage their listing arrival guides"
  on public.listing_arrival_guides for all
  to authenticated
  using (host_id = (select auth.uid()))
  with check (
    host_id = (select auth.uid())
    and exists (
      select 1 from public.listings l
       where l.id = listing_arrival_guides.listing_id
         and l.host_id = (select auth.uid())
    )
  );

drop policy if exists "Booked guests can read listing arrival guides" on public.listing_arrival_guides;
create policy "Booked guests can read listing arrival guides"
  on public.listing_arrival_guides for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
       where b.listing_id = listing_arrival_guides.listing_id
         and b.guest_id = (select auth.uid())
         and b.status in ('confirmed', 'completed')
    )
  );

comment on table public.listing_arrival_guides is
  'Private arrival details visible only to the listing host and guests with confirmed or completed bookings.';