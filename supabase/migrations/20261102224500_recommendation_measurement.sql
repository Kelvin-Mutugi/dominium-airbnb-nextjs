create table if not exists public.rec_impressions (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null check (
    anon_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  surface text not null check (surface in ('home', 'listing', 'search')),
  listing_id uuid not null references public.listings (id) on delete cascade,
  position integer not null check (position between 1 and 100),
  created_at timestamptz not null default now(),
  clicked_at timestamptz,
  constraint rec_impressions_click_after_view_check
    check (clicked_at is null or clicked_at >= created_at)
);

create index if not exists rec_impressions_created_idx
  on public.rec_impressions (created_at desc);
create index if not exists rec_impressions_anon_created_idx
  on public.rec_impressions (anon_id, created_at desc);
create index if not exists rec_impressions_surface_created_idx
  on public.rec_impressions (surface, created_at desc);
create index if not exists rec_impressions_clicked_idx
  on public.rec_impressions (clicked_at desc)
  where clicked_at is not null;

create index if not exists rec_events_created_idx
  on public.rec_events (created_at desc);

alter table public.rec_impressions enable row level security;
revoke all on public.rec_impressions from public, anon, authenticated;
grant all on public.rec_impressions to service_role;

comment on table public.rec_impressions is
  'Visible BnB recommendation cards and their first click, keyed only by the first-party anonymous ID.';

create or replace function public.mark_rec_impressions_clicked(
  p_anon_id text,
  p_impression_ids uuid[]
)
returns void
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  update public.rec_impressions
  set clicked_at = greatest(clock_timestamp(), created_at)
  where anon_id = p_anon_id
    and id = any(coalesce(p_impression_ids, array[]::uuid[]))
    and clicked_at is null;
$$;

revoke all on function public.mark_rec_impressions_clicked(text, uuid[])
  from public, anon, authenticated;
grant execute on function public.mark_rec_impressions_clicked(text, uuid[])
  to service_role;

create or replace view public.rec_metrics_ctr_by_surface
with (security_invoker = true)
as
with reporting_periods as (
  select '7d'::text as period, now() - interval '7 days' as starts_at
  union all
  select '30d'::text, now() - interval '30 days'
),
surfaces as (
  select unnest(array['home', 'listing', 'search']::text[]) as surface
)
select
  reporting_periods.period,
  surfaces.surface,
  count(impression.id)::bigint as impressions,
  count(impression.id) filter (
    where impression.clicked_at is not null
  )::bigint as clicks,
  coalesce(
    count(impression.id) filter (
      where impression.clicked_at is not null
    )::numeric / nullif(count(impression.id), 0),
    0
  ) as ctr
from reporting_periods
cross join surfaces
left join public.rec_impressions as impression
  on impression.surface = surfaces.surface
  and impression.created_at >= reporting_periods.starts_at
  and impression.created_at <= now()
group by reporting_periods.period, surfaces.surface;

create or replace view public.rec_metrics_save_rate_by_surface
with (security_invoker = true)
as
with reporting_periods as (
  select '7d'::text as period, now() - interval '7 days' as starts_at
  union all
  select '30d'::text, now() - interval '30 days'
),
surfaces as (
  select unnest(array['home', 'listing', 'search']::text[]) as surface
),
save_attributions as (
  select distinct on (event.id)
    event.id as event_id,
    impression.id as impression_id
  from public.rec_events as event
  inner join public.rec_impressions as impression
    on impression.anon_id = event.anon_id
    and impression.listing_id = event.listing_id
    and event.created_at >= impression.created_at
    and event.created_at < impression.created_at + interval '7 days'
  where event.event_type = 'save'
    and event.listing_id is not null
  order by event.id, impression.created_at desc, impression.id
)
select
  reporting_periods.period,
  surfaces.surface,
  count(impression.id)::bigint as impressions,
  count(distinct attribution.impression_id)::bigint as saves,
  coalesce(
    count(distinct attribution.impression_id)::numeric
      / nullif(count(impression.id), 0),
    0
  ) as save_rate
from reporting_periods
cross join surfaces
left join public.rec_impressions as impression
  on impression.surface = surfaces.surface
  and impression.created_at >= reporting_periods.starts_at
  and impression.created_at <= now()
left join save_attributions as attribution
  on attribution.impression_id = impression.id
group by reporting_periods.period, surfaces.surface;

create or replace view public.rec_metrics_return_visit_rate
with (security_invoker = true)
as
with reporting_periods as (
  select '7d'::text as period, now() - interval '7 days' as starts_at
  union all
  select '30d'::text, now() - interval '30 days'
),
visitor_days as (
  select
    reporting_periods.period,
    event.anon_id,
    count(distinct (event.created_at at time zone 'UTC')::date) as active_days
  from reporting_periods
  inner join public.rec_events as event
    on event.created_at >= reporting_periods.starts_at
    and event.created_at <= now()
  group by reporting_periods.period, event.anon_id
),
period_totals as (
  select
    reporting_periods.period,
    count(visitor_days.anon_id)::bigint as visitors,
    count(visitor_days.anon_id) filter (
      where visitor_days.active_days >= 2
    )::bigint as returning_visitors
  from reporting_periods
  left join visitor_days
    on visitor_days.period = reporting_periods.period
  group by reporting_periods.period
)
select
  period,
  visitors,
  returning_visitors,
  coalesce(
    returning_visitors::numeric / nullif(visitors, 0),
    0
  ) as return_visit_rate
from period_totals;

create or replace view public.rec_metrics_booking_start_rate
with (security_invoker = true)
as
with reporting_periods as (
  select '7d'::text as period, now() - interval '7 days' as starts_at
  union all
  select '30d'::text, now() - interval '30 days'
),
session_days as (
  select
    reporting_periods.period,
    event.anon_id,
    (event.created_at at time zone 'UTC')::date as session_day,
    bool_or(event.event_type = 'booking_start') as started_booking
  from reporting_periods
  inner join public.rec_events as event
    on event.created_at >= reporting_periods.starts_at
    and event.created_at <= now()
  group by
    reporting_periods.period,
    event.anon_id,
    (event.created_at at time zone 'UTC')::date
),
clicked_session_days as (
  select distinct
    reporting_periods.period,
    impression.anon_id,
    (impression.clicked_at at time zone 'UTC')::date as session_day
  from reporting_periods
  inner join public.rec_impressions as impression
    on impression.clicked_at >= reporting_periods.starts_at
    and impression.clicked_at <= now()
),
cohort_totals as (
  select
    session_days.period,
    clicked_session_days.anon_id is not null as clicked_recommendation,
    count(*)::bigint as sessions,
    count(*) filter (where session_days.started_booking)::bigint
      as booking_sessions
  from session_days
  left join clicked_session_days
    on clicked_session_days.period = session_days.period
    and clicked_session_days.anon_id = session_days.anon_id
    and clicked_session_days.session_day = session_days.session_day
  group by
    session_days.period,
    clicked_session_days.anon_id is not null
),
cohorts as (
  select unnest(array[false, true]) as clicked_recommendation
)
select
  reporting_periods.period,
  cohorts.clicked_recommendation,
  coalesce(cohort_totals.sessions, 0)::bigint as sessions,
  coalesce(cohort_totals.booking_sessions, 0)::bigint as booking_sessions,
  coalesce(
    cohort_totals.booking_sessions::numeric
      / nullif(cohort_totals.sessions, 0),
    0
  ) as booking_start_rate
from reporting_periods
cross join cohorts
left join cohort_totals
  on cohort_totals.period = reporting_periods.period
  and cohort_totals.clicked_recommendation = cohorts.clicked_recommendation;

revoke all on public.rec_metrics_ctr_by_surface,
  public.rec_metrics_save_rate_by_surface,
  public.rec_metrics_return_visit_rate,
  public.rec_metrics_booking_start_rate
  from public, anon, authenticated;
grant select on public.rec_metrics_ctr_by_surface,
  public.rec_metrics_save_rate_by_surface,
  public.rec_metrics_return_visit_rate,
  public.rec_metrics_booking_start_rate
  to service_role;

comment on view public.rec_metrics_ctr_by_surface is
  'Recommendation impressions, clicks, and CTR for rolling 7-day and 30-day periods.';
comment on view public.rec_metrics_save_rate_by_surface is
  'Share of recommendation impressions followed by a matching save within seven days, attributed to the latest prior impression.';
comment on view public.rec_metrics_return_visit_rate is
  'Share of anonymous visitors with events on two or more distinct UTC dates in the rolling reporting period.';
comment on view public.rec_metrics_booking_start_rate is
  'Booking-start rates by anonymous visitor-day, split by whether a recommendation was clicked that UTC day.';
