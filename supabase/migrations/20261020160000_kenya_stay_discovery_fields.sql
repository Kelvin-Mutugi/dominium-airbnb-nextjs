alter table public.listings
  add column if not exists monthly_rate numeric(12, 2),
  add column if not exists wifi_mbps integer,
  add column if not exists has_workspace boolean not null default false,
  add column if not exists backup_power text not null default 'none',
  add column if not exists security_features text[] not null default '{}',
  add column if not exists nearest_park_name text,
  add column if not exists park_distance_km numeric(8, 1);

alter table public.listings
  drop constraint if exists listings_categories_check,
  add constraint listings_categories_check
    check (
      categories <@ array[
        'apartments', 'beachfront', 'villas', 'cabins', 'farm-stay',
        'city', 'pet-friendly'
      ]::text[]
    ),
  add constraint listings_monthly_rate_check
    check (monthly_rate is null or monthly_rate between 0.01 and 100000000),
  add constraint listings_wifi_mbps_check
    check (wifi_mbps is null or wifi_mbps between 0 and 10000),
  add constraint listings_backup_power_check
    check (backup_power in ('none', 'inverter', 'solar', 'generator')),
  add constraint listings_security_features_check
    check (
      cardinality(security_features) <= 3
      and security_features <@ array['gated', 'guard_24h', 'cctv_common']::text[]
    ),
  add constraint listings_nearest_park_name_check
    check (nearest_park_name is null or char_length(nearest_park_name) <= 120),
  add constraint listings_park_distance_km_check
    check (park_distance_km is null or park_distance_km between 0 and 10000);

alter function public.host_update_listing_with_change_request(
  uuid, jsonb, text, timestamptz
) rename to host_update_listing_with_change_request_v1;

revoke all on function public.host_update_listing_with_change_request_v1(
  uuid, jsonb, text, timestamptz
) from public, anon, authenticated;

