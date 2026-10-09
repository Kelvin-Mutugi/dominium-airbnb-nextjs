create or replace function public.snapshot_booking_host_payout_breakdown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nightly_rate numeric(12, 2);
  stay_nights integer;
begin
  select l.price_per_night
    into nightly_rate
    from public.listings l
   where l.id = new.listing_id;

  if not found then
    raise exception 'LISTING_UNAVAILABLE';
  end if;

  stay_nights := new.check_out - new.check_in;
  if stay_nights <= 0 then
    raise exception 'INVALID_DATES';
  end if;

  new.host_base_amount := round(nightly_rate * stay_nights, 2);
  new.additional_charges_amount := round(
    coalesce(new.host_payout_amount, 0) - new.host_base_amount,
    2
  );

  if new.additional_charges_amount < 0 then
    raise exception 'INVALID_HOST_PAYOUT_BREAKDOWN';
  end if;

  return new;
end;
$$;

comment on column public.bookings.additional_charges_amount is
  'Host-owned listing charges captured in the host payout at booking creation or repricing.';