alter table public.bookings
  add column if not exists completed_at timestamptz,
  add column if not exists completion_source text
    check (completion_source is null or completion_source in ('host', 'system'));

alter type public.payout_status add value if not exists 'processing';

create or replace function public.parse_listing_checkout_time(p_checkout_time text)
returns time
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  normalized text := upper(trim(coalesce(p_checkout_time, '')));
  time_parts text[];
  hour_value integer;
  minute_value integer;
begin
  if normalized ~ '^\d{1,2}:\d{2}\s*(AM|PM)$' then
    time_parts := regexp_match(normalized, '^(\d{1,2}):(\d{2})\s*(AM|PM)$');
    hour_value := time_parts[1]::integer;
    minute_value := time_parts[2]::integer;
    if hour_value between 1 and 12 and minute_value between 0 and 59 then
      hour_value := (hour_value % 12) + case when time_parts[3] = 'PM' then 12 else 0 end;
      return make_time(hour_value, minute_value, 0);
    end if;
  elsif normalized ~ '^\d{1,2}:\d{2}$' then
    time_parts := regexp_match(normalized, '^(\d{1,2}):(\d{2})$');
    hour_value := time_parts[1]::integer;
    minute_value := time_parts[2]::integer;
    if hour_value between 0 and 23 and minute_value between 0 and 59 then
      return make_time(hour_value, minute_value, 0);
    end if;
  end if;

  return time '11:00';
end;
$$;

revoke all on function public.parse_listing_checkout_time(text) from public, anon, authenticated;

create or replace function public.create_host_payout_for_completed_booking()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payout_status text;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    select case
      when (((new.check_out + public.parse_listing_checkout_time(l.check_out_time))
             at time zone 'Africa/Nairobi') + interval '24 hours') <= now()
       and not exists (
         select 1 from public.support_cases sc
          where sc.booking_id = new.id
            and sc.status in ('new', 'in_review', 'waiting_on_user')
       )
       and not exists (
         select 1 from public.booking_change_requests r
          where r.booking_id = new.id
            and r.status = 'pending'
       ) then 'owed'
      else 'processing'
    end
      into payout_status
      from public.listings l
     where l.id = new.listing_id;

    insert into public.payouts (booking_id, host_id, amount, status)
        select new.id, new.host_id, new.host_payout_amount,
          coalesce(payout_status::public.payout_status, 'processing'::public.payout_status)
    where not exists (
      select 1 from public.payouts p where p.booking_id = new.id
    );
  end if;

  return new;
end;
$$;

create or replace function public.complete_due_host_bookings(p_grace_hours integer default 24)
returns table (completed_count integer, payouts_released integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_grace_hours < 0 or p_grace_hours > 168 then
    raise exception 'INVALID_COMPLETION_GRACE';
  end if;

  with due_bookings as (
    select b.id
      from public.bookings b
      join public.listings l on l.id = b.listing_id
     where b.status = 'confirmed'
      and (((b.check_out + public.parse_listing_checkout_time(l.check_out_time))
             at time zone 'Africa/Nairobi') + make_interval(hours => p_grace_hours)) <= now()
       and not exists (
         select 1
           from public.support_cases sc
          where sc.booking_id = b.id
            and sc.status in ('new', 'in_review', 'waiting_on_user')
       )
       and not exists (
         select 1
           from public.booking_change_requests r
          where r.booking_id = b.id
            and r.status = 'pending'
       )
     for update of b skip locked
  ), completed as (
    update public.bookings b
       set status = 'completed',
           completed_at = now(),
           completion_source = 'system'
      from due_bookings d
     where b.id = d.id
       and b.status = 'confirmed'
    returning b.id
  )
  select count(*)::integer into completed_count from completed;

  with releasable as (
    select p.id
      from public.payouts p
      join public.bookings b on b.id = p.booking_id
      join public.listings l on l.id = b.listing_id
     where p.status = 'processing'
       and b.status = 'completed'
       and b.completion_source = 'host'
      and (((b.check_out + public.parse_listing_checkout_time(l.check_out_time))
             at time zone 'Africa/Nairobi') + make_interval(hours => p_grace_hours)) <= now()
       and not exists (
         select 1 from public.support_cases sc
          where sc.booking_id = b.id
            and sc.status in ('new', 'in_review', 'waiting_on_user')
       )
       and not exists (
         select 1 from public.booking_change_requests r
          where r.booking_id = b.id
            and r.status = 'pending'
       )
     for update of p skip locked
  ), released as (
    update public.payouts p
       set status = 'owed'
      from releasable r
     where p.id = r.id
       and p.status = 'processing'
    returning p.id
  )
  select count(*)::integer into payouts_released from released;

  return next;
end;
$$;

revoke all on function public.complete_due_host_bookings(integer) from public, anon, authenticated;
grant execute on function public.complete_due_host_bookings(integer) to service_role;