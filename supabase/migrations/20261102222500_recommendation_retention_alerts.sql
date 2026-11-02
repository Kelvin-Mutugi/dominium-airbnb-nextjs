create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null check (
    anon_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  user_id uuid references auth.users (id) on delete set null,
  filters jsonb not null check (
    jsonb_typeof(filters) = 'object' and pg_column_size(filters) <= 8192
  ),
  contact_channel text not null check (contact_channel in ('email', 'whatsapp')),
  contact_value text not null check (char_length(contact_value) between 3 and 254),
  consented_at timestamptz not null,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  last_notified_at timestamptz,
  active boolean not null default true
);

create index if not exists saved_searches_active_created_idx
  on public.saved_searches (created_at desc)
  where active;
create index if not exists saved_searches_anon_active_idx
  on public.saved_searches (anon_id, created_at desc)
  where active;

alter table public.saved_searches enable row level security;
revoke all on public.saved_searches from public, anon, authenticated;
grant all on public.saved_searches to service_role;

comment on table public.saved_searches is
  'Saved BnB stay filters and expressly consented alert contact details. Contact data is never copied into rec_events.';

create table if not exists public.saved_listing_alerts (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null check (
    anon_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  user_id uuid references auth.users (id) on delete set null,
  listing_id uuid not null references public.listings (id) on delete cascade,
  alert_type text not null check (alert_type in ('price_drop', 'availability')),
  check_in date,
  check_out date,
  contact_channel text not null check (contact_channel in ('email', 'whatsapp')),
  contact_value text not null check (char_length(contact_value) between 3 and 254),
  consented_at timestamptz not null,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  last_observed_price numeric(12, 2) not null check (last_observed_price >= 0),
  last_observed_available boolean,
  created_at timestamptz not null default now(),
  last_checked_at timestamptz,
  last_notified_at timestamptz,
  active boolean not null default true,
  constraint saved_listing_alert_dates_check check (
    (
      alert_type = 'price_drop'
      and check_in is null
      and check_out is null
      and last_observed_available is null
    )
    or (
      alert_type = 'availability'
      and check_in is not null
      and check_out > check_in
      and last_observed_available is not null
    )
  )
);

create index if not exists saved_listing_alerts_active_check_idx
  on public.saved_listing_alerts (last_checked_at asc nulls first, created_at asc)
  where active;
create index if not exists saved_listing_alerts_listing_active_idx
  on public.saved_listing_alerts (listing_id, alert_type)
  where active;
create index if not exists saved_listing_alerts_anon_active_idx
  on public.saved_listing_alerts (anon_id, created_at desc)
  where active;

alter table public.saved_listing_alerts enable row level security;
revoke all on public.saved_listing_alerts from public, anon, authenticated;
grant all on public.saved_listing_alerts to service_role;

comment on table public.saved_listing_alerts is
  'Consented price-drop and date-availability subscriptions for published BnB stays.';

create table if not exists public.rec_alert_notification_queue (
  id uuid primary key default gen_random_uuid(),
  saved_listing_alert_id uuid not null
    references public.saved_listing_alerts (id) on delete cascade,
  event_key text not null check (char_length(event_key) between 1 and 200),
  contact_channel text not null check (contact_channel in ('email', 'whatsapp')),
  contact_value text not null check (char_length(contact_value) between 3 and 254),
  message text not null check (char_length(message) between 1 and 4000),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint rec_alert_notification_queue_alert_event_unique
    unique (saved_listing_alert_id, event_key)
);

create index if not exists rec_alert_notification_queue_pending_idx
  on public.rec_alert_notification_queue (created_at asc)
  where status = 'queued';

alter table public.rec_alert_notification_queue enable row level security;
revoke all on public.rec_alert_notification_queue from public, anon, authenticated;
grant all on public.rec_alert_notification_queue to service_role;

comment on table public.rec_alert_notification_queue is
  'Notification messages queued for later delivery; no email or WhatsApp provider is integrated.';
