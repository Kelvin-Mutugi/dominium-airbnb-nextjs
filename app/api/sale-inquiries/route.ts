import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";
import { consumeSaleRateLimit } from "@/app/lib/sale-rate-limit";
import {
  validateSaleInquiryInput,
  type SaleInquiryInput,
} from "@/app/lib/sale-marketplace";
import { readRequestBody, RequestBodyTooLargeError } from "@/app/lib/request-body";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await readRequestBody(request, 16_384);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ success: true });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: "Please confirm consent to be contacted about this inquiry." }, { status: 400 });
  }

  try {
    if (!(await consumeSaleRateLimit(request, "sale-inquiry", 5, 600))) {
      return NextResponse.json({ error: "Too many inquiries. Please try again later." }, { status: 429 });
    }
  } catch {
    return NextResponse.json({ error: "Unable to send your inquiry right now." }, { status: 503 });
  }

  let inquiry: SaleInquiryInput;
  try {
    inquiry = validateSaleInquiryInput(body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Please check the form and try again." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data: property, error: propertyError } = await admin
    .from("sale_properties")
    .select("id")
    .eq("id", inquiry.propertyId)
    .eq("status", "published")
    .maybeSingle();
  if (propertyError) {
    console.error("Sale inquiry property lookup failed:", propertyError);
    return NextResponse.json({ error: "Unable to send your inquiry right now." }, { status: 503 });
  }
  if (!property) {
    return NextResponse.json({ error: "This property is no longer available." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const hasAnalyticsConsent =
    cookieStore.get("dominium_cookie_consent")?.value === "v1.accepted";
  const sessionValue = hasAnalyticsConsent
    ? cookieStore.get("dominium_sale_session")?.value
    : undefined;
  const sessionId = sessionValue && UUID.test(sessionValue) ? sessionValue : null;
  let userId: string | null = null;
  try {
    const session = await createClient();
    const { data, error } = await session.auth.getUser();
    if (error) console.warn("Unable to associate sale inquiry with signed-in user:", error.message);
    userId = data.user?.id ?? null;
  } catch (error) {
    console.warn("Unable to read optional sale inquiry user context:", error);
  }

  const { data: lead, error: leadError } = await admin
    .from("leads")
    .insert({
      property_id: inquiry.propertyId,
      name: inquiry.name,
      phone: inquiry.phone,
      email: inquiry.email,
      message: inquiry.message,
      interest_type: inquiry.interestType,
      buyer_funding: inquiry.buyerFunding,
      timeline: inquiry.timeline,
      preferred_contact: inquiry.preferredContact,
      source: inquiry.source,
      utm_source: inquiry.utmSource,
      utm_medium: inquiry.utmMedium,
      utm_campaign: inquiry.utmCampaign,
      session_id: sessionId,
      user_id: userId,
      status: "new",
    })
    .select("id")
    .single();
  if (leadError || !lead) {
    console.error("Sale lead submission failed:", leadError);
    return NextResponse.json({ error: "Your inquiry could not be saved. Please try again shortly." }, { status: 503 });
  }

  if (hasAnalyticsConsent && sessionId) {
    const { error: eventError } = await admin.from("property_events").insert({
      session_id: sessionId,
      user_id: userId,
      property_id: inquiry.propertyId,
      event_type: inquiry.interestType === "viewing" ? "viewing_request" : "inquiry",
    });
    if (eventError) console.error("Sale inquiry event tracking failed:", eventError);
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
