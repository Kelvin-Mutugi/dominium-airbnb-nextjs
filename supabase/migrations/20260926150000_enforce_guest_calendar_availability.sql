create or replace function public.prevent_booking_during_external_calendar_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('pending', 'confirmed') and (
    exists (
      select 1
        from public.listing_availability_blocks b
       where b.listing_id = new.listing_id
         and daterange(b.start_date, b.end_date, '[)')
             && daterange(new.check_in, new.check_out, '[)')
    )
    or exists (
      select 1
        from public.host_external_calendar_events e
       where e.listing_id = new.listing_id
         and daterange(e.start_date, e.end_date, '[)')
             && daterange(new.check_in, new.check_out, '[)')
    )
  ) then
    raise exception 'DATES_UNAVAILABLE';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_booking_during_external_calendar_event() from public, anon, authenticated;