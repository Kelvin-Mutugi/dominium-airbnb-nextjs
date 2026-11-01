alter table public.sale_properties
  add column if not exists service_charge_period text not null default 'monthly'
    check (service_charge_period in ('monthly', 'annual')),
  add column if not exists land_rates_period text not null default 'annual'
    check (land_rates_period in ('monthly', 'annual'));

insert into public.locations (name, slug, level)
select seed.name, seed.slug, 'county'
from (values
  ('Uasin Gishu', 'uasin-gishu'),
  ('Nyeri', 'nyeri'),
  ('Meru', 'meru'),
  ('Kilifi', 'kilifi'),
  ('Laikipia', 'laikipia'),
  ('Embu', 'embu'),
  ('Kakamega', 'kakamega'),
  ('Bungoma', 'bungoma')
) as seed(name, slug)
where not exists (
  select 1 from public.locations existing
  where existing.parent_id is null and existing.slug = seed.slug
);

insert into public.locations (name, slug, level, parent_id)
select seed.name, seed.slug, 'town', county.id
from (values
  ('Ruaka', 'ruaka', 'kiambu'),
  ('Juja', 'juja', 'kiambu'),
  ('Githunguri', 'githunguri', 'kiambu'),
  ('Mlolongo', 'mlolongo', 'machakos'),
  ('Syokimau', 'syokimau', 'machakos'),
  ('Eldoret', 'eldoret', 'uasin-gishu'),
  ('Nyeri', 'nyeri', 'nyeri'),
  ('Meru', 'meru', 'meru'),
  ('Malindi', 'malindi', 'kilifi'),
  ('Kilifi', 'kilifi', 'kilifi'),
  ('Nanyuki', 'nanyuki', 'laikipia'),
  ('Embu', 'embu', 'embu'),
  ('Kakamega', 'kakamega', 'kakamega'),
  ('Bungoma', 'bungoma', 'bungoma'),
  ('Mtwapa', 'mtwapa', 'kilifi')
) as seed(name, slug, county_slug)
join public.locations county on county.slug = seed.county_slug and county.level = 'county'
where not exists (
  select 1 from public.locations existing
  where existing.parent_id = county.id and existing.slug = seed.slug
);

update public.locations neighborhood
set parent_id = ruaka_town.id
from public.locations old_town
join public.locations ruaka_town
  on ruaka_town.slug = 'ruaka' and ruaka_town.level = 'town'
join public.locations county
  on county.id = ruaka_town.parent_id and county.slug = 'kiambu'
where neighborhood.level = 'neighborhood'
  and neighborhood.slug = 'ruaka'
  and neighborhood.parent_id = old_town.id
  and old_town.level = 'town'
  and old_town.slug = 'kiambu';

insert into public.locations (name, slug, level, parent_id)
select seed.name, seed.slug, 'neighborhood', town.id
from (values
  ('Gigiri', 'gigiri', 'nairobi'),
  ('Muthaiga', 'muthaiga', 'nairobi'),
  ('Spring Valley', 'spring-valley', 'nairobi'),
  ('Loresho', 'loresho', 'nairobi'),
  ('Ridgeways', 'ridgeways', 'nairobi'),
  ('Ngara', 'ngara', 'nairobi'),
  ('Hurlingham', 'hurlingham', 'nairobi'),
  ('Adams Arcade', 'adams-arcade', 'nairobi'),
  ('Ngumo', 'ngumo', 'nairobi'),
  ('Imara Daima', 'imara-daima', 'nairobi'),
  ('Embakasi', 'embakasi', 'nairobi'),
  ('Utawala', 'utawala', 'nairobi'),
  ('Donholm', 'donholm', 'nairobi'),
  ('Buruburu', 'buruburu', 'nairobi'),
  ('Umoja', 'umoja', 'nairobi'),
  ('Pipeline', 'pipeline', 'nairobi'),
  ('Dandora', 'dandora', 'nairobi'),
  ('Mugutha', 'mugutha', 'ruiru'),
  ('Banana Hill', 'banana-hill', 'ruaka'),
  ('Juja Farm', 'juja-farm', 'juja'),
  ('Mlolongo', 'mlolongo', 'mlolongo'),
  ('Syokimau', 'syokimau', 'syokimau'),
  ('Elgon View', 'elgon-view', 'eldoret'),
  ('Kapsoya', 'kapsoya', 'eldoret'),
  ('Milimani', 'milimani', 'nyeri'),
  ('Kamakwa', 'kamakwa', 'nyeri'),
  ('Milimani', 'milimani', 'meru'),
  ('Mtwapa', 'mtwapa', 'mtwapa'),
  ('Casuarina', 'casuarina', 'malindi'),
  ('Milimani', 'milimani', 'nakuru'),
  ('Milimani', 'milimani', 'kisumu'),
  ('Nyali', 'nyali', 'mombasa'),
  ('Bamburi', 'bamburi', 'mombasa'),
  ('Shanzu', 'shanzu', 'mombasa')
) as seed(name, slug, town_slug)
join public.locations town on town.slug = seed.town_slug and town.level = 'town'
where not exists (
  select 1 from public.locations existing
  where existing.parent_id = town.id and existing.slug = seed.slug
);

