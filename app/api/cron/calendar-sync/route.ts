import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { syncConnectionRecord } from "@/app/lib/host/calendar-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

function hasValidCronSecret(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || !authorization.startsWith("Bearer ")) return false;

  const provided = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: connections, error } = await admin
    .from("host_calendar_connections")
    .select("id, host_id, listing_id, source_url")
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(25);

  if (error) {
    return NextResponse.json({ error: "Unable to find calendars to sync." }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;
  for (let offset = 0; offset < (connections ?? []).length; offset += 5) {
    const batch = (connections ?? []).slice(offset, offset + 5);
    const results = await Promise.allSettled(
      batch.map((connection) => syncConnectionRecord(admin, connection)),
    );
    for (const result of results) {
      if (result.status === "fulfilled") synced += 1;
      else failed += 1;
    }
  }

  return NextResponse.json({ synced, failed }, { headers: { "Cache-Control": "no-store" } });
}