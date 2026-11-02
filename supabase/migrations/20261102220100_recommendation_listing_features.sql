create or replace view public.listing_features
with (security_invoker = true)
as
with published_price_cutoffs as (
  select
    percentile_cont(1.0 / 3.0)
      within group (order by price_per_night::double precision) as budget_cutoff,
    percentile_cont(2.0 / 3.0)
      within group (order by price_per_night::double precision) as mid_cutoff
  from public.listings
  where status = 'published'
    and price_per_night > 0
)
select
  listing.id,
  coalesce(
    nullif(btrim(listing.town), ''),
    nullif(btrim(listing.county), '')
  ) as area,
  listing.bedrooms,
  case
    when cutoffs.budget_cutoff is null
      or listing.price_per_night is null then 'mid'
    when listing.price_per_night::double precision <= cutoffs.budget_cutoff then 'budget'
    when listing.price_per_night::double precision <= cutoffs.mid_cutoff then 'mid'
    else 'premium'
  end as nightly_price_band,
  case
    when jsonb_typeof(listing.amenities) = 'array' then
      array(
        select jsonb_array_elements_text(listing.amenities)
      )
    else array[]::text[]
  end as amenities,
  listing.property_type,
  listing.created_at,
  (listing.status = 'published') as is_active
from public.listings as listing
cross join published_price_cutoffs as cutoffs;

comment on view public.listing_features is
  'Content attributes for BnB listings only; nightly price bands use one-third and two-third percentiles of published BnB nightly prices.';

revoke all on public.listing_features from public, anon, authenticated;
grant select on public.listing_features to service_role;

create or replace function public.get_session_profile(
  p_anon_id text,
  p_user_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with weighted_events as (
    select
      features.area,
      features.bedrooms,
      features.nightly_price_band,
      features.amenities,
      features.property_type,
      (
        case rec_event.event_type
          when 'view' then 1
          when 'long_dwell' then 2
          when 'gallery_open' then 2
          when 'save' then 5
          when 'unsave' then -3
          when 'share' then 5
          when 'booking_start' then 8
        end
      )::numeric * power(
        0.5::numeric,
        greatest(
          extract(epoch from (statement_timestamp() - rec_event.created_at)),
          0
        )::numeric / (14 * 24 * 60 * 60)
      ) as signal_weight
    from public.rec_events as rec_event
    inner join public.listing_features as features
      on features.id = rec_event.listing_id
    where (
        rec_event.anon_id = p_anon_id
        or (p_user_id is not null and rec_event.user_id = p_user_id)
      )
      and features.is_active
      and rec_event.event_type in (
        'view',
        'long_dwell',
        'gallery_open',
        'save',
        'unsave',
        'share',
        'booking_start'
      )
  ),
  dimension_values as (
    select 'areas'::text as dimension, area as value, signal_weight
    from weighted_events
    where area is not null

    union all

    select 'bedrooms', bedrooms::text, signal_weight
    from weighted_events
    where bedrooms is not null

    union all

    select 'price_bands', nightly_price_band, signal_weight
    from weighted_events
    where nightly_price_band is not null

    union all

    select 'amenities', amenity.value, signal_weight
    from weighted_events
    cross join lateral unnest(weighted_events.amenities) as amenity(value)
    where amenity.value is not null

    union all

    select 'property_types', property_type, signal_weight
    from weighted_events
    where property_type is not null
  ),
  positive_tallies as (
    select
      dimension,
      value,
      greatest(sum(signal_weight), 0::numeric) as tally
    from dimension_values
    group by dimension, value
  ),
  dimension_totals as (
    select
      dimension,
      value,
      tally,
      sum(tally) over (partition by dimension) as dimension_total
    from positive_tallies
  ),
  normalized_preferences as (
    select
      dimension,
      value,
      tally / nullif(dimension_total, 0) as preference
    from dimension_totals
    where dimension_total > 0
  ),
  profiles as (
    select
      dimension,
      jsonb_object_agg(value, preference order by value) as preferences
    from normalized_preferences
    group by dimension
  )
  select jsonb_build_object(
    'areas', coalesce(
      (select preferences from profiles where dimension = 'areas'),
      '{}'::jsonb
    ),
    'bedrooms', coalesce(
      (select preferences from profiles where dimension = 'bedrooms'),
      '{}'::jsonb
    ),
    'price_bands', coalesce(
      (select preferences from profiles where dimension = 'price_bands'),
      '{}'::jsonb
    ),
    'amenities', coalesce(
      (select preferences from profiles where dimension = 'amenities'),
      '{}'::jsonb
    ),
    'property_types', coalesce(
      (select preferences from profiles where dimension = 'property_types'),
      '{}'::jsonb
    ),
    'meaningful_event_count', (select count(*) from weighted_events)
  );
$$;

revoke all on function public.get_session_profile(text, uuid)
  from public, anon, authenticated;
grant execute on function public.get_session_profile(text, uuid)
  to service_role;
