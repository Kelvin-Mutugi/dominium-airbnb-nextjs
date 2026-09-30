import { NextResponse } from "next/server";
import { activeBookingFilter } from "@/app/lib/booking/availability";
import { syncStaleCalendarConnectionsForListing } from "@/app/lib/host/calendar-sync";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 15;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export async function POST(request: Request) {
  let body: { listingIds?: unknown; checkIn?: unknown; checkOut?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const ids = Array.isArray(body.listingIds) ? [...new Set(body.listingIds)] : [];
  if (ids.length > 12 || ids.some((id) => typeof id !== "string" || !UUID_RE.test(id))) {
    return NextResponse.json({ error: "Invalid listing selection." }, { status: 400 });
  }
  if (!ids.length) return NextResponse.json({ unavailableIds: [] });
  if (!isValidDate(body.checkIn) || !isValidDate(body.checkOut) || body.checkOut <= body.checkIn) {
    return NextResponse.json({ error: "Choose valid check-in and check-out dates." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error: holdExpiryError } = await admin.rpc("expire_pending_booking_holds");
  if (holdExpiryError) {
    console.error("Could not expire pending booking holds:", holdExpiryError);
    return NextResponse.json(
      { error: "Availability is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data: publishedListings, error: listingError } = await admin
    .from("listings")
    .select("id")
    .in("id", ids)
    .eq("status", "published");
  if (listingError) return NextResponse.json({ error: "Availability is temporarily unavailable." }, { status: 503 });
  const publicListingIds = (publishedListings ?? []).map((listing) => listing.id);
  if (!publicListingIds.length) return NextResponse.json({ unavailableIds: [] });

  try {
    await Promise.all(publicListingIds.map((id) => syncStaleCalendarConnectionsForListing(id)));
  } catch {
    return NextResponse.json(
      { error: "Connected calendar availability could not be verified. Please try again shortly." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const [{ data: bookings, error: bookingError }, { data: manualBlocks, error: manualError }, { data: externalBlocks, error: externalError }] = await Promise.all([
    admin.from("bookings").select("listing_id, hold_expires_at").in("listing_id", publicListingIds).or(activeBookingFilter()).lt("check_in", body.checkOut).gt("check_out", body.checkIn),
    admin.from("listing_availability_blocks").select("listing_id").in("listing_id", publicListingIds).lt("start_date", body.checkOut).gt("end_date", body.checkIn),
    admin.from("host_external_calendar_events").select("listing_id").in("listing_id", publicListingIds).lt("start_date", body.checkOut).gt("end_date", body.checkIn),
  ]);
  if (bookingError || manualError || externalError) {
    return NextResponse.json({ error: "Availability is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const unavailableIds = new Set([
    ...(bookings ?? []).map((row) => row.listing_id),
    ...(manualBlocks ?? []).map((row) => row.listing_id),
    ...(externalBlocks ?? []).map((row) => row.listing_id),
  ]);
  return NextResponse.json({ unavailableIds: [...unavailableIds] }, { headers: { "Cache-Control": "no-store" } });
}