import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

function escapeIcal(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function icalDate(value: string) {
  return value.replaceAll("-", "");
}

function dateStamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function foldIcalLine(line: string) {
  const segments: string[] = [];
  let segment = "";
  let segmentBytes = 0;
  for (const character of line) {
    const characterBytes = new TextEncoder().encode(character).length;
    if (segmentBytes + characterBytes > 75) {
      segments.push(segment);
      segment = ` ${character}`;
      segmentBytes = 1 + characterBytes;
    } else {
      segment += character;
      segmentBytes += characterBytes;
    }
  }
  segments.push(segment);
  return segments.join("\r\n");
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    return NextResponse.json({ error: "Calendar feed not found." }, { status: 404 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const admin = getSupabaseAdmin();
  const { data: feed } = await admin
    .from("host_calendar_export_feeds")
    .select("listing_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!feed) return NextResponse.json({ error: "Calendar feed not found." }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  const [listingResult, bookingsResult, manualBlocksResult, importedBlocksResult] = await Promise.all([
    admin.from("listings").select("id, title").eq("id", feed.listing_id).maybeSingle(),
    admin.from("bookings").select("id, check_in, check_out, status").eq("listing_id", feed.listing_id).in("status", ["pending", "confirmed"]).gt("check_out", today),
    admin.from("listing_availability_blocks").select("id, start_date, end_date, reason").eq("listing_id", feed.listing_id).gt("end_date", today),
    admin.from("host_external_calendar_events").select("id, start_date, end_date").eq("listing_id", feed.listing_id).gt("end_date", today),
  ]);

  if (listingResult.error || bookingsResult.error || manualBlocksResult.error || importedBlocksResult.error) {
    return NextResponse.json({ error: "Calendar feed temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const listing = listingResult.data;
  const bookings = bookingsResult.data;
  const manualBlocks = manualBlocksResult.data;
  const importedBlocks = importedBlocksResult.data;
  if (!listing) return NextResponse.json({ error: "Calendar feed not found." }, { status: 404 });

  const stamp = dateStamp();
  const title = escapeIcal(listing.title);
  const events = [
    ...(bookings ?? []).map((booking) => [
      "BEGIN:VEVENT",
      `UID:booking-${booking.id}@dominiumairbnb.co.ke`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icalDate(booking.check_in)}`,
      `DTEND;VALUE=DATE:${icalDate(booking.check_out)}`,
      `SUMMARY:${title}`,
      `STATUS:${booking.status === "pending" ? "TENTATIVE" : "CONFIRMED"}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ].join("\r\n")),
    ...(manualBlocks ?? []).map((block) => [
      "BEGIN:VEVENT",
      `UID:block-${block.id}@dominiumairbnb.co.ke`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icalDate(block.start_date)}`,
      `DTEND;VALUE=DATE:${icalDate(block.end_date)}`,
      `SUMMARY:${title}${block.reason ? ` - ${escapeIcal(block.reason)}` : " - Unavailable"}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ].join("\r\n")),
    ...(importedBlocks ?? []).map((block) => [
      "BEGIN:VEVENT",
      `UID:external-${block.id}@dominiumairbnb.co.ke`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icalDate(block.start_date)}`,
      `DTEND;VALUE=DATE:${icalDate(block.end_date)}`,
      `SUMMARY:${title} - Unavailable`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ].join("\r\n")),
  ];
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dominium Airbnb//Host Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
    "",
  ].map(foldIcalLine).join("\r\n");

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${listing.id}.ics"`,
      "Cache-Control": "private, max-age=300, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}