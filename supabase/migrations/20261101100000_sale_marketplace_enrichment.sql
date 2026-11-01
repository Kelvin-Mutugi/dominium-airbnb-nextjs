create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  level text not null check (level in ('county', 'town', 'neighborhood')),
  parent_id uuid references public.locations(id) on delete restrict,
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  created_at timestamptz not null default now(),
  constraint locations_level_parent_check check (
    (level = 'county' and parent_id is null) or
    (level <> 'county' and parent_id is not null)
  )
);

create unique index if not exists locations_root_slug_idx
  on public.locations (slug) where parent_id is null;
create unique index if not exists locations_parent_slug_idx
  on public.locations (parent_id, slug) where parent_id is not null;
create index if not exists locations_parent_level_name_idx
  on public.locations (parent_id, level, name);

create or replace function public.validate_location_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_level text;
begin
  if new.level = 'county' then
    if new.parent_id is not null then
      raise exception 'County locations cannot have a parent';
    end if;
    return new;
  end if;

  select level into parent_level
  from public.locations
  where id = new.parent_id;

  if not found or
     (new.level = 'town' and parent_level <> 'county') or
     (new.level = 'neighborhood' and parent_level <> 'town') then
    raise exception 'Invalid parent for location level %', new.level;
  end if;
  return new;
end;
$$;

drop trigger if exists locations_validate_hierarchy on public.locations;
create trigger locations_validate_hierarchy
  before insert or update of level, parent_id on public.locations
  for each row execute function public.validate_location_hierarchy();

insert into public.locations (name, slug, level)
select seed.name, seed.slug, 'county'
from (values
  ('Nairobi', 'nairobi'),
  ('Kiambu', 'kiambu'),
  ('Kajiado', 'kajiado'),
  ('Machakos', 'machakos'),
  ('Nakuru', 'nakuru'),
  ('Mombasa', 'mombasa'),
  ('Kisumu', 'kisumu')
) as seed(name, slug)
where not exists (
  select 1 from public.locations l
  where l.parent_id is null and l.slug = seed.slug
);

insert into public.locations (name, slug, level, parent_id)
select seed.name, seed.slug, 'town', county.id
from (values
  ('Nairobi', 'nairobi', 'nairobi'),
  ('Kiambu', 'kiambu', 'kiambu'),
  ('Thika', 'thika', 'kiambu'),
  ('Ruiru', 'ruiru', 'kiambu'),
  ('Kikuyu', 'kikuyu', 'kiambu'),
  ('Limuru', 'limuru', 'kiambu'),
  ('Ngong', 'ngong', 'kajiado'),
  ('Kitengela', 'kitengela', 'kajiado'),
  ('Athi River', 'athi-river', 'machakos'),
  ('Naivasha', 'naivasha', 'nakuru'),
  ('Nakuru', 'nakuru', 'nakuru'),
  ('Mombasa', 'mombasa', 'mombasa'),
  ('Kisumu', 'kisumu', 'kisumu')
) as seed(name, slug, county_slug)
join public.locations county on county.slug = seed.county_slug and county.level = 'county'
where not exists (
  select 1 from public.locations existing
  where existing.parent_id = county.id and existing.slug = seed.slug
);

insert into public.locations (name, slug, level, parent_id, lat, lng)
select seed.name, seed.slug, 'neighborhood', town.id, seed.lat, seed.lng
from (values
  ('Westlands', 'westlands', 'nairobi', -1.2676, 36.8108),
  ('Kilimani', 'kilimani', 'nairobi', -1.2921, 36.7850),
  ('Kileleshwa', 'kileleshwa', 'nairobi', -1.2784, 36.7854),
  ('Lavington', 'lavington', 'nairobi', -1.2762, 36.7668),
  ('Karen', 'karen', 'nairobi', -1.3197, 36.6859),
  ('Runda', 'runda', 'nairobi', -1.2095, 36.8071),
  ('Parklands', 'parklands', 'nairobi', -1.2591, 36.8153),
  ('Riverside', 'riverside', 'nairobi', -1.2702, 36.8013),
  ('Upper Hill', 'upper-hill', 'nairobi', -1.2992, 36.8144),
  ('South B', 'south-b', 'nairobi', -1.3152, 36.8362),
  ('South C', 'south-c', 'nairobi', -1.3235, 36.8293),
  ('Langata', 'langata', 'nairobi', -1.3500, 36.7498),
  ('Kasarani', 'kasarani', 'nairobi', -1.2226, 36.8976),
  ('Roysambu', 'roysambu', 'nairobi', -1.2183, 36.8837),
  ('Ruaka', 'ruaka', 'kiambu', -1.2037, 36.7771),
  ('Ruiru', 'ruiru', 'ruiru', -1.1450, 36.9600),
  ('Thika', 'thika', 'thika', -1.0333, 37.0693),
  ('Ngong', 'ngong', 'ngong', -1.3617, 36.6567),
  ('Kitengela', 'kitengela', 'kitengela', -1.4730, 36.9580),
  ('Naivasha', 'naivasha', 'naivasha', -0.7172, 36.4310),
  ('Nakuru', 'nakuru', 'nakuru', -0.3031, 36.0800),
  ('Nyali', 'nyali', 'mombasa', -4.0435, 39.7112),
  ('Kisumu Central', 'kisumu-central', 'kisumu', -0.0917, 34.7680)
) as seed(name, slug, town_slug, lat, lng)
join public.locations town on town.slug = seed.town_slug and town.level = 'town'
join public.locations county on county.id = town.parent_id
where not exists (
  select 1 from public.locations existing
  where existing.parent_id = town.id and existing.slug = seed.slug
);

