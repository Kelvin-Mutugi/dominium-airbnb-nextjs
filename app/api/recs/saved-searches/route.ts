import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/app/lib/supabase/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { hasSameRequestOrigin } from "@/app/lib/http/request-origin";
import {
  readRequestBody,
  RequestBodyTooLargeError,
} from "@/app/lib/request-body";
import { savedSearchSchema } from "@/app/lib/recs/retention-schema";

const ANON_COOKIE = "dominium_anon_id";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 16 * 1024;

function normalizeContact(channel: "email" | "whatsapp", value: string) {
  if (channel === "email") return value.trim().toLocaleLowerCase();
  const compact = value.trim().replace(/[\s().-]/g, "");
  const national = compact.startsWith("+254")
    ? compact.slice(4)
    : compact.startsWith("254")
      ? compact.slice(3)
      : compact.startsWith("0")
        ? compact.slice(1)
        : compact;
  return `+254${national}`;
}

function withAnonCookie(
  response: NextResponse,
  request: NextRequest,
  anonId: string,
  shouldSetCookie: boolean,
) {
  response.headers.set("Cache-Control", "no-store");
  if (shouldSetCookie && response.status < 400) {
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

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await readRequestBody(request, MAX_BODY_BYTES);
  } catch (error) {
    const status = error instanceof RequestBodyTooLargeError ? 413 : 400;
    return NextResponse.json(
      { error: status === 413 ? "Request is too large." : "Invalid saved search." },
      { status },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid saved search." }, { status: 400 });
  }
  const parsed = savedSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the search and contact details." }, { status: 400 });
  }

  const suppliedAnonId = request.cookies.get(ANON_COOKIE)?.value;
  const anonId =
    suppliedAnonId && UUID_PATTERN.test(suppliedAnonId)
      ? suppliedAnonId
      : crypto.randomUUID();
  const shouldSetCookie = anonId !== suppliedAnonId;

  try {
    const sessionClient = await createClient();
    const {
      data: { user },
      error: userError,
    } = await sessionClient.auth.getUser();
    if (userError) {
      console.error("Saved-search user lookup failed:", userError.message);
      return withAnonCookie(
        NextResponse.json({ error: "Unable to save this search." }, { status: 503 }),
        request,
        anonId,
        shouldSetCookie,
      );
    }

    const { data, error } = await getSupabaseAdmin()
      .from("saved_searches")
      .insert({
        anon_id: anonId,
        user_id: user?.id ?? null,
        filters: parsed.data.filters,
        contact_channel: parsed.data.contact.contactChannel,
        contact_value: normalizeContact(
          parsed.data.contact.contactChannel,
          parsed.data.contact.contactValue,
        ),
        consented_at: new Date().toISOString(),
        unsubscribe_token: crypto.randomUUID(),
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("Saved search could not be stored:", error);
      return withAnonCookie(
        NextResponse.json({ error: "Unable to save this search." }, { status: 503 }),
        request,
        anonId,
        shouldSetCookie,
      );
    }

    const savedSearch = z.object({ id: z.uuid() }).safeParse(data);
    if (!savedSearch.success) {
      console.error("Saved search insert returned an invalid shape.");
      return withAnonCookie(
        NextResponse.json({ error: "Unable to save this search." }, { status: 503 }),
        request,
        anonId,
        shouldSetCookie,
      );
    }

    return withAnonCookie(
      NextResponse.json(
        { id: savedSearch.data.id, message: "Your search has been saved." },
        { status: 201 },
      ),
      request,
      anonId,
      shouldSetCookie,
    );
  } catch (error) {
    console.error("Saved search request failed:", error);
    return withAnonCookie(
      NextResponse.json({ error: "Unable to save this search." }, { status: 503 }),
      request,
      anonId,
      shouldSetCookie,
    );
  }
}
