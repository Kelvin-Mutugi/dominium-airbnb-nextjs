alter type public.payout_status add value if not exists 'processing';

create or replace function public.create_host_payout_for_completed_booking()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.payouts (booking_id, host_id, amount, status)
    select new.id, new.host_id, new.host_payout_amount,
           case
             when new.completion_source = 'system' then 'owed'::public.payout_status
             else 'processing'::public.payout_status
           end
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
         select 1 from public.support_cases sc
          where sc.booking_id = b.id
            and sc.status in ('new', 'in_review', 'waiting_on_user')
       )
       and not exists (
         select 1 from public.booking_change_requests r
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

create or replace function public.host_mark_booking_completed(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  booking_row record;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select b.id, b.host_id, b.status, b.check_out, l.check_out_time
    into booking_row
    from public.bookings b
    join public.listings l on l.id = b.listing_id
   where b.id = p_booking_id
     and b.host_id = auth.uid()
   for update of b;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;
  if booking_row.status <> 'confirmed' then
    raise exception 'BOOKING_NOT_CONFIRMED';
  end if;
  if ((booking_row.check_out + public.parse_listing_checkout_time(booking_row.check_out_time))
       at time zone 'Africa/Nairobi') > now() then
    raise exception 'CHECKOUT_TIME_NOT_REACHED';
  end if;
  if exists (
    select 1
      from public.booking_change_requests r
     where r.booking_id = p_booking_id
       and r.status = 'pending'
  ) then
    raise exception 'PENDING_GUEST_REQUEST';
  end if;

  update public.bookings
     set status = 'completed',
         completed_at = now(),
         completion_source = 'host'
   where id = p_booking_id
     and host_id = auth.uid()
     and status = 'confirmed';
end;
$$;

revoke all on function public.host_mark_booking_completed(uuid) from public, anon;
grant execute on function public.host_mark_booking_completed(uuid) to authenticated;