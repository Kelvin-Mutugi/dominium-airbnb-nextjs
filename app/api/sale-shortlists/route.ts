import { NextResponse } from "next/server";
import { getPublicSalePropertiesByIds } from "@/app/lib/sale-properties";
import { consumeSaleRateLimit } from "@/app/lib/sale-rate-limit";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { hasSameRequestOrigin } from "@/app/lib/http/request-origin";
import { readRequestBody, RequestBodyTooLargeError } from "@/app/lib/request-body";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const MAX_PROPERTIES = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readJson(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4096) {
    return { error: NextResponse.json({ error: "Request is too large." }, { status: 413 }) };
  }
  try {
    const text = await readRequestBody(request, 4096);
    const parsed: unknown = JSON.parse(text);
    if (!isRecord(parsed)) {
      return { error: NextResponse.json({ error: "Invalid request body." }, { status: 400 }) };
    }
    return { body: parsed };
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return { error: NextResponse.json({ error: "Request is too large." }, { status: 413 }) };
    }
    return { error: NextResponse.json({ error: "Invalid request body." }, { status: 400 }) };
  }
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function checkRateLimit(request: Request, scope: string, limit: number) {
  try {
    if (await consumeSaleRateLimit(request, scope, limit, 600)) return null;
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  } catch (error) {
    console.error("Sale shortlist rate limit check failed:", error);
    return NextResponse.json({ error: "Unable to process this request right now." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const rateLimitError = await checkRateLimit(request, "sale-shortlist-properties", 120);
  if (rateLimitError) return rateLimitError;
  const rawIds = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = rawIds.split(",").filter(Boolean);
  if (!ids.length || ids.length > MAX_PROPERTIES || ids.some((id) => !UUID.test(id))) {
    return NextResponse.json({ error: "Invalid shortlist properties." }, { status: 400 });
  }

  try {
    const properties = await getPublicSalePropertiesByIds(ids);
    return NextResponse.json({ properties }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load shortlisted properties." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasSameRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const rateLimitError = await checkRateLimit(request, "sale-shortlist-sync", 20);
  if (rateLimitError) return rateLimitError;

  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const propertyIds = parsed.body.propertyIds;
  if (
    !Array.isArray(propertyIds)
    || propertyIds.length < 1
    || propertyIds.length > MAX_PROPERTIES
    || propertyIds.some((id) => typeof id !== "string" || !UUID.test(id))
    || new Set(propertyIds).size !== propertyIds.length
  ) {
    return NextResponse.json({ error: `Choose between 1 and ${MAX_PROPERTIES} different properties.` }, { status: 400 });
  }

  const providedOwnerToken = parsed.body.ownerToken;
  if (providedOwnerToken !== undefined && (typeof providedOwnerToken !== "string" || !TOKEN.test(providedOwnerToken))) {
    return NextResponse.json({ error: "This device’s shortlist access is invalid." }, { status: 400 });
  }

  const newOwnerToken = providedOwnerToken ? null : randomToken();
  const newShareToken = providedOwnerToken ? null : randomToken();
  const existingOwnerHash = providedOwnerToken ? await hashToken(providedOwnerToken) : null;
  const newOwnerHash = newOwnerToken ? await hashToken(newOwnerToken) : null;
  const { data: shareToken, error } = await getSupabaseAdmin().rpc("sync_sale_shortlist", {
    p_existing_owner_hash: existingOwnerHash,
    p_new_owner_hash: newOwnerHash,
    p_new_share_token: newShareToken,
    p_property_ids: propertyIds,
  });

  if (error || typeof shareToken !== "string" || !TOKEN.test(shareToken)) {
    if (error) console.error("Sale shortlist sync failed:", error);
    return NextResponse.json(
      { error: providedOwnerToken ? "This shared shortlist is no longer available. Create a new share link." : "Unable to create a share link. Please try again." },
      { status: providedOwnerToken && error?.message.includes("invalid or revoked") ? 410 : 503 },
    );
  }

  return NextResponse.json({
    sharePath: `/shortlist/${shareToken}`,
    ownerToken: newOwnerToken,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  if (!hasSameRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const rateLimitError = await checkRateLimit(request, "sale-shortlist-revoke", 20);
  if (rateLimitError) return rateLimitError;

  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const ownerToken = parsed.body.ownerToken;
  if (typeof ownerToken !== "string" || !TOKEN.test(ownerToken)) {
    return NextResponse.json({ error: "This device’s shortlist access is invalid." }, { status: 400 });
  }
  const { data, error } = await getSupabaseAdmin().rpc("revoke_sale_shortlist", {
    p_owner_hash: await hashToken(ownerToken),
  });
  if (error) {
    console.error("Sale shortlist revocation failed:", error);
    return NextResponse.json({ error: "Unable to revoke this share link. Please try again." }, { status: 503 });
  }
  if (data !== true) return NextResponse.json({ error: "This share link is already revoked or unavailable." }, { status: 404 });
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
