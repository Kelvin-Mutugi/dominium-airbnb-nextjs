create table if not exists public.rec_events (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null check (
    anon_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  user_id uuid references auth.users (id) on delete set null,
  listing_id uuid references public.listings (id) on delete cascade,
  event_type text not null check (
    event_type in (
      'view',
      'long_dwell',
      'gallery_open',
      'save',
      'unsave',
      'share',
      'search',
      'filter_apply',
      'booking_start'
    )
  ),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 4096
  ),
  created_at timestamptz not null default now(),
  constraint rec_events_listing_context_check check (
    listing_id is not null or event_type in ('search', 'filter_apply')
  )
);

create index if not exists rec_events_anon_created_idx
  on public.rec_events (anon_id, created_at desc);
create index if not exists rec_events_listing_type_created_idx
  on public.rec_events (listing_id, event_type, created_at desc);
create index if not exists rec_events_user_created_idx
  on public.rec_events (user_id, created_at desc)
  where user_id is not null;

alter table public.rec_events enable row level security;

revoke all on public.rec_events from public, anon, authenticated;
grant insert on public.rec_events to service_role;

comment on table public.rec_events is
  'Minimal BnB stay interaction events keyed by a random first-party anonymous ID; accessed through trusted server code only.';
comment on column public.rec_events.listing_id is
  'Null only for session-level search and filter_apply events.';
