import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

interface B2CTimeout {
  ConversationID?: string;
  OriginatorConversationID?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
}

function accepted() {
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: { Result?: B2CTimeout };
  try {
    payload = JSON.parse(rawBody) as { Result?: B2CTimeout };
  } catch {
    return accepted();
  }

  const result = payload.Result;
  if (!result?.ConversationID || !result.OriginatorConversationID) {
    return accepted();
  }
  const admin = getSupabaseAdmin();
  const { data: attempt, error } = await admin
    .from("daraja_b2c_attempts")
    .select("id")
    .eq("conversation_id", result.ConversationID)
    .eq("originator_conversation_id", result.OriginatorConversationID)
    .maybeSingle();
  if (error) {
    console.error("Daraja B2C timeout lookup failed:", error);
    return NextResponse.json({ error: "Timeout processing failed." }, { status: 500 });
  }

  const fingerprint = createHash("sha256").update(rawBody).digest("hex");
  const { error: eventError } = await admin
    .from("daraja_b2c_callback_events")
    .insert({
      attempt_id: attempt?.id ?? null,
      conversation_id: result.ConversationID,
      originator_conversation_id: result.OriginatorConversationID,
      event_type: "timeout",
      fingerprint,
      processing_status: attempt ? "received" : "unmatched",
      payload,
    });
  if (eventError?.code === "23505") return accepted();
  if (eventError) {
    console.error("Daraja B2C timeout event could not be saved:", eventError);
    return NextResponse.json({ error: "Timeout processing failed." }, { status: 500 });
  }
  if (!attempt) return accepted();

  const { error: markError } = await admin.rpc("mark_daraja_b2c_reconciliation_required", {
    p_attempt_id: attempt.id,
    p_description: "Safaricom returned a B2C timeout; transfer status must be reconciled before retrying.",
    p_raw_response: payload,
  });
  if (markError) {
    console.error("Daraja B2C timeout reconciliation flag failed:", markError);
    return NextResponse.json({ error: "Timeout processing failed." }, { status: 500 });
  }
  await admin
    .from("daraja_b2c_callback_events")
    .update({ processing_status: "reconciliation_required", processed_at: new Date().toISOString() })
    .eq("fingerprint", fingerprint);
  return accepted();
}