alter table public.sale_properties
  add column if not exists location_id uuid references public.locations(id) on delete set null,
  add column if not exists lat double precision check (lat is null or lat between -90 and 90),
  add column if not exists lng double precision check (lng is null or lng between -180 and 180),
  add column if not exists published_at timestamptz,
  add column if not exists show_exact_location boolean not null default false,
  add column if not exists title_type text check (title_type is null or title_type in ('freehold', 'leasehold', 'other')),
  add column if not exists title_deed_status text,
  add column if not exists service_charge numeric(14, 2) check (service_charge is null or service_charge >= 0),
  add column if not exists land_rates numeric(14, 2) check (land_rates is null or land_rates >= 0),
  add column if not exists furnished_status text check (furnished_status is null or furnished_status in ('unfurnished', 'semi', 'furnished')),
  add column if not exists occupancy text check (occupancy is null or occupancy in ('vacant', 'tenanted', 'owner_occupied')),
  add column if not exists completion_status text check (completion_status is null or completion_status in ('ready', 'off_plan', 'under_construction')),
  add column if not exists year_built smallint check (year_built is null or year_built between 1800 and 2200),
  add column if not exists floor_level smallint check (floor_level is null or floor_level between -5 and 200),
  add column if not exists plot_size_acres numeric(12, 4) check (plot_size_acres is null or plot_size_acres > 0),
  add column if not exists zoning text,
  add column if not exists road_access text,
  add column if not exists price_negotiable boolean not null default false,
  add column if not exists reason_for_selling text,
  add column if not exists mandate_type text check (mandate_type is null or mandate_type in ('exclusive', 'open')),
  add column if not exists mandate_expiry date,
  add column if not exists commission_terms text,
  add column if not exists open_to_short_stay_management boolean not null default false,
  add column if not exists status_changed_at timestamptz not null default now(),
  add column if not exists sold_at timestamptz,
  add column if not exists sold_price numeric(14, 2) check (sold_price is null or sold_price > 0),
  add column if not exists owner_id_seen boolean not null default false,
  add column if not exists owner_id_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists owner_id_verified_at timestamptz,
  add column if not exists title_copy_seen boolean not null default false,
  add column if not exists title_copy_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists title_copy_verified_at timestamptz,
  add column if not exists site_visit_done boolean not null default false,
  add column if not exists site_visit_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists site_visit_verified_at timestamptz,
  add column if not exists is_verified boolean generated always as (
    owner_id_seen and title_copy_seen and site_visit_done
  ) stored;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sale_properties_owner_id_audit_check') then
    alter table public.sale_properties
      add constraint sale_properties_owner_id_audit_check
      check (not owner_id_seen or (owner_id_verified_by is not null and owner_id_verified_at is not null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sale_properties_title_copy_audit_check') then
    alter table public.sale_properties
      add constraint sale_properties_title_copy_audit_check
      check (not title_copy_seen or (title_copy_verified_by is not null and title_copy_verified_at is not null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sale_properties_site_visit_audit_check') then
    alter table public.sale_properties
      add constraint sale_properties_site_visit_audit_check
      check (not site_visit_done or (site_visit_verified_by is not null and site_visit_verified_at is not null));
  end if;
end;
$$;

update public.sale_properties
set status_changed_at = coalesce(status_changed_at, updated_at, created_at, now()),
    published_at = case when status = 'published' then coalesce(published_at, created_at) else published_at end,
    sold_at = case when status = 'sold' then coalesce(sold_at, updated_at, created_at) else sold_at end;

create index if not exists sale_properties_location_status_idx
  on public.sale_properties (location_id, status, asking_price)
  where status = 'published';

create or replace function public.set_sale_property_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.status_changed_at := coalesce(new.status_changed_at, now());
    if new.status = 'published' then
      new.published_at := coalesce(new.published_at, now());
    end if;
    if new.status = 'sold' then
      new.sold_at := coalesce(new.sold_at, now());
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := now();
  elsif new.status <> 'published' then
    new.published_at := null;
  end if;
  if new.status = 'sold' and old.status is distinct from 'sold' then
    new.sold_at := now();
  elsif new.status <> 'sold' then
    new.sold_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists sale_properties_set_timestamps on public.sale_properties;
create trigger sale_properties_set_timestamps
  before insert or update of status on public.sale_properties
  for each row execute function public.set_sale_property_timestamps();

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.sale_properties(id) on delete cascade,
  old_price numeric(14, 2) not null,
  new_price numeric(14, 2) not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null
);
create index if not exists price_history_property_changed_idx
  on public.price_history (property_id, changed_at desc);

create or replace function public.record_sale_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.asking_price is distinct from old.asking_price then
    insert into public.price_history (property_id, old_price, new_price, changed_by)
    values (new.id, old.asking_price, new.asking_price, new.updated_by);
  end if;
  return new;
end;
$$;

drop trigger if exists sale_properties_price_history on public.sale_properties;
create trigger sale_properties_price_history
  after update of asking_price on public.sale_properties
  for each row execute function public.record_sale_price_change();

alter table public.sale_property_images
  add column if not exists room_tag text not null default 'other'
    check (room_tag in ('living_room', 'kitchen', 'bedroom', 'bathroom', 'exterior', 'floor_plan', 'other')),
  add column if not exists sort_order smallint not null default 0
    check (sort_order between 0 and 14);

update public.sale_property_images set sort_order = position;

alter table public.sale_property_images
  drop constraint if exists sale_property_images_property_id_position_key;
drop index if exists public.sale_property_images_property_sort_order_idx;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sale_property_images_property_sort_order_key'
      and conrelid = 'public.sale_property_images'::regclass
  ) then
    alter table public.sale_property_images
      add constraint sale_property_images_property_sort_order_key
      unique (property_id, sort_order) deferrable initially deferred;
  end if;
end;
$$;

create or replace function public.reorder_sale_property_images(
  p_property_id uuid,
  p_image_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  image_count integer;
  updated_count integer;
begin
  select count(*) into image_count
  from public.sale_property_images
  where property_id = p_property_id;
  if p_image_ids is null or cardinality(p_image_ids) <> image_count or
     cardinality(p_image_ids) > 15 or
     cardinality(p_image_ids) <> (
       select count(distinct requested.image_id)
       from unnest(p_image_ids) as requested(image_id)
     ) then
    raise exception 'Image order must include each property image exactly once';
  end if;

  set constraints sale_property_images_property_sort_order_key deferred;
  update public.sale_property_images image
  set position = ranked.position,
      sort_order = ranked.position
  from (
    select image_id, (ordinality - 1)::smallint as position
    from unnest(p_image_ids) with ordinality as requested(image_id, ordinality)
  ) ranked
  where image.property_id = p_property_id
    and image.id = ranked.image_id;

  get diagnostics updated_count = row_count;
  if updated_count <> image_count then
    raise exception 'Image order contains an image from another property';
  end if;
end;
$$;
revoke all on function public.reorder_sale_property_images(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_sale_property_images(uuid, uuid[]) to service_role;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.sale_properties(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  phone text check (phone is null or char_length(phone) between 8 and 16),
  email text check (email is null or char_length(email) <= 254),
  message text not null default '' check (char_length(message) <= 1200),
  interest_type text,
  buyer_funding text check (buyer_funding is null or buyer_funding in ('cash', 'mortgage', 'unsure')),
  timeline text,
  preferred_contact text check (preferred_contact is null or preferred_contact in ('phone', 'email', 'whatsapp')),
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  session_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'contacted', 'viewing', 'offer', 'closed', 'lost')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contacted_at timestamptz,
  closed_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  old_status text,
  new_status text not null check (new_status in ('new', 'contacted', 'viewing', 'offer', 'closed', 'lost')),
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create or replace function public.set_sale_lead_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.updated_at := now();
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

create or replace function public.record_sale_lead_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_status_history (lead_id, old_status, new_status, changed_by)
    values (new.id, null, new.status, new.updated_by);
  elsif new.status is distinct from old.status then
    insert into public.lead_status_history (lead_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, new.updated_by);
  end if;
  return new;
end;
$$;

drop trigger if exists leads_record_status_history on public.leads;
drop trigger if exists leads_set_timestamps on public.leads;
create trigger leads_set_timestamps
  before update of status on public.leads
  for each row execute function public.set_sale_lead_timestamps();
create trigger leads_record_status_history
  after insert or update of status on public.leads
  for each row execute function public.record_sale_lead_history();

create index if not exists leads_status_created_idx on public.leads (status, created_at desc);
create index if not exists leads_property_created_idx on public.leads (property_id, created_at desc);
create index if not exists leads_assigned_status_idx on public.leads (assigned_to, status, updated_at desc);
create index if not exists lead_status_history_lead_changed_idx
  on public.lead_status_history (lead_id, changed_at desc);

drop table if exists public.sale_property_inquiries;

create table if not exists public.property_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  property_id uuid not null references public.sale_properties(id) on delete cascade,
  event_type text not null check (event_type in (
    'view', 'save', 'gallery_open', 'map_click', 'calculator_use', 'inquiry', 'viewing_request'
  )),
  metadata jsonb not null default '{}'::jsonb check (pg_column_size(metadata) <= 2048),
  created_at timestamptz not null default now()
);
create index if not exists property_events_created_idx
  on public.property_events (created_at desc);
create index if not exists property_events_property_created_idx
  on public.property_events (property_id, created_at desc);
create index if not exists property_events_type_created_idx
  on public.property_events (event_type, created_at desc);
create index if not exists property_events_user_created_idx
  on public.property_events (user_id, created_at desc) where user_id is not null;

create table if not exists public.api_rate_limits (
  key_hash text primary key,
  request_count integer not null,
  window_started_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists api_rate_limits_updated_idx on public.api_rate_limits (updated_at);

create or replace function public.consume_api_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if p_key_hash !~ '^[a-f0-9]{64}$' or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit parameters';
  end if;

  delete from public.api_rate_limits
  where updated_at < now() - interval '24 hours';

  insert into public.api_rate_limits (key_hash, request_count, window_started_at, updated_at)
  values (p_key_hash, 1, now(), now())
  on conflict (key_hash) do update
  set request_count = case
        when api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then 1
        else api_rate_limits.request_count + 1
      end,
      window_started_at = case
        when api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then now()
        else api_rate_limits.window_started_at
      end,
      updated_at = now()
  returning request_count into current_count;
  return current_count <= p_limit;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;

alter table public.locations enable row level security;
alter table public.price_history enable row level security;
alter table public.leads enable row level security;
alter table public.lead_status_history enable row level security;
alter table public.property_events enable row level security;
alter table public.api_rate_limits enable row level security;

revoke all on public.price_history, public.leads, public.lead_status_history,
  public.property_events, public.api_rate_limits from public, anon, authenticated;
grant all privileges on public.price_history, public.leads,
  public.lead_status_history, public.property_events, public.api_rate_limits to service_role;
revoke all on public.locations from public, anon, authenticated;
grant select on public.locations to anon, authenticated, service_role;
drop policy if exists "Public can read sale locations" on public.locations;
create policy "Public can read sale locations"
  on public.locations for select to anon, authenticated using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sale-verification-documents',
  'sale-verification-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Clients cannot read sale verification documents" on storage.objects;
create policy "Clients cannot read sale verification documents"
  on storage.objects as restrictive for select to anon, authenticated
  using (bucket_id <> 'sale-verification-documents');
drop policy if exists "Clients cannot write sale verification documents" on storage.objects;
create policy "Clients cannot write sale verification documents"
  on storage.objects as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'sale-verification-documents');
drop policy if exists "Clients cannot update sale verification documents" on storage.objects;
create policy "Clients cannot update sale verification documents"
  on storage.objects as restrictive for update to anon, authenticated
  using (bucket_id <> 'sale-verification-documents')
  with check (bucket_id <> 'sale-verification-documents');
drop policy if exists "Clients cannot delete sale verification documents" on storage.objects;
create policy "Clients cannot delete sale verification documents"
  on storage.objects as restrictive for delete to anon, authenticated
  using (bucket_id <> 'sale-verification-documents');

comment on table public.locations is 'County > town > neighborhood catalogue for sale listings.';
comment on column public.sale_properties.commission_terms is 'Private seller/brokerage terms; never expose in public queries.';
comment on table public.leads is 'Private buyer leads collected for follow-up by authorized sales staff.';
comment on table public.property_events is 'Consent-gated, minimal property interaction events for recommendations.';
