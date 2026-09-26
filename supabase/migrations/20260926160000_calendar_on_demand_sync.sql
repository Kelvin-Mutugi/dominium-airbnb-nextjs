alter table public.host_calendar_connections
  add column if not exists sync_lock_until timestamptz;

create index if not exists host_calendar_connections_listing_sync_idx
  on public.host_calendar_connections (listing_id, last_synced_at);