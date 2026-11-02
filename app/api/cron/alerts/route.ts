import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { activeBookingFilter, rangesOverlap } from "@/app/lib/booking/availability";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import {
  buildAlertMessage,
  buildUnsubscribeUrl,
} from "@/app/lib/recs/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_ALERTS_PER_RUN = 100;
const alertRowSchema = z.object({
  id: z.uuid(),
  listing_id: z.uuid(),
  alert_type: z.enum(["price_drop", "availability"]),
  check_in: z.iso.date().nullable(),
  check_out: z.iso.date().nullable(),
  contact_channel: z.enum(["email", "whatsapp"]),
  contact_value: z.string(),
  unsubscribe_token: z.uuid(),
  last_observed_price: z.union([z.number(), z.string()]),
  last_observed_available: z.boolean().nullable(),
});
const listingRowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  status: z.string(),
  price_per_night: z.union([z.number(), z.string()]),
  platform_fee_per_night: z.union([z.number(), z.string()]).nullable(),
});
const bookingRangeSchema = z.object({
  listing_id: z.uuid(),
  check_in: z.iso.date(),
  check_out: z.iso.date(),
});
const calendarRangeSchema = z.object({
  listing_id: z.uuid(),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
});

type AlertRow = z.infer<typeof alertRowSchema>;
type BlockRange = { start: string; end: string };
type AvailabilityAlert = AlertRow & {
  alert_type: "availability";
  check_in: string;
  check_out: string;
};

function hasValidCronAuthorization(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function applicationOrigin(request: Request) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredOrigin) return new URL(request.url).origin;
  const parsed = new URL(configuredOrigin);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS.");
  }
  return parsed.origin;
}

