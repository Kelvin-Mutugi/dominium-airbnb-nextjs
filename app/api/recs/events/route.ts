import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { hasSameRequestOrigin } from "@/app/lib/http/request-origin";
import {
  readRequestBody,
  RequestBodyTooLargeError,
} from "@/app/lib/request-body";
import { consumeRecEventRateLimit } from "@/app/lib/recs/rate-limit";
import { recEventBatchSchema } from "@/app/lib/recs/event-schema";

const ANON_COOKIE = "dominium_anon_id";
const COOKIE_CONSENT = "dominium_cookie_consent";
const MAX_BODY_BYTES = 16 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOT_USER_AGENT =
  /(bot|crawler|spider|slurp|headless|preview|facebookexternalhit|whatsapp|telegrambot)/i;

function isBot(request: NextRequest) {
  return BOT_USER_AGENT.test(request.headers.get("user-agent") ?? "");
}

function withAnonymousCookie(
  response: NextResponse,
  anonId: string,
  shouldSetCookie: boolean,
  request: NextRequest,
) {
  if (shouldSetCookie) {
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

export async function POST(request: NextRequest) {
  if (!hasSameRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (isBot(request)) return new NextResponse(null, { status: 204 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await readRequestBody(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid event batch." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid event batch." }, { status: 400 });
  }
  const parsed = recEventBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event batch." }, { status: 400 });
  }

  if (request.cookies.get(COOKIE_CONSENT)?.value !== "v1.accepted") {
    return new NextResponse(null, { status: 204 });
  }

  const suppliedAnonId = request.cookies.get(ANON_COOKIE)?.value;
  const anonId =
    suppliedAnonId && UUID_PATTERN.test(suppliedAnonId)
      ? suppliedAnonId
      : crypto.randomUUID();
  const shouldSetCookie = anonId !== suppliedAnonId;

  let withinRateLimit: boolean;
  try {
    withinRateLimit = await consumeRecEventRateLimit(anonId);
  } catch (error) {
    console.error("Recommendation event rate-limit check failed:", error);
    return withAnonymousCookie(
      NextResponse.json(
        { error: "Unable to process this event batch." },
        { status: 503 },
      ),
      anonId,
      shouldSetCookie,
      request,
    );
  }
  if (!withinRateLimit) {
    return withAnonymousCookie(
      NextResponse.json({ error: "Too many events." }, { status: 429 }),
      anonId,
      shouldSetCookie,
      request,
    );
  }

  const admin = getSupabaseAdmin();
  const listingIds = [
    ...new Set(
      parsed.data.flatMap((event) =>
        event.listingId ? [event.listingId] : [],
      ),
    ),
  ];
  const publishedListingIds = new Set<string>();
  if (listingIds.length > 0) {
    const { data: listings, error: listingError } = await admin
      .from("listings")
      .select("id")
      .in("id", listingIds)
      .eq("status", "published");
    if (listingError) {
      console.error("Recommendation event listing lookup failed:", listingError);
      return withAnonymousCookie(
        NextResponse.json(
          { error: "Unable to process this event batch." },
          { status: 503 },
        ),
        anonId,
        shouldSetCookie,
        request,
      );
    }

    for (const listing of listings ?? []) {
      if (typeof listing.id === "string") publishedListingIds.add(listing.id);
    }
  }

  if (
    parsed.data.some(
      (event) =>
        event.listingId && !publishedListingIds.has(event.listingId),
    )
  ) {
    return withAnonymousCookie(
      NextResponse.json(
        { error: "One or more stays are no longer available." },
        { status: 404 },
      ),
      anonId,
      shouldSetCookie,
      request,
    );
  }

  const sessionClient = await createClient();
  const {
    data: { user },
    error: userError,
  } = await sessionClient.auth.getUser();
  if (userError) {
    console.error("Recommendation event user lookup failed:", userError.message);
    return withAnonymousCookie(
      NextResponse.json(
        { error: "Unable to process this event batch." },
        { status: 503 },
      ),
      anonId,
      shouldSetCookie,
      request,
    );
  }

  const { error: insertError } = await admin.from("rec_events").insert(
    parsed.data.map((event) => ({
      anon_id: anonId,
      user_id: user?.id ?? null,
      listing_id: event.listingId ?? null,
      event_type: event.eventType,
      metadata: event.metadata,
    })),
  );
  if (insertError) {
    console.error("Recommendation events could not be saved:", insertError);
    return withAnonymousCookie(
      NextResponse.json(
        { error: "Unable to save this event batch." },
        { status: 503 },
      ),
      anonId,
      shouldSetCookie,
      request,
    );
  }

  return withAnonymousCookie(
    new NextResponse(null, { status: 204 }),
    anonId,
    shouldSetCookie,
    request,
  );
}