create function public.host_update_listing_with_change_request(
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
  v_request_id uuid;
  v_metadata_before jsonb;
  v_metadata_after jsonb;
  v_metadata_requested jsonb;
  v_metadata_field text;
  v_metadata_value jsonb;
  v_changes jsonb;
  v_metadata_fields text[] := array[
    'monthly_rate', 'wifi_mbps', 'has_workspace', 'backup_power',
    'security_features', 'nearest_park_name', 'park_distance_km'
  ];
begin
  if v_host_id is null then
    raise exception 'HOST_AUTH_REQUIRED';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'INVALID_LISTING_CHANGES';
  end if;

  if (p_changes ? 'monthly_rate' and jsonb_typeof(p_changes->'monthly_rate') not in ('number', 'null'))
     or (p_changes ? 'monthly_rate' and jsonb_typeof(p_changes->'monthly_rate') = 'number'
       and (p_changes->>'monthly_rate')::numeric not between 0.01 and 100000000)
     or (p_changes ? 'wifi_mbps' and jsonb_typeof(p_changes->'wifi_mbps') not in ('number', 'null'))
     or (p_changes ? 'wifi_mbps' and jsonb_typeof(p_changes->'wifi_mbps') = 'number'
       and ((p_changes->>'wifi_mbps')::numeric not between 0 and 10000
         or trunc((p_changes->>'wifi_mbps')::numeric) <> (p_changes->>'wifi_mbps')::numeric))
     or (p_changes ? 'has_workspace' and jsonb_typeof(p_changes->'has_workspace') <> 'boolean')
     or (p_changes ? 'backup_power' and (
       jsonb_typeof(p_changes->'backup_power') <> 'string'
       or p_changes->>'backup_power' not in ('none', 'inverter', 'solar', 'generator')
     ))
     or (p_changes ? 'security_features' and jsonb_typeof(p_changes->'security_features') <> 'array')
     or (p_changes ? 'nearest_park_name' and jsonb_typeof(p_changes->'nearest_park_name') not in ('string', 'null'))
     or (p_changes ? 'nearest_park_name' and char_length(coalesce(p_changes->>'nearest_park_name', '')) > 120)
     or (p_changes ? 'park_distance_km' and jsonb_typeof(p_changes->'park_distance_km') not in ('number', 'null'))
     or (p_changes ? 'park_distance_km' and jsonb_typeof(p_changes->'park_distance_km') = 'number'
       and (p_changes->>'park_distance_km')::numeric not between 0 and 10000) then
    raise exception 'INVALID_LISTING_DISCOVERY_FIELD';
  end if;

  if p_changes ? 'security_features' and (
    jsonb_array_length(p_changes->'security_features') > 3
    or exists (
      select 1
      from jsonb_array_elements(p_changes->'security_features') as feature(value)
      where jsonb_typeof(feature.value) <> 'string'
        or feature.value #>> '{}' not in ('gated', 'guard_24h', 'cctv_common')
    )
    or (
      select count(distinct feature.value #>> '{}')
      from jsonb_array_elements(p_changes->'security_features') as feature(value)
    ) <> jsonb_array_length(p_changes->'security_features')
  ) then
    raise exception 'INVALID_LISTING_DISCOVERY_FIELD';
  end if;

  select jsonb_build_object(
    'monthly_rate', monthly_rate,
    'wifi_mbps', wifi_mbps,
    'has_workspace', has_workspace,
    'backup_power', backup_power,
    'security_features', security_features,
    'nearest_park_name', nearest_park_name,
    'park_distance_km', park_distance_km
  )
  into v_metadata_before
  from public.listings
  where id = p_listing_id and host_id = v_host_id
  for update;
  if not found then
    raise exception 'LISTING_NOT_FOUND';
  end if;

  v_metadata_requested := v_metadata_before;
  foreach v_metadata_field in array v_metadata_fields loop
    if p_changes ? v_metadata_field then
      v_metadata_value := p_changes->v_metadata_field;
      if v_metadata_field = 'nearest_park_name' then
        v_metadata_value := coalesce(
          to_jsonb(nullif(trim(p_changes->>v_metadata_field), '')),
          'null'::jsonb
        );
      end if;
      v_metadata_requested := jsonb_set(
        v_metadata_requested,
        array[v_metadata_field],
        v_metadata_value,
        true
      );
    end if;
  end loop;

  v_changes := p_changes - v_metadata_fields;
  if v_changes = '{}'::jsonb
     and nullif(trim(coalesce(p_host_note, '')), '') is null
     and v_metadata_requested = v_metadata_before then
    raise exception 'NO_CHANGES';
  end if;

  v_request_id := public.host_update_listing_with_change_request_v1(
    p_listing_id,
    v_changes,
    case
      when v_changes = '{}'::jsonb and nullif(trim(coalesce(p_host_note, '')), '') is null
        and p_changes ?| v_metadata_fields
        then 'Updated stay details.'
      else p_host_note
    end,
    p_expected_updated_at
  );

  update public.listings
  set monthly_rate = case when p_changes ? 'monthly_rate'
        then (p_changes->>'monthly_rate')::numeric else monthly_rate end,
      wifi_mbps = case when p_changes ? 'wifi_mbps'
        then (p_changes->>'wifi_mbps')::integer else wifi_mbps end,
      has_workspace = case when p_changes ? 'has_workspace'
        then (p_changes->>'has_workspace')::boolean else has_workspace end,
      backup_power = case when p_changes ? 'backup_power'
        then p_changes->>'backup_power' else backup_power end,
      security_features = case when p_changes ? 'security_features'
        then array(select jsonb_array_elements_text(p_changes->'security_features'))
        else security_features end,
      nearest_park_name = case when p_changes ? 'nearest_park_name'
        then nullif(trim(p_changes->>'nearest_park_name'), '') else nearest_park_name end,
      park_distance_km = case when p_changes ? 'park_distance_km'
        then (p_changes->>'park_distance_km')::numeric else park_distance_km end,
      updated_at = now()
  where id = p_listing_id and host_id = v_host_id
  returning jsonb_build_object(
    'monthly_rate', monthly_rate,
    'wifi_mbps', wifi_mbps,
    'has_workspace', has_workspace,
    'backup_power', backup_power,
    'security_features', security_features,
    'nearest_park_name', nearest_park_name,
    'park_distance_km', park_distance_km
  ) into v_metadata_after;

  update public.host_listing_change_requests
  set before_values = before_values || v_metadata_before,
      after_values = after_values || v_metadata_after,
      updated_at = now()
  where id = v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.host_update_listing_with_change_request(
  uuid, jsonb, text, timestamptz
) from public, anon;
grant execute on function public.host_update_listing_with_change_request(
  uuid, jsonb, text, timestamptz
) to authenticated;
