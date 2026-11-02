import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { hasSameRequestOrigin } from "@/app/lib/http/request-origin";
import {
  readRequestBody,
  RequestBodyTooLargeError,
} from "@/app/lib/request-body";
import { unsubscribeSchema } from "@/app/lib/recs/retention-schema";

const MAX_BODY_BYTES = 1024;

export async function POST(request: NextRequest) {
  if (!hasSameRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Invalid unsubscribe request." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(await readRequestBody(request, MAX_BODY_BYTES));
  } catch (error) {
    const status = error instanceof RequestBodyTooLargeError ? 413 : 400;
    return NextResponse.json({ error: "Invalid unsubscribe request." }, { status });
  }
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid unsubscribe request." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const [savedSearchResult, listingAlertResult] = await Promise.all([
    admin
      .from("saved_searches")
      .update({ active: false })
      .eq("unsubscribe_token", parsed.data.token)
      .eq("active", true)
      .select("id"),
    admin
      .from("saved_listing_alerts")
      .update({ active: false })
      .eq("unsubscribe_token", parsed.data.token)
      .eq("active", true)
      .select("id"),
  ]);
  if (savedSearchResult.error || listingAlertResult.error) {
    console.error("Alert unsubscribe could not be completed:", {
      savedSearchError: savedSearchResult.error,
      listingAlertError: listingAlertResult.error,
    });
    return NextResponse.json(
      { error: "Unable to update alert preferences." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { message: "You are unsubscribed from this alert." },
    { headers: { "Cache-Control": "no-store" } },
  );
}
