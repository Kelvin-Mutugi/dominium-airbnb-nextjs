import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

const TOPICS = [
  "Booking help",
  "List my property",
  "Payment issue",
  "Feedback",
  "Something else",
] as const;

const COUNTIES = [
  "Nairobi",
  "Mombasa",
  "Kilifi",
  "Nakuru",
  "Kisumu",
  "Other",
] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const KE_PHONE = /^(?:\+?254|0)[17]\d{8}$/;
const MAX_MESSAGE = 800;

interface ContactSubmission {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  county?: unknown;
  topic?: unknown;
  message?: unknown;
  consent?: unknown;
  website?: unknown;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) {
    return NextResponse.json(
      { error: "Request is too large." },
      { status: 413 },
    );
  }

  let body: ContactSubmission;
  try {
    body = (await request.json()) as ContactSubmission;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ success: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const county = typeof body.county === "string" ? body.county : "";
  const topic = body.topic;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const normalizedPhone = phone.replace(/[\s-]/g, "");

  if (
    name.length < 2 ||
    name.length > 100 ||
    email.length > 254 ||
    !EMAIL.test(email) ||
    (phone.length > 0 &&
      (!KE_PHONE.test(normalizedPhone) || phone.length > 40)) ||
    (county !== "" &&
      !COUNTIES.includes(county as (typeof COUNTIES)[number])) ||
    typeof topic !== "string" ||
    !TOPICS.includes(topic as (typeof TOPICS)[number]) ||
    message.length < 10 ||
    message.length > MAX_MESSAGE ||
    body.consent !== true
  ) {
    return NextResponse.json(
      { error: "Please check the form and try again." },
      { status: 400 },
    );
  }

  const { error } = await getSupabaseAdmin()
    .from("contact_submissions")
    .insert({
      name,
      email,
      phone: phone || null,
      county: county || null,
      topic,
      message,
    });

  if (error) {
    console.error("Contact form submission failed:", error);
    return NextResponse.json(
      {
        error:
          "Your message could not be saved right now. Please try again shortly.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
