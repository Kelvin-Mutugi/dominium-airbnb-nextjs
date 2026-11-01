import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { consumeSaleRateLimit } from "@/app/lib/sale-rate-limit";
import { readRequestBody, RequestBodyTooLargeError } from "@/app/lib/request-body";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_TYPES = new Set([
  "view",
  "save",
  "gallery_open",
  "map_click",
  "calculator_use",
  "inquiry",
  "viewing_request",
]);

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 4096) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

  const cookieStore = await cookies();
  if (cookieStore.get("dominium_cookie_consent")?.value !== "v1.accepted") {
    return new NextResponse(null, { status: 204 });
  }

  let body: Record<string, unknown>;
  try {
    const text = await readRequestBody(request, 4096);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid event." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }

  const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
  const eventType = typeof body.eventType === "string" ? body.eventType : "";
  if (!UUID.test(propertyId) || !EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }

  try {
    if (!(await consumeSaleRateLimit(request, "property-event", 60, 600))) {
      return NextResponse.json({ error: "Too many events." }, { status: 429 });
    }
  } catch {
    return NextResponse.json({ error: "Unable to process this event." }, { status: 503 });
  }

  const admin = getSupabaseAdmin();
  const { data: property, error: propertyError } = await admin
    .from("sale_properties")
    .select("id")
    .eq("id", propertyId)
    .eq("status", "published")
    .maybeSingle();
  if (propertyError) {
    console.error("Property event listing lookup failed:", propertyError);
    return NextResponse.json({ error: "Unable to process this event." }, { status: 503 });
  }
  if (!property) return new NextResponse(null, { status: 204 });

  const currentSession = cookieStore.get("dominium_sale_session")?.value;
  const sessionId = currentSession && UUID.test(currentSession) ? currentSession : crypto.randomUUID();
  if (!currentSession || !UUID.test(currentSession)) {
    cookieStore.set("dominium_sale_session", sessionId, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }

  let userId: string | null = null;
  try {
    const session = await createClient();
    const { data, error } = await session.auth.getUser();
    if (error) console.warn("Unable to associate property event with signed-in user:", error.message);
    userId = data.user?.id ?? null;
  } catch (error) {
    console.warn("Unable to read optional property event user context:", error);
  }

  const { error } = await admin.from("property_events").insert({
    session_id: sessionId,
    user_id: userId,
    property_id: propertyId,
    event_type: eventType,
    metadata: {},
  });
  if (error) {
    console.error("Property event could not be saved:", error);
    return NextResponse.json({ error: "Unable to save this event." }, { status: 503 });
  }
  return new NextResponse(null, { status: 204 });
}
