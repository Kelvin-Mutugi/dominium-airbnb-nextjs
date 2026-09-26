import ICAL from "ical.js";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

const MAX_FEED_BYTES = 2 * 1024 * 1024;
const MAX_EVENTS = 5000;
const MAX_RANGE_MONTHS = 24;
const ALLOWED_HOSTS = [
  "airbnb.com",
  "booking.com",
  "vrbo.com",
  "homeaway.com",
  "google.com",
  "outlook.live.com",
  "office365.com",
];

type ParsedBusyEvent = {
  event_uid: string;
  start_date: string;
  end_date: string;
};

type CalendarConnection = {
  id: string;
  host_id: string;
  listing_id: string;
  source_url: string;
};

function isAllowedCalendarHost(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return ALLOWED_HOSTS.some((domain) => normalized === domain || normalized.endsWith(`.${domain}`));
}

export function validateExternalCalendarUrl(value: string) {
  if (value.length > 2048) throw new Error("Calendar URL is too long.");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid calendar URL.");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.hash ||
    !isAllowedCalendarHost(url.hostname)
  ) {
    throw new Error("Use an HTTPS calendar link from Airbnb, Booking.com, Vrbo, Google Calendar, or Outlook.");
  }

  return url.toString();
}

async function readBoundedResponse(response: Response) {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FEED_BYTES || !response.body) throw new Error("Calendar feed is too large or empty.");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_FEED_BYTES) {
      await reader.cancel();
      throw new Error("Calendar feed is too large.");
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(combined);
}

async function fetchCalendarText(sourceUrl: string) {
  const safeUrl = validateExternalCalendarUrl(sourceUrl);
  const response = await fetch(safeUrl, {
    headers: { Accept: "text/calendar, text/plain;q=0.9" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Calendar provider returned HTTP ${response.status}.`);
  return readBoundedResponse(response);
}

function dateInKenya(time: ICAL.Time) {
  if (time.isDate) {
    return `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(time.toJSDate());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseBusyEvents(calendarText: string): ParsedBusyEvent[] {
  const root = new ICAL.Component(ICAL.parse(calendarText));
  const components = root.getAllSubcomponents("vevent");
  if (components.length > MAX_EVENTS) throw new Error("Calendar feed contains too many events.");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(today);
  rangeEnd.setMonth(rangeEnd.getMonth() + MAX_RANGE_MONTHS);
  const rangeStartTime = ICAL.Time.fromJSDate(today, true);
  const rangeEndDate = `${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, "0")}-${String(rangeEnd.getDate()).padStart(2, "0")}`;
  const unique = new Map<string, ParsedBusyEvent>();
  let totalRecurrenceSteps = 0;

  for (const component of components) {
    const event = new ICAL.Event(component);
    const status = String(component.getFirstPropertyValue("status") ?? "").toUpperCase();
    const transparency = String(component.getFirstPropertyValue("transp") ?? "").toUpperCase();
    if (status === "CANCELLED" || transparency === "TRANSPARENT" || !event.startDate || !event.endDate) continue;

    const addOccurrence = (start: ICAL.Time, end: ICAL.Time) => {
      const startDate = dateInKenya(start);
      const endDate = dateInKenya(end);
      if (startDate >= rangeEndDate || endDate <= dateInKenya(rangeStartTime)) return;
      if (endDate <= startDate) return;

      const rawUid = event.uid || `${start.toICALString()}-${end.toICALString()}`;
      const eventUid = createHash("sha256").update(rawUid).digest("hex");
      const key = `${eventUid}:${startDate}`;
      unique.set(key, { event_uid: eventUid, start_date: startDate, end_date: endDate });
      if (unique.size > MAX_EVENTS) throw new Error("Calendar feed expands to too many busy dates.");
    };

    if (event.isRecurring()) {
      const iterator = event.iterator();
      let occurrence = iterator.next();
      let expanded = 0;
      while (occurrence && dateInKenya(occurrence) < rangeEndDate && expanded < 10_000 && totalRecurrenceSteps < 20_000) {
        const details = event.getOccurrenceDetails(occurrence);
        addOccurrence(details.startDate, details.endDate);
        occurrence = iterator.next();
        expanded += 1;
        totalRecurrenceSteps += 1;
      }
      if (expanded >= 10_000 || totalRecurrenceSteps >= 20_000) {
        throw new Error("Calendar feed recurrence is too broad to import safely.");
      }
    } else {
      addOccurrence(event.startDate, event.endDate);
    }
  }

  return [...unique.values()];
}

export async function syncCalendarConnection(connectionId: string) {
  const admin = getSupabaseAdmin();
  const { data: connection, error: connectionError } = await admin
    .from("host_calendar_connections")
    .select("id, host_id, listing_id, source_url")
    .eq("id", connectionId)
    .single();

  if (connectionError || !connection) throw new Error("Calendar connection not found.");
  return syncConnectionRecord(admin, connection as CalendarConnection);
}

export async function syncConnectionRecord(
  admin: SupabaseClient,
  connection: CalendarConnection,
) {
  const syncStartedAt = new Date().toISOString();

  try {
    const feedText = await fetchCalendarText(connection.source_url);
    const parsedEvents = parseBusyEvents(feedText);
    const records = parsedEvents.map((event) => ({
      ...event,
      connection_id: connection.id,
      host_id: connection.host_id,
      listing_id: connection.listing_id,
      last_seen_at: syncStartedAt,
    }));

    for (let offset = 0; offset < records.length; offset += 500) {
      const { error } = await admin
        .from("host_external_calendar_events")
        .upsert(records.slice(offset, offset + 500), {
          onConflict: "connection_id,event_uid,start_date",
        });
      if (error) throw new Error("Unable to save imported calendar dates.");
    }

    const { error: staleEventsError } = await admin
      .from("host_external_calendar_events")
      .delete()
      .eq("connection_id", connection.id)
      .lt("last_seen_at", syncStartedAt);
    if (staleEventsError) throw new Error("Unable to reconcile removed calendar dates.");

    const { error: updateError } = await admin
      .from("host_calendar_connections")
      .update({ last_synced_at: syncStartedAt, last_sync_status: "ok", last_sync_error: null })
      .eq("id", connection.id);
    if (updateError) throw new Error("Unable to record calendar sync status.");

    return { connectionId: connection.id, imported: records.length, status: "ok" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 240) : "Calendar sync failed.";
    await admin
      .from("host_calendar_connections")
      .update({ last_synced_at: syncStartedAt, last_sync_status: "error", last_sync_error: message })
      .eq("id", connection.id);
    throw new Error(message);
  }
}

export function hashCalendarToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}