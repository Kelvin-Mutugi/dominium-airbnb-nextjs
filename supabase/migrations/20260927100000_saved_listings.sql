create table if not exists public.saved_listings (
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.saved_listings enable row level security;

grant select, insert, delete on table public.saved_listings to authenticated;

create policy "Users can view their saved listings"
  on public.saved_listings
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can save listings for themselves"
  on public.saved_listings
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can remove their saved listings"
  on public.saved_listings
  for delete
  to authenticated
  using (user_id = (select auth.uid()));