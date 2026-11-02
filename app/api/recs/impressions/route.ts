import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { hasSameRequestOrigin } from "@/app/lib/http/request-origin";
import {
  readRequestBody,
  RequestBodyTooLargeError,
} from "@/app/lib/request-body";
import { consumeRecEventRateLimit } from "@/app/lib/recs/rate-limit";
import { recImpressionBatchSchema } from "@/app/lib/recs/impression-schema";
import { postgresUuidSchema } from "@/app/lib/recs/postgres-uuid-schema";

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

function response(
  request: NextRequest,
  result: NextResponse,
  anonId?: string,
  shouldSetCookie = false,
) {
  result.headers.set("Cache-Control", "private, no-store");
  if (anonId && shouldSetCookie && result.status < 400) {
    result.cookies.set(ANON_COOKIE, anonId, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return result;
}

function failureResponse(
  request: NextRequest,
  stage: string,
  code?: string,
  anonId?: string,
  shouldSetCookie = false,
) {
  return response(
    request,
    NextResponse.json(
      {
        error: "Unable to process recommendation impressions.",
        ...(process.env.NODE_ENV !== "production"
          ? {
              diagnostic: {
                stage,
                ...(code ? { code } : {}),
              },
            }
          : {}),
      },
      { status: 503 },
    ),
    anonId,
    shouldSetCookie,
  );
}

export async function POST(request: NextRequest) {
  if (!hasSameRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (isBot(request)) return new NextResponse(null, { status: 204 });
  if (request.cookies.get(COOKIE_CONSENT)?.value !== "v1.accepted") {
    return new NextResponse(null, { status: 204 });
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
      { error: status === 413 ? "Request is too large." : "Invalid impression batch." },
      { status },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid impression batch." }, { status: 400 });
  }
  const parsed = recImpressionBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid impression batch." }, { status: 400 });
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
    console.error("Recommendation impression rate-limit check failed:", error);
    return failureResponse(
      request,
      "rate_limit",
      undefined,
      anonId,
      shouldSetCookie,
    );
  }
  if (!withinRateLimit) {
    return response(
      request,
      NextResponse.json({ error: "Too many impression events." }, { status: 429 }),
      anonId,
      shouldSetCookie,
    );
  }

  const admin = getSupabaseAdmin();
  const listingIds = [...new Set(parsed.data.map((record) => record.listingId))];
  const { data: rawFeatures, error: featureError } = await admin
    .from("listing_features")
    .select("id")
    .in("id", listingIds)
    .eq("is_active", true);
  if (featureError) {
    console.error("Recommendation impression listing lookup failed:", featureError);
    return failureResponse(
      request,
      "feature_lookup",
      featureError.code,
      anonId,
      shouldSetCookie,
    );
  }
  const parsedFeatures = z
    .array(z.object({ id: postgresUuidSchema }))
    .safeParse(rawFeatures);
  if (!parsedFeatures.success) {
    console.error("Recommendation impression listing lookup returned an invalid shape.");
    return failureResponse(
      request,
      "feature_validation",
      undefined,
      anonId,
      shouldSetCookie,
    );
  }
  const activeListingIds = new Set(parsedFeatures.data.map((feature) => feature.id));
  if (listingIds.some((id) => !activeListingIds.has(id))) {
    return response(
      request,
      NextResponse.json(
        { error: "One or more stays are no longer available." },
        { status: 404 },
      ),
      anonId,
      shouldSetCookie,
    );
  }

  const { error: insertError } = await admin.from("rec_impressions").upsert(
    parsed.data.map((record) => ({
      id: record.id,
      anon_id: anonId,
      surface: record.surface,
      listing_id: record.listingId,
      position: record.position,
    })),
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (insertError) {
    console.error("Recommendation impressions could not be saved:", insertError);
    return failureResponse(
      request,
      "impression_insert",
      insertError.code,
      anonId,
      shouldSetCookie,
    );
  }

  const clickedIds = parsed.data
    .filter((record) => record.action === "click")
    .map((record) => record.id);
  if (clickedIds.length > 0) {
    const { error: clickError } = await admin.rpc(
      "mark_rec_impressions_clicked",
      {
        p_anon_id: anonId,
        p_impression_ids: clickedIds,
      },
    );
    if (clickError) {
      console.error("Recommendation clicks could not be saved:", clickError);
      return failureResponse(
        request,
        "click_update",
        clickError.code,
        anonId,
        shouldSetCookie,
      );
    }
  }

  return response(request, new NextResponse(null, { status: 204 }), anonId, shouldSetCookie);
}
