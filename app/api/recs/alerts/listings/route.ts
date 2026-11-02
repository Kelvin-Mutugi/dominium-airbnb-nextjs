import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/app/lib/supabase/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { activeBookingFilter, rangesOverlap } from "@/app/lib/booking/availability";
import { hasSameRequestOrigin } from "@/app/lib/http/request-origin";
import {
  readRequestBody,
  RequestBodyTooLargeError,
} from "@/app/lib/request-body";
import { listingAlertSchema } from "@/app/lib/recs/retention-schema";

const ANON_COOKIE = "dominium_anon_id";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 8 * 1024;

const bookingRangesSchema = z.array(
  z.object({ check_in: z.iso.date(), check_out: z.iso.date() }),
);
const calendarRangesSchema = z.array(
  z.object({ start_date: z.iso.date(), end_date: z.iso.date() }),
);

function normalizeContact(channel: "email" | "whatsapp", value: string) {
  if (channel === "email") return value.trim().toLocaleLowerCase();
  const compact = value.trim().replace(/[\s().-]/g, "");
  const national = compact.startsWith("+254")
    ? compact.slice(4)
    : compact.startsWith("254")
      ? compact.slice(3)
      : compact.startsWith("0")
        ? compact.slice(1)
        : compact;
  return `+254${national}`;
}

function withAnonCookie(
  response: NextResponse,
  request: NextRequest,
  anonId: string,
  shouldSetCookie: boolean,
) {
  response.headers.set("Cache-Control", "no-store");
  if (shouldSetCookie && response.status < 400) {
    response.cookies.set(ANON_COOKIE, anonId, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

async function checkAvailability(
  listingId: string,
  checkIn: string,
  checkOut: string,
) {
  const admin = getSupabaseAdmin();
  const [bookings, manualBlocks, calendarBlocks] = await Promise.all([
    admin
      .from("bookings")
      .select("check_in, check_out")
      .eq("listing_id", listingId)
      .or(activeBookingFilter())
      .lt("check_in", checkOut)
      .gt("check_out", checkIn),
    admin
      .from("listing_availability_blocks")
      .select("start_date, end_date")
      .eq("listing_id", listingId)
      .lt("start_date", checkOut)
      .gt("end_date", checkIn),
    admin
      .from("host_external_calendar_events")
      .select("start_date, end_date")
      .eq("listing_id", listingId)
      .lt("start_date", checkOut)
      .gt("end_date", checkIn),
  ]);
  if (bookings.error || manualBlocks.error || calendarBlocks.error) {
    throw new Error("Unable to check stay availability.");
  }

  const parsedBookings = bookingRangesSchema.safeParse(bookings.data);
  const parsedManualBlocks = calendarRangesSchema.safeParse(manualBlocks.data);
  const parsedCalendarBlocks = calendarRangesSchema.safeParse(
    calendarBlocks.data,
  );
  if (
    !parsedBookings.success ||
    !parsedManualBlocks.success ||
    !parsedCalendarBlocks.success
  ) {
    throw new Error("Availability lookup returned an invalid date range.");
  }

  const ranges = [
    ...parsedBookings.data.map((booking) => ({
      start: booking.check_in,
      end: booking.check_out,
    })),
    ...parsedManualBlocks.data.map((block) => ({
      start: block.start_date,
      end: block.end_date,
    })),
    ...parsedCalendarBlocks.data.map((block) => ({
      start: block.start_date,
      end: block.end_date,
    })),
  ];
  return !ranges.some((range) =>
    rangesOverlap(range, { start: checkIn, end: checkOut }),
  );
}

export async function POST(request: NextRequest) {
  if (!hasSameRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await readRequestBody(request, MAX_BODY_BYTES);
  } catch (error) {
    const status = error instanceof RequestBodyTooLargeError ? 413 : 400;
    return NextResponse.json(
      { error: status === 413 ? "Request is too large." : "Invalid alert request." },
      { status },
    );
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid alert request." }, { status: 400 });
  }
  const parsed = listingAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the alert details and contact consent." }, { status: 400 });
  }

  const suppliedAnonId = request.cookies.get(ANON_COOKIE)?.value;
  const anonId =
    suppliedAnonId && UUID_PATTERN.test(suppliedAnonId)
      ? suppliedAnonId
      : crypto.randomUUID();
  const shouldSetCookie = anonId !== suppliedAnonId;
  const alert = parsed.data;

  try {
    const sessionClient = await createClient();
    const {
      data: { user },
      error: userError,
    } = await sessionClient.auth.getUser();
    if (userError) {
      console.error("Listing-alert user lookup failed:", userError.message);
      return withAnonCookie(
        NextResponse.json({ error: "Unable to create this alert." }, { status: 503 }),
        request,
        anonId,
        shouldSetCookie,
      );
    }

    const admin = getSupabaseAdmin();
    const { data: listing, error: listingError } = await admin
      .from("listings")
      .select("id, price_per_night, platform_fee_per_night")
      .eq("id", alert.listingId)
      .eq("status", "published")
      .maybeSingle();
    if (listingError) {
      console.error("Listing-alert listing lookup failed:", listingError);
      return withAnonCookie(
        NextResponse.json({ error: "Unable to create this alert." }, { status: 503 }),
        request,
        anonId,
        shouldSetCookie,
      );
    }
    if (!listing) {
      return withAnonCookie(
        NextResponse.json({ error: "This stay is no longer available." }, { status: 404 }),
        request,
        anonId,
        shouldSetCookie,
      );
    }

    const baselineAvailable =
      alert.alertType === "availability" &&
      alert.checkIn &&
      alert.checkOut
        ? await checkAvailability(
            alert.listingId,
            alert.checkIn,
            alert.checkOut,
          )
        : null;
    const contactValue = normalizeContact(
      alert.contact.contactChannel,
      alert.contact.contactValue,
    );
    const { data, error } = await admin
      .from("saved_listing_alerts")
      .insert({
        anon_id: anonId,
        user_id: user?.id ?? null,
        listing_id: alert.listingId,
        alert_type: alert.alertType,
        check_in: alert.checkIn ?? null,
        check_out: alert.checkOut ?? null,
        contact_channel: alert.contact.contactChannel,
        contact_value: contactValue,
        consented_at: new Date().toISOString(),
        unsubscribe_token: crypto.randomUUID(),
        last_observed_price:
          Number(listing.price_per_night) +
          Number(listing.platform_fee_per_night ?? 0),
        last_observed_available: baselineAvailable,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("Listing alert could not be stored:", error);
      return withAnonCookie(
        NextResponse.json({ error: "Unable to create this alert." }, { status: 503 }),
        request,
        anonId,
        shouldSetCookie,
      );
    }

    const inserted = z.object({ id: z.uuid() }).safeParse(data);
    if (!inserted.success) {
      console.error("Listing-alert insert returned an invalid shape.");
      return withAnonCookie(
        NextResponse.json({ error: "Unable to create this alert." }, { status: 503 }),
        request,
        anonId,
        shouldSetCookie,
      );
    }
    return withAnonCookie(
      NextResponse.json(
        { id: inserted.data.id, message: "Your alert is set." },
        { status: 201 },
      ),
      request,
      anonId,
      shouldSetCookie,
    );
  } catch (error) {
    console.error("Listing-alert request failed:", error);
    return withAnonCookie(
      NextResponse.json({ error: "Unable to create this alert." }, { status: 503 }),
      request,
      anonId,
      shouldSetCookie,
    );
  }
}
