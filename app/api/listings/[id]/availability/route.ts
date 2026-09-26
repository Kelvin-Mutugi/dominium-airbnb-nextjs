import { NextResponse } from "next/server";
import { syncStaleCalendarConnectionsForListing } from "@/app/lib/host/calendar-sync";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 10;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  const admin = getSupabaseAdmin();
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (listingError) return NextResponse.json({ error: "Availability is temporarily unavailable." }, { status: 503 });
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  try {
    await syncStaleCalendarConnectionsForListing(id);
  } catch (syncError) {
    console.error("Could not check connected calendars during availability lookup:", syncError);
    return NextResponse.json(
      { error: "Connected calendar availability could not be verified. Please try again shortly." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const [bookingsResult, manualBlocksResult, externalBlocksResult] = await Promise.all([
    admin
      .from("bookings")
      .select("check_in, check_out")
      .eq("listing_id", id)
      .in("status", ["pending", "confirmed"])
      .gt("check_out", today),
    admin
      .from("listing_availability_blocks")
      .select("start_date, end_date")
      .eq("listing_id", id)
      .gt("end_date", today),
    admin
      .from("host_external_calendar_events")
      .select("start_date, end_date")
      .eq("listing_id", id)
      .gt("end_date", today),
  ]);

  if (bookingsResult.error || manualBlocksResult.error || externalBlocksResult.error) {
    return NextResponse.json(
      { error: "Availability is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const ranges = [
    ...(bookingsResult.data ?? []).map((booking) => ({ start: booking.check_in, end: booking.check_out })),
    ...(manualBlocksResult.data ?? []).map((block) => ({ start: block.start_date, end: block.end_date })),
    ...(externalBlocksResult.data ?? []).map((block) => ({ start: block.start_date, end: block.end_date })),
  ];

  return NextResponse.json(
    { ranges },
    { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}