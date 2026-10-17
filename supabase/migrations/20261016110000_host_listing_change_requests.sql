create table if not exists public.host_listing_change_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  host_note text check (host_note is null or char_length(host_note) <= 1500),
  before_values jsonb not null,
  after_values jsonb not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'reviewed', 'follow_up')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 3000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists host_listing_change_requests_status_created_idx
  on public.host_listing_change_requests (status, created_at asc);
create index if not exists host_listing_change_requests_listing_created_idx
  on public.host_listing_change_requests (listing_id, created_at desc);
create index if not exists host_listing_change_requests_host_created_idx
  on public.host_listing_change_requests (host_id, created_at desc);

alter table public.host_listing_change_requests enable row level security;
revoke all on public.host_listing_change_requests from public, anon, authenticated;
grant select on public.host_listing_change_requests to authenticated;
grant all privileges on public.host_listing_change_requests to service_role;

drop policy if exists "Hosts can read their listing change requests"
  on public.host_listing_change_requests;
create policy "Hosts can read their listing change requests"
  on public.host_listing_change_requests for select
  to authenticated
  using (host_id = (select auth.uid()));

create or replace function public.host_update_listing_with_change_request(
  p_listing_id uuid,
  p_changes jsonb,
  p_host_note text,
  p_expected_updated_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_host_id uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_request_id uuid;
  v_before jsonb;
  v_after jsonb;
  v_allowed_fields text[] := array[
    'title', 'description', 'county', 'town', 'address', 'property_type',
    'categories', 'price_per_night', 'additional_charges', 'max_guests', 'bedrooms', 'bathrooms',
    'amenities', 'features', 'house_rules', 'check_in_time',
    'check_out_time', 'min_nights', 'instant_book'
  ];
begin
  if v_host_id is null then
    raise exception 'HOST_AUTH_REQUIRED';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = v_host_id and role = 'host' and status is distinct from 'suspended'
  ) then
    raise exception 'HOST_AUTH_REQUIRED';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'INVALID_LISTING_CHANGES';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_changes) as supplied(key)
    where not supplied.key = any(v_allowed_fields)
  ) then
    raise exception 'INVALID_LISTING_CHANGES';
  end if;
  if exists (
    select 1
    from unnest(array[
      'title', 'description', 'county', 'town', 'property_type',
      'check_in_time', 'check_out_time'
    ]) as required_field(key)
    where p_changes ? required_field.key
      and jsonb_typeof(p_changes->required_field.key) <> 'string'
  ) then
    raise exception 'INVALID_LISTING_FIELD_TYPE';
  end if;
  if p_changes ? 'address' and jsonb_typeof(p_changes->'address') not in ('string', 'null') then
    raise exception 'INVALID_LISTING_FIELD_TYPE';
  end if;
  if char_length(trim(coalesce(p_host_note, ''))) > 1500 then
    raise exception 'HOST_NOTE_TOO_LONG';
  end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id and host_id = v_host_id
  for update;
  if not found then
    raise exception 'LISTING_NOT_FOUND';
  end if;
  if p_expected_updated_at is null or v_listing.updated_at <> p_expected_updated_at then
    raise exception 'LISTING_CHANGED_REFRESH';
  end if;

  if (p_changes ? 'title' and char_length(trim(p_changes->>'title')) not between 3 and 120)
     or (p_changes ? 'description' and char_length(coalesce(p_changes->>'description', '')) > 5000)
     or (p_changes ? 'county' and char_length(trim(p_changes->>'county')) not between 2 and 80)
     or (p_changes ? 'town' and char_length(trim(p_changes->>'town')) not between 2 and 100)
     or (p_changes ? 'address' and char_length(coalesce(p_changes->>'address', '')) > 500)
     or (p_changes ? 'property_type' and char_length(trim(p_changes->>'property_type')) not between 1 and 80)
     or (p_changes ? 'check_in_time' and char_length(trim(p_changes->>'check_in_time')) not between 1 and 50)
     or (p_changes ? 'check_out_time' and char_length(trim(p_changes->>'check_out_time')) not between 1 and 50) then
    raise exception 'INVALID_LISTING_FIELD_LENGTH';
  end if;

  if (p_changes ? 'price_per_night' and
      (jsonb_typeof(p_changes->'price_per_night') <> 'number' or
       (p_changes->>'price_per_night')::numeric not between 0.01 and 100000000))
     or (p_changes ? 'max_guests' and
      (jsonb_typeof(p_changes->'max_guests') <> 'number' or
       (p_changes->>'max_guests')::numeric not between 1 and 2147483647 or
       trunc((p_changes->>'max_guests')::numeric) <> (p_changes->>'max_guests')::numeric))
     or (p_changes ? 'bedrooms' and
      (jsonb_typeof(p_changes->'bedrooms') <> 'number' or
       (p_changes->>'bedrooms')::numeric not between 0 and 2147483647 or
       trunc((p_changes->>'bedrooms')::numeric) <> (p_changes->>'bedrooms')::numeric))
     or (p_changes ? 'bathrooms' and
      (jsonb_typeof(p_changes->'bathrooms') <> 'number' or
       (p_changes->>'bathrooms')::numeric not between 0 and 1000))
     or (p_changes ? 'min_nights' and
      (jsonb_typeof(p_changes->'min_nights') <> 'number' or
       (p_changes->>'min_nights')::numeric not between 1 and 2147483647 or
       trunc((p_changes->>'min_nights')::numeric) <> (p_changes->>'min_nights')::numeric)) then
    raise exception 'INVALID_LISTING_NUMBER';
  end if;

  if (p_changes ? 'amenities' and jsonb_typeof(p_changes->'amenities') <> 'array')
     or (p_changes ? 'features' and jsonb_typeof(p_changes->'features') <> 'array')
     or (p_changes ? 'house_rules' and jsonb_typeof(p_changes->'house_rules') <> 'array')
     or (p_changes ? 'categories' and jsonb_typeof(p_changes->'categories') <> 'array')
     or (p_changes ? 'additional_charges' and jsonb_typeof(p_changes->'additional_charges') <> 'array')
     or (p_changes ? 'instant_book' and jsonb_typeof(p_changes->'instant_book') <> 'boolean') then
    raise exception 'INVALID_LISTING_FIELD_TYPE';
  end if;
  if exists (
    select 1
    from unnest(array['amenities', 'features', 'house_rules', 'categories']) as array_field(key)
    where p_changes ? array_field.key
      and (
        jsonb_array_length(p_changes->array_field.key) > 50
        or exists (
          select 1
          from jsonb_array_elements(p_changes->array_field.key) as element(value)
          where jsonb_typeof(element.value) <> 'string'
            or char_length(element.value #>> '{}') > 500
        )
      )
  ) then
    raise exception 'INVALID_LISTING_ARRAY';
  end if;
  if p_changes ? 'additional_charges' and (
    jsonb_array_length(p_changes->'additional_charges') > 20
    or exists (
      select 1
      from jsonb_array_elements(p_changes->'additional_charges') as charge(value)
      where jsonb_typeof(charge.value) <> 'object'
        or jsonb_typeof(charge.value->'name') <> 'string'
        or char_length(trim(charge.value->>'name')) not between 1 and 80
        or jsonb_typeof(charge.value->'amount') <> 'number'
        or case
          when jsonb_typeof(charge.value->'amount') = 'number'
            then (charge.value->>'amount')::numeric not between 0.01 and 100000000
          else true
        end
        or jsonb_typeof(charge.value->'frequency') <> 'string'
        or charge.value->>'frequency' not in ('per_booking', 'per_night')
        or jsonb_typeof(charge.value->'required') <> 'boolean'
    )
    or (
      select count(distinct lower(trim(charge.value->>'name')))
      from jsonb_array_elements(p_changes->'additional_charges') as charge(value)
    ) <> jsonb_array_length(p_changes->'additional_charges')
  ) then
    raise exception 'INVALID_LISTING_ADDITIONAL_CHARGES';
  end if;

  v_before := jsonb_build_object(
    'title', v_listing.title,
    'description', v_listing.description,
    'county', v_listing.county,
    'town', v_listing.town,
    'address', v_listing.address,
    'property_type', v_listing.property_type,
    'categories', v_listing.categories,
    'price_per_night', v_listing.price_per_night,
    'additional_charges', v_listing.additional_charges,
    'max_guests', v_listing.max_guests,
    'bedrooms', v_listing.bedrooms,
    'bathrooms', v_listing.bathrooms,
    'amenities', v_listing.amenities,
    'features', v_listing.features,
    'house_rules', v_listing.house_rules,
    'check_in_time', v_listing.check_in_time,
    'check_out_time', v_listing.check_out_time,
    'min_nights', v_listing.min_nights,
    'instant_book', v_listing.instant_book
  );

  update public.listings
  set title = case when p_changes ? 'title' then trim(p_changes->>'title') else title end,
      description = case when p_changes ? 'description' then p_changes->>'description' else description end,
      county = case when p_changes ? 'county' then trim(p_changes->>'county') else county end,
      town = case when p_changes ? 'town' then trim(p_changes->>'town') else town end,
      address = case when p_changes ? 'address' then nullif(trim(p_changes->>'address'), '') else address end,
      property_type = case when p_changes ? 'property_type' then trim(p_changes->>'property_type') else property_type end,
      categories = case when p_changes ? 'categories'
        then array(select jsonb_array_elements_text(p_changes->'categories'))
        else categories end,
      price_per_night = case when p_changes ? 'price_per_night' then (p_changes->>'price_per_night')::numeric else price_per_night end,
      additional_charges = case when p_changes ? 'additional_charges' then p_changes->'additional_charges' else additional_charges end,
      max_guests = case when p_changes ? 'max_guests' then (p_changes->>'max_guests')::integer else max_guests end,
      bedrooms = case when p_changes ? 'bedrooms' then (p_changes->>'bedrooms')::integer else bedrooms end,
      bathrooms = case when p_changes ? 'bathrooms' then (p_changes->>'bathrooms')::numeric else bathrooms end,
      amenities = case when p_changes ? 'amenities'
        then array(select jsonb_array_elements_text(p_changes->'amenities'))
        else amenities end,
      features = case when p_changes ? 'features'
        then array(select jsonb_array_elements_text(p_changes->'features'))
        else features end,
      house_rules = case when p_changes ? 'house_rules'
        then array(select jsonb_array_elements_text(p_changes->'house_rules'))
        else house_rules end,
      check_in_time = case when p_changes ? 'check_in_time' then trim(p_changes->>'check_in_time') else check_in_time end,
      check_out_time = case when p_changes ? 'check_out_time' then trim(p_changes->>'check_out_time') else check_out_time end,
      min_nights = case when p_changes ? 'min_nights' then (p_changes->>'min_nights')::integer else min_nights end,
      instant_book = case when p_changes ? 'instant_book' then (p_changes->>'instant_book')::boolean else instant_book end,
      updated_at = now()
  where id = p_listing_id and host_id = v_host_id
  returning * into v_listing;

  v_after := jsonb_build_object(
    'title', v_listing.title,
    'description', v_listing.description,
    'county', v_listing.county,
    'town', v_listing.town,
    'address', v_listing.address,
    'property_type', v_listing.property_type,
    'categories', v_listing.categories,
    'price_per_night', v_listing.price_per_night,
    'additional_charges', v_listing.additional_charges,
    'max_guests', v_listing.max_guests,
    'bedrooms', v_listing.bedrooms,
    'bathrooms', v_listing.bathrooms,
    'amenities', v_listing.amenities,
    'features', v_listing.features,
    'house_rules', v_listing.house_rules,
    'check_in_time', v_listing.check_in_time,
    'check_out_time', v_listing.check_out_time,
    'min_nights', v_listing.min_nights,
    'instant_book', v_listing.instant_book
  );

  if v_before = v_after and nullif(trim(coalesce(p_host_note, '')), '') is null then
    raise exception 'NO_LISTING_CHANGES';
  end if;

  insert into public.host_listing_change_requests (
    listing_id, host_id, host_note, before_values, after_values
  ) values (
    p_listing_id, v_host_id, nullif(trim(p_host_note), ''), v_before, v_after
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.host_update_listing_with_change_request(uuid, jsonb, text, timestamptz)
  from public, anon;
grant execute on function public.host_update_listing_with_change_request(uuid, jsonb, text, timestamptz)
  to authenticated;

create or replace function public.host_set_listing_image_cover(
  p_listing_id uuid,
  p_image_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_host_id uuid := auth.uid();
begin
  if v_host_id is null or not exists (
    select 1
    from public.profiles
    where id = v_host_id
      and role = 'host'
      and status is distinct from 'suspended'
  ) then
    raise exception 'HOST_AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.listings
    where id = p_listing_id and host_id = v_host_id
  ) then
    raise exception 'LISTING_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.listing_images
    where id = p_image_id and listing_id = p_listing_id
  ) then
    raise exception 'LISTING_IMAGE_NOT_FOUND';
  end if;

  with ordered_images as (
    select
      id,
      row_number() over (
        order by (id = p_image_id) desc, sort_order asc, id asc
      ) - 1 as next_sort_order
    from public.listing_images
    where listing_id = p_listing_id
  )
  update public.listing_images as image
  set sort_order = ordered_images.next_sort_order
  from ordered_images
  where image.id = ordered_images.id;
end;
$$;

revoke all on function public.host_set_listing_image_cover(uuid, uuid)
  from public, anon;
grant execute on function public.host_set_listing_image_cover(uuid, uuid)
  to authenticated;
