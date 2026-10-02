-- Creates one clearly labeled, past-checkout booking for testing the host's
-- manual "Mark completed" flow. Run in the Supabase SQL Editor as an admin.
-- Re-running this script will not create a duplicate fixture.

do $$
declare
  test_marker constant text := '[TEST FIXTURE: HOST MANUAL COMPLETION]';
  test_host_id constant uuid := '925b9c7e-2617-453b-a2e5-e36793229203';
  existing_booking_id uuid;
  listing_row record;
  test_nights integer;
  test_check_out date := current_date - 1;
  test_check_in date;
  test_subtotal numeric(12, 2);
  test_service_fee numeric(12, 2);
  test_additional_fees numeric(12, 2);
  test_total numeric(12, 2);
  test_host_payout numeric(12, 2);
  new_booking_id uuid;
begin
  select id into existing_booking_id
    from public.bookings
   where special_requests = test_marker
     and host_id = test_host_id
   limit 1;

  if existing_booking_id is not null then
    raise notice 'Test fixture already exists: booking id %', existing_booking_id;
    return;
  end if;

  select id, host_id, price_per_night, platform_fee_per_night,
         service_fee_percent, additional_charges, min_nights
    into listing_row
    from public.listings
   where host_id = test_host_id
     and status = 'published'
     and max_guests >= 1
   order by created_at asc
   limit 1;

  if not found then
    raise exception 'No published listing with room for a guest was found for host %.', test_host_id;
  end if;

  test_nights := greatest(coalesce(listing_row.min_nights, 1), 1);
  test_check_in := test_check_out - test_nights;
  test_subtotal := round(listing_row.price_per_night * test_nights, 2);
  test_service_fee := round(
    case
      when listing_row.platform_fee_per_night is not null
        then listing_row.platform_fee_per_night * test_nights
      else test_subtotal * coalesce(listing_row.service_fee_percent, 0)
    end,
    2
  );
  test_additional_fees := public.calculate_listing_additional_charges(
    listing_row.additional_charges,
    test_nights
  );
  test_total := test_subtotal + test_service_fee + test_additional_fees;
  test_host_payout := test_subtotal + test_additional_fees;

  insert into public.bookings (
    listing_id,
    guest_id,
    host_id,
    check_in,
    check_out,
    guests_count,
    status,
    total_amount,
    commission_amount,
    host_payout_amount,
    idempotency_key,
    guest_name,
    guest_email,
    guest_phone,
    guest_country,
    children_count,
    pets_count,
    rooms_count,
    special_requests,
    terms_agreed_at
  ) values (
    listing_row.id,
    null,
    listing_row.host_id,
    test_check_in,
    test_check_out,
    1,
    'confirmed',
    test_total,
    test_service_fee,
    test_host_payout,
    'manual-completion-test:' || gen_random_uuid()::text,
    'TEST GUEST - SAFE TO REMOVE',
    'host-completion-test@example.com',
    '+254700000001',
    'Test data',
    0,
    0,
    1,
    test_marker,
    now()
  )
  returning id into new_booking_id;

  raise notice 'Created test booking % for listing %; check-out %; nights %; host payout KES %',
    new_booking_id, listing_row.id, test_check_out, test_nights, test_host_payout;
end;
$$;

-- After running, open Host Panel > Bookings > Confirmed and find the row
-- whose guest is "TEST GUEST - SAFE TO REMOVE".
-- The listing's configured checkout time must have passed in Africa/Nairobi.
