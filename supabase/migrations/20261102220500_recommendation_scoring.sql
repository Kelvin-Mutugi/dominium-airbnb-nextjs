alter table public.listings
  add column if not exists featured_rank integer;

create index if not exists listings_published_featured_rank_idx
  on public.listings (featured_rank asc, created_at desc)
  where status = 'published' and featured_rank is not null;

comment on column public.listings.featured_rank is
  'Optional manual recommendation priority; lower ranks appear before algorithmically ranked stays.';

create or replace function public.recommend_listings(
  p_anon_id text,
  p_limit integer,
  p_exclude uuid[] default '{}',
  p_context jsonb default '{}'
)
returns table (
  listing_id uuid,
  profile_match double precision,
  popularity double precision,
  freshness double precision,
  availability_fit double precision,
  score double precision,
  meaningful_event_count integer,
  cold_start boolean,
  featured_rank integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with context as (
    select
      nullif(p_context->>'check_in', '')::date as check_in,
      nullif(p_context->>'check_out', '')::date as check_out,
      coalesce(p_context->'profile', public.get_session_profile(
        p_anon_id,
        nullif(p_context->>'user_id', '')::uuid
      )) as profile,
      coalesce((p_context #>> '{weights,profile}')::double precision, 0) as profile_weight,
      coalesce((p_context #>> '{weights,popularity}')::double precision, 0) as popularity_weight,
      coalesce((p_context #>> '{weights,freshness}')::double precision, 0) as freshness_weight,
      coalesce((p_context #>> '{weights,availability}')::double precision, 0) as availability_weight,
      coalesce((p_context #>> '{cold_start_weights,popularity}')::double precision, 0) as cold_popularity_weight,
      coalesce((p_context #>> '{cold_start_weights,freshness}')::double precision, 0) as cold_freshness_weight,
      least(greatest(coalesce(p_limit, 10), 1), 100) as result_limit,
      coalesce(p_exclude, '{}'::uuid[]) as excluded_ids
  ),
  session as (
    select
      context.*,
      greatest(coalesce((context.profile->>'meaningful_event_count')::integer, 0), 0)
        as event_count
    from context
  ),
  event_counts as (
    select
      event.listing_id,
      count(*) filter (where event.event_type = 'view')::double precision as view_count,
      count(*) filter (where event.event_type = 'save')::double precision as save_count,
      count(*) filter (where event.event_type = 'booking_start')::double precision as booking_start_count
    from public.rec_events as event
    where event.created_at >= statement_timestamp() - interval '30 days'
      and event.listing_id is not null
      and event.event_type in ('view', 'save', 'booking_start')
    group by event.listing_id
  ),
  popularity_counts as (
    select
      features.id as listing_id,
      ln(
        1 + coalesce(event_counts.view_count, 0)
          + coalesce(event_counts.save_count, 0)
          + (2 * coalesce(event_counts.booking_start_count, 0))
      ) as log_popularity
    from public.listing_features as features
    left join event_counts on event_counts.listing_id = features.id
    where features.is_active
  ),
  popularity_maximum as (
    select coalesce(max(log_popularity), 0) as maximum
    from popularity_counts
  ),
  candidates as (
    select
      features.*,
      listing.featured_rank,
      session.profile,
      session.event_count,
      session.check_in,
      session.check_out,
      session.profile_weight,
      session.popularity_weight,
      session.freshness_weight,
      session.availability_weight,
      session.cold_popularity_weight,
      session.cold_freshness_weight,
      coalesce(
        popularity_counts.log_popularity / nullif(popularity_maximum.maximum, 0),
        0
      ) as popularity,
      case
        when features.created_at >= statement_timestamp() - interval '14 days'
          then exp(
            -greatest(
              extract(epoch from (statement_timestamp() - features.created_at)),
              0
            ) / (7 * 24 * 60 * 60)
          )
        else 0
      end as freshness,
      1::double precision as availability_fit
    from public.listing_features as features
    inner join public.listings as listing on listing.id = features.id
    cross join session
    left join popularity_counts on popularity_counts.listing_id = features.id
    cross join popularity_maximum
    where features.is_active
      and not (features.id = any(session.excluded_ids))
      and (
        session.check_in is null
        or session.check_out is null
        or (
          not exists (
            select 1
            from public.bookings as booking
            where booking.listing_id = features.id
              and (
                booking.status = 'confirmed'
                or (
                  booking.status = 'pending'
                  and booking.hold_expires_at > statement_timestamp()
                )
              )
              and booking.check_in < session.check_out
              and booking.check_out > session.check_in
          )
          and not exists (
            select 1
            from public.listing_availability_blocks as block
            where block.listing_id = features.id
              and block.start_date < session.check_out
              and block.end_date > session.check_in
          )
          and not exists (
            select 1
            from public.host_external_calendar_events as external_event
            where external_event.listing_id = features.id
              and external_event.start_date < session.check_out
              and external_event.end_date > session.check_in
          )
        )
      )
  ),
  component_scores as (
    select
      candidates.*,
      coalesce(profile_score.profile_match, 0) as profile_match
    from candidates
    cross join lateral (
      select avg(dimension_score.value) as profile_match
      from (
        values
          (
            case
              when coalesce(candidates.profile->'areas', '{}'::jsonb) <> '{}'::jsonb
                and candidates.area is not null
                then coalesce((candidates.profile->'areas'->>candidates.area)::double precision, 0)
              else null
            end
          ),
          (
            case
              when coalesce(candidates.profile->'bedrooms', '{}'::jsonb) <> '{}'::jsonb
                and candidates.bedrooms is not null
                then coalesce((candidates.profile->'bedrooms'->>candidates.bedrooms::text)::double precision, 0)
              else null
            end
          ),
          (
            case
              when coalesce(candidates.profile->'price_bands', '{}'::jsonb) <> '{}'::jsonb
                then coalesce((candidates.profile->'price_bands'->>candidates.nightly_price_band)::double precision, 0)
              else null
            end
          ),
          (
            case
              when coalesce(candidates.profile->'amenities', '{}'::jsonb) <> '{}'::jsonb
                then coalesce((
                  select sum((candidates.profile->'amenities'->>amenity.value)::double precision)
                  from unnest(candidates.amenities) as amenity(value)
                  where candidates.profile->'amenities' ? amenity.value
                ), 0)
              else null
            end
          ),
          (
            case
              when coalesce(candidates.profile->'property_types', '{}'::jsonb) <> '{}'::jsonb
                and candidates.property_type is not null
                then coalesce((candidates.profile->'property_types'->>candidates.property_type)::double precision, 0)
              else null
            end
          )
      ) as dimension_score(value)
      where dimension_score.value is not null
    ) as profile_score
  ),
  ranked as (
    select
      component_scores.id as listing_id,
      component_scores.featured_rank,
      component_scores.profile_match,
      component_scores.popularity,
      component_scores.freshness,
      component_scores.availability_fit,
      component_scores.event_count as meaningful_event_count,
      (component_scores.event_count < 3) as cold_start,
      case
        when component_scores.event_count < 3 then
          component_scores.cold_popularity_weight * component_scores.popularity
            + component_scores.cold_freshness_weight * component_scores.freshness
        else
          component_scores.profile_weight * component_scores.profile_match
            + component_scores.popularity_weight * component_scores.popularity
            + component_scores.freshness_weight * component_scores.freshness
            + component_scores.availability_weight * component_scores.availability_fit
      end as score,
      component_scores.created_at
    from component_scores
  )
  select
    ranked.listing_id,
    ranked.profile_match,
    ranked.popularity,
    ranked.freshness,
    ranked.availability_fit,
    ranked.score,
    ranked.meaningful_event_count,
    ranked.cold_start,
    ranked.featured_rank
  from ranked
  order by
    ranked.featured_rank asc nulls last,
    ranked.score desc,
    ranked.popularity desc,
    ranked.freshness desc,
    ranked.created_at desc,
    ranked.listing_id
  limit (select result_limit from session);
$$;

comment on function public.recommend_listings(text, integer, uuid[], jsonb) is
  'Ranks published BnB stays. Date searches exclude overlapping bookings, manual blocks, and stored external-calendar events; this function does not initiate calendar synchronization.';

revoke all on function public.recommend_listings(text, integer, uuid[], jsonb)
  from public, anon, authenticated;
grant execute on function public.recommend_listings(text, integer, uuid[], jsonb)
  to service_role;