create table if not exists public.property_event_daily_aggregates (
  property_id uuid not null references public.sale_properties(id) on delete cascade,
  event_date date not null,
  event_type text not null check (event_type in (
    'view', 'save', 'gallery_open', 'map_click', 'calculator_use', 'inquiry', 'viewing_request'
  )),
  event_count bigint not null check (event_count > 0),
  primary key (property_id, event_date, event_type)
);

alter table public.property_event_daily_aggregates enable row level security;
revoke all on public.property_event_daily_aggregates from public, anon, authenticated;
grant all privileges on public.property_event_daily_aggregates to service_role;

create or replace function public.set_sale_lead_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    if new.status = 'contacted' and old.status <> 'contacted' then
      new.contacted_at := now();
    end if;
    if new.status = 'closed' and old.status <> 'closed' then
      new.closed_at := now();
    elsif new.status <> 'closed' then
      new.closed_at := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_set_timestamps on public.leads;
create trigger leads_set_timestamps
  before update on public.leads
  for each row execute function public.set_sale_lead_timestamps();

create or replace function public.apply_sale_data_retention()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  aggregated_groups bigint;
  deleted_events bigint;
  deleted_leads bigint;
begin
  perform pg_advisory_xact_lock(741205, 2);

  with expired_events as materialized (
    select property_id, (created_at at time zone 'UTC')::date as event_date, event_type, count(*) as event_count
    from public.property_events
    where created_at < now() - interval '12 months'
    group by property_id, (created_at at time zone 'UTC')::date, event_type
  )
  insert into public.property_event_daily_aggregates (property_id, event_date, event_type, event_count)
  select property_id, event_date, event_type, event_count
  from expired_events
  on conflict (property_id, event_date, event_type)
  do update set event_count =
    public.property_event_daily_aggregates.event_count + excluded.event_count;

  get diagnostics aggregated_groups = row_count;

  delete from public.property_events
  where created_at < now() - interval '12 months';
  get diagnostics deleted_events = row_count;

  delete from public.leads
  where updated_at < now() - interval '24 months';
  get diagnostics deleted_leads = row_count;

  return jsonb_build_object(
    'aggregate_groups_written', aggregated_groups,
    'raw_events_deleted', deleted_events,
    'leads_deleted', deleted_leads
  );
end;
$$;

revoke all on function public.apply_sale_data_retention() from public, anon, authenticated;
grant execute on function public.apply_sale_data_retention() to service_role;

comment on column public.sale_properties.service_charge_period is
  'Period for service_charge; used to display and normalize recurring cost amounts.';
comment on column public.sale_properties.land_rates_period is
  'Period for land_rates; used to display and normalize recurring cost amounts.';
comment on table public.property_event_daily_aggregates is
  'Anonymous daily event totals; contains no user_id, session_id, or raw event metadata.';
comment on function public.apply_sale_data_retention() is
  'Aggregates and deletes raw sale events older than 12 months and deletes leads inactive for 24 months.';
