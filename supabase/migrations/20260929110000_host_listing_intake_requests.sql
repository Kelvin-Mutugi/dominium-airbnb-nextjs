create table if not exists public.host_listing_requests (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  proposed_title text not null check (char_length(trim(proposed_title)) between 3 and 120),
  property_type text not null check (char_length(trim(property_type)) between 2 and 80),
  county text not null check (char_length(trim(county)) between 2 and 80),
  town text not null check (char_length(trim(town)) between 2 and 100),
  address text check (address is null or char_length(address) <= 500),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 40),
  property_notes text check (property_notes is null or char_length(property_notes) <= 3000),
  status text not null default 'submitted' check (status in (
    'submitted',
    'reviewing',
    'visit_scheduled',
    'visited',
    'details_collected',
    'listing_created',
    'declined'
  )),
  proposed_visit_at timestamptz,
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 3000),
  host_message text check (host_message is null or char_length(host_message) <= 1000),
  listing_id uuid references public.listings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists host_listing_requests_status_created_idx
  on public.host_listing_requests (status, created_at asc);

create index if not exists host_listing_requests_host_created_idx
  on public.host_listing_requests (host_id, created_at desc);

alter table public.host_listing_requests enable row level security;
revoke all on public.host_listing_requests from public, anon;
grant select, insert on public.host_listing_requests to authenticated;
grant all privileges on public.host_listing_requests to service_role;

drop policy if exists "Hosts can read their listing requests" on public.host_listing_requests;
create policy "Hosts can read their listing requests"
  on public.host_listing_requests for select
  to authenticated
  using (host_id = (select auth.uid()));

drop policy if exists "Hosts can submit listing requests for themselves" on public.host_listing_requests;
create policy "Hosts can submit listing requests for themselves"
  on public.host_listing_requests for insert
  to authenticated
  with check (
    host_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.role = 'host'
    )
  );