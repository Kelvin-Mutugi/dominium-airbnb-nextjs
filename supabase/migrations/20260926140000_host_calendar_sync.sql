create unique index if not exists listings_id_host_id_unique_idx
  on public.listings (id, host_id);

create table if not exists public.host_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  source_name text not null check (char_length(source_name) between 1 and 80),
  source_url text not null check (char_length(source_url) <= 2048),
  last_synced_at timestamptz,
  last_sync_status text not null default 'never'
    check (last_sync_status in ('never', 'ok', 'error')),
  last_sync_error text,
  created_at timestamptz not null default now(),
  constraint host_calendar_connection_listing_owner
    foreign key (listing_id, host_id)
    references public.listings(id, host_id)
    on delete cascade,
  constraint host_calendar_connection_url_unique unique (listing_id, source_url)
);

create table if not exists public.host_external_calendar_events (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.host_calendar_connections(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  event_uid text not null,
  start_date date not null,
  end_date date not null,
  last_seen_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint host_external_calendar_event_valid_range check (end_date > start_date),
  constraint host_external_calendar_event_identity unique (connection_id, event_uid, start_date)
);

create index if not exists host_external_calendar_events_listing_dates_idx
  on public.host_external_calendar_events (listing_id, start_date, end_date);

create or replace function public.prevent_booking_during_external_calendar_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('pending', 'confirmed') and exists (
    select 1
      from public.host_external_calendar_events e
     where e.listing_id = new.listing_id
       and new.check_in < e.end_date
       and new.check_out > e.start_date
  ) then
    raise exception 'DATES_UNAVAILABLE';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_booking_during_external_calendar_event() from public, anon, authenticated;

drop trigger if exists prevent_booking_during_external_calendar_event_insert on public.bookings;
drop trigger if exists prevent_booking_during_external_calendar_event_update on public.bookings;
create trigger prevent_booking_during_external_calendar_event_insert
  before insert
  on public.bookings
  for each row execute function public.prevent_booking_during_external_calendar_event();

create trigger prevent_booking_during_external_calendar_event_update
  before update of listing_id, check_in, check_out, status
  on public.bookings
  for each row execute function public.prevent_booking_during_external_calendar_event();

create table if not exists public.host_calendar_export_feeds (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  constraint host_calendar_export_feed_listing_owner
    foreign key (listing_id, host_id)
    references public.listings(id, host_id)
    on delete cascade
);

alter table public.host_calendar_connections enable row level security;
alter table public.host_external_calendar_events enable row level security;
alter table public.host_calendar_export_feeds enable row level security;

revoke all on public.host_calendar_connections from anon, authenticated;
revoke all on public.host_external_calendar_events from anon, authenticated;
revoke all on public.host_calendar_export_feeds from anon, authenticated;
grant all on public.host_calendar_connections to service_role;
grant all on public.host_external_calendar_events to service_role;
grant all on public.host_calendar_export_feeds to service_role;