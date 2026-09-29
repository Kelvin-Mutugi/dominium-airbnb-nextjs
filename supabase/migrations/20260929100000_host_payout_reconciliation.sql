alter table public.bookings
  add column if not exists host_base_amount numeric(12, 2),
  add column if not exists additional_charges_amount numeric(12, 2);

alter table public.bookings
  drop constraint if exists bookings_host_base_amount_nonnegative_check,
  drop constraint if exists bookings_additional_charges_amount_nonnegative_check;

alter table public.bookings
  add constraint bookings_host_base_amount_nonnegative_check
    check (host_base_amount is null or host_base_amount >= 0),
  add constraint bookings_additional_charges_amount_nonnegative_check
    check (additional_charges_amount is null or additional_charges_amount >= 0);

create or replace function public.snapshot_booking_host_payout_breakdown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_charges jsonb;
  stay_nights integer;
  charge_total numeric(12, 2);
begin
  select l.additional_charges
    into listing_charges
    from public.listings l
   where l.id = new.listing_id;

  if not found then
    raise exception 'LISTING_UNAVAILABLE';
  end if;

  stay_nights := new.check_out - new.check_in;
  if stay_nights <= 0 then
    raise exception 'INVALID_DATES';
  end if;

  charge_total := public.calculate_listing_additional_charges(listing_charges, stay_nights);
  if charge_total > coalesce(new.host_payout_amount, 0) then
    raise exception 'INVALID_HOST_PAYOUT_BREAKDOWN';
  end if;

  new.additional_charges_amount := charge_total;
  new.host_base_amount := round(coalesce(new.host_payout_amount, 0) - charge_total, 2);
  return new;
end;
$$;

drop trigger if exists snapshot_booking_host_payout_breakdown_on_insert on public.bookings;
create trigger snapshot_booking_host_payout_breakdown_on_insert
before insert on public.bookings
for each row execute function public.snapshot_booking_host_payout_breakdown();

drop trigger if exists snapshot_booking_host_payout_breakdown_on_reprice on public.bookings;
create trigger snapshot_booking_host_payout_breakdown_on_reprice
before update of listing_id, check_in, check_out, host_payout_amount on public.bookings
for each row execute function public.snapshot_booking_host_payout_breakdown();

comment on column public.bookings.host_base_amount is
  'Host nightly-rate earnings captured when the booking is created or repriced.';
comment on column public.bookings.additional_charges_amount is
  'Host custom listing charges captured when the booking is created or repriced.';