function groupRanges(
  ranges: Array<{ listing_id: string; start: string; end: string }>,
) {
  const grouped = new Map<string, BlockRange[]>();
  for (const range of ranges) {
    const listingRanges = grouped.get(range.listing_id) ?? [];
    listingRanges.push({ start: range.start, end: range.end });
    grouped.set(range.listing_id, listingRanges);
  }
  return grouped;
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Cron authorization is not configured." },
      { status: 503 },
    );
  }
  if (!hasValidCronAuthorization(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: rawAlerts, error: alertsError } = await admin
      .from("saved_listing_alerts")
      .select(
        "id, listing_id, alert_type, check_in, check_out, contact_channel, contact_value, unsubscribe_token, last_observed_price, last_observed_available",
      )
      .eq("active", true)
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true })
      .limit(MAX_ALERTS_PER_RUN);
    if (alertsError) {
      console.error("Could not load active listing alerts:", alertsError);
      return NextResponse.json({ error: "Alert processing failed." }, { status: 500 });
    }

    const parsedAlerts = z.array(alertRowSchema).safeParse(rawAlerts);
    if (!parsedAlerts.success) {
      console.error("Active listing alerts returned an invalid shape.");
      return NextResponse.json({ error: "Alert processing failed." }, { status: 500 });
    }
    const alerts: AlertRow[] = parsedAlerts.data;
    if (alerts.length === 0) {
      return NextResponse.json({ examined: 0, queued: 0 });
    }

    const listingIds = [...new Set(alerts.map((alert) => alert.listing_id))];
    const { data: rawListings, error: listingsError } = await admin
      .from("listings")
      .select("id, title, status, price_per_night, platform_fee_per_night")
      .in("id", listingIds);
    if (listingsError) {
      console.error("Could not load alert listing snapshots:", listingsError);
      return NextResponse.json({ error: "Alert processing failed." }, { status: 500 });
    }
    const parsedListings = z.array(listingRowSchema).safeParse(rawListings);
    if (!parsedListings.success) {
      console.error("Alert listing lookup returned an invalid shape.");
      return NextResponse.json({ error: "Alert processing failed." }, { status: 500 });
    }
    const listingsById = new Map(
      parsedListings.data.map((listing) => [listing.id, listing]),
    );
    const availabilityAlerts = alerts.filter(
      (alert): alert is AvailabilityAlert =>
        alert.alert_type === "availability" &&
        alert.check_in !== null &&
        alert.check_out !== null,
    );

    const availabilityByListing = new Map<string, BlockRange[]>();
    if (availabilityAlerts.length > 0) {
      const startDate = availabilityAlerts
        .map((alert) => alert.check_in)
        .sort()[0];
      const endDate = availabilityAlerts
        .map((alert) => alert.check_out)
        .sort()
        .at(-1);
      if (!startDate || !endDate) {
        return NextResponse.json({ error: "Alert date range is invalid." }, { status: 500 });
      }

      const availabilityListingIds = [
        ...new Set(availabilityAlerts.map((alert) => alert.listing_id)),
      ];
      const [bookings, manualBlocks, calendarBlocks] = await Promise.all([
        admin
          .from("bookings")
          .select("listing_id, check_in, check_out")
          .in("listing_id", availabilityListingIds)
          .or(activeBookingFilter())
          .lt("check_in", endDate)
          .gt("check_out", startDate),
        admin
          .from("listing_availability_blocks")
          .select("listing_id, start_date, end_date")
          .in("listing_id", availabilityListingIds)
          .lt("start_date", endDate)
          .gt("end_date", startDate),
        admin
          .from("host_external_calendar_events")
          .select("listing_id, start_date, end_date")
          .in("listing_id", availabilityListingIds)
          .lt("start_date", endDate)
          .gt("end_date", startDate),
      ]);
      if (bookings.error || manualBlocks.error || calendarBlocks.error) {
        console.error("Could not load availability for listing alerts:", {
          bookingError: bookings.error,
          manualBlockError: manualBlocks.error,
          calendarError: calendarBlocks.error,
        });
        return NextResponse.json({ error: "Alert processing failed." }, { status: 500 });
      }

      const parsedBookings = z.array(bookingRangeSchema).safeParse(bookings.data);
      const parsedManualBlocks = z
        .array(calendarRangeSchema.extend({ listing_id: z.uuid() }))
        .safeParse(manualBlocks.data);
      const parsedCalendarBlocks = z
        .array(calendarRangeSchema.extend({ listing_id: z.uuid() }))
        .safeParse(calendarBlocks.data);
      if (!parsedBookings.success || !parsedManualBlocks.success || !parsedCalendarBlocks.success) {
        console.error("Availability lookup returned an invalid range.");
        return NextResponse.json({ error: "Alert processing failed." }, { status: 500 });
      }

      const bookingsByListing = groupRanges(
        parsedBookings.data.map((booking) => ({
          listing_id: booking.listing_id,
          start: booking.check_in,
          end: booking.check_out,
        })),
      );
      const manualRanges = groupRanges(
        parsedManualBlocks.data.map((block) => ({
          listing_id: block.listing_id,
          start: block.start_date,
          end: block.end_date,
        })),
      );
      const calendarRanges = groupRanges(
        parsedCalendarBlocks.data.map((block) => ({
          listing_id: block.listing_id,
          start: block.start_date,
          end: block.end_date,
        })),
      );
      for (const id of availabilityListingIds) {
        availabilityByListing.set(id, [
          ...(bookingsByListing.get(id) ?? []),
          ...(manualRanges.get(id) ?? []),
          ...(calendarRanges.get(id) ?? []),
        ]);
      }
    }

    const origin = applicationOrigin(request);
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    const queueRows: Array<{
      saved_listing_alert_id: string;
      event_key: string;
      contact_channel: "email" | "whatsapp";
      contact_value: string;
      message: string;
    }> = [];
    const updates: Array<{
      id: string;
      patch: Record<string, string | number | boolean | null>;
    }> = [];
    let queuedCount = 0;

    for (const alert of alerts) {
      const listing = listingsById.get(alert.listing_id);
      if (!listing || listing.status !== "published") {
        updates.push({ id: alert.id, patch: { active: false, last_checked_at: now.toISOString() } });
        continue;
      }

      const unsubscribeUrl = buildUnsubscribeUrl(
        alert.unsubscribe_token,
        origin,
      );
      const patch: Record<string, string | number | boolean | null> = {
        last_checked_at: now.toISOString(),
      };
      const checkIn = alert.check_in;
      const checkOut = alert.check_out;

      if (alert.alert_type === "price_drop") {
        const previousPrice = Number(alert.last_observed_price);
        const currentPrice =
          Number(listing.price_per_night) +
          Number(listing.platform_fee_per_night ?? 0);
        if (!Number.isFinite(previousPrice) || !Number.isFinite(currentPrice)) {
          console.error("Invalid listing price encountered while processing alerts.", {
            alertId: alert.id,
            listingId: alert.listing_id,
          });
          return NextResponse.json(
            { error: "Alert processing failed." },
            { status: 500 },
          );
        }
        if (currentPrice < previousPrice) {
          queueRows.push({
            saved_listing_alert_id: alert.id,
            event_key: `price-drop:${previousPrice.toFixed(2)}:${currentPrice.toFixed(2)}:${dayKey}`,
            contact_channel: alert.contact_channel,
            contact_value: alert.contact_value,
            message: buildAlertMessage({
              alertType: "price_drop",
              listingTitle: listing.title,
              previousPrice,
              currentPrice,
              unsubscribeUrl,
            }),
          });
          patch.last_notified_at = now.toISOString();
        }
        patch.last_observed_price = currentPrice;
      } else if (checkIn && checkOut) {
        const isAvailable = !(
          availabilityByListing.get(alert.listing_id) ?? []
        ).some((range) =>
          rangesOverlap(range, {
            start: checkIn,
            end: checkOut,
          }),
        );
        if (alert.last_observed_available === false && isAvailable) {
          queueRows.push({
            saved_listing_alert_id: alert.id,
            event_key: `available:${checkIn}:${checkOut}:${dayKey}`,
            contact_channel: alert.contact_channel,
            contact_value: alert.contact_value,
            message: buildAlertMessage({
              alertType: "availability",
              listingTitle: listing.title,
              checkIn,
              checkOut,
              unsubscribeUrl,
            }),
          });
          patch.last_notified_at = now.toISOString();
        }
        patch.last_observed_available = isAvailable;
      }
      updates.push({ id: alert.id, patch });
    }

    if (queueRows.length > 0) {
      const { data: queuedRows, error: queueError } = await admin
        .from("rec_alert_notification_queue")
        .upsert(queueRows, {
          onConflict: "saved_listing_alert_id,event_key",
          ignoreDuplicates: true,
        })
        .select("id");
      if (queueError) {
        console.error("Alert messages could not be queued:", queueError);
        return NextResponse.json({ error: "Alert processing failed." }, { status: 500 });
      }
      queuedCount = queuedRows?.length ?? 0;
    }

    const updateResults = await Promise.all(
      updates.map(({ id, patch }) =>
        admin
          .from("saved_listing_alerts")
          .update(patch)
          .eq("id", id),
      ),
    );
    const updateError = updateResults.find((result) => result.error)?.error;
    if (updateError) {
      console.error("Alert snapshots could not be updated:", updateError);
      return NextResponse.json({ error: "Alert processing failed." }, { status: 500 });
    }

    return NextResponse.json({
      examined: alerts.length,
      queued: queuedCount,
    });
  } catch (error) {
    console.error("Alert processing failed:", error);
    return NextResponse.json({ error: "Alert processing failed." }, { status: 500 });
  }
}
