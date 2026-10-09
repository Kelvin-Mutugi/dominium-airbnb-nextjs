import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

interface ReversalTimeout {
  ConversationID?: string;
  OriginatorConversationID?: string;
  ResultDesc?: string;
}

function accepted() {
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: { Result?: ReversalTimeout };
  try {
    payload = JSON.parse(rawBody) as { Result?: ReversalTimeout };
  } catch {
    return accepted();
  }
  const result = payload.Result;
  if (!result?.ConversationID || !result.OriginatorConversationID) return accepted();

  const admin = getSupabaseAdmin();
  const { data: reversal, error } = await admin
    .from("daraja_b2c_reversals")
    .select("id, payout_attempt_id")
    .eq("conversation_id", result.ConversationID)
    .eq("originator_conversation_id", result.OriginatorConversationID)
    .maybeSingle();
  if (error) {
    console.error("Daraja reversal timeout lookup failed:", error);
    return NextResponse.json({ error: "Reversal timeout processing failed." }, { status: 500 });
  }

  const fingerprint = createHash("sha256").update(rawBody).digest("hex");
  const { error: eventError } = await admin.from("daraja_b2c_callback_events").insert({
    attempt_id: reversal?.payout_attempt_id ?? null,
    conversation_id: result.ConversationID,
    originator_conversation_id: result.OriginatorConversationID,
    event_type: "timeout",
    fingerprint,
    processing_status: reversal ? "received" : "unmatched",
    payload,
  });
  if (eventError?.code === "23505") return accepted();
  if (eventError) {
    console.error("Daraja reversal timeout event could not be recorded:", eventError);
    return NextResponse.json({ error: "Reversal timeout processing failed." }, { status: 500 });
  }
  if (!reversal) return accepted();

  const { error: markError } = await admin.rpc("mark_daraja_b2c_reversal_reconciliation_required", {
    p_reversal_id: reversal.id,
    p_description: result.ResultDesc ?? "Safaricom reversal timed out; confirm its final state before retrying.",
    p_raw_response: payload,
  });
  if (markError) {
    console.error("Daraja reversal timeout reconciliation flag failed:", markError);
    return NextResponse.json({ error: "Reversal timeout processing failed." }, { status: 500 });
  }
  await admin.from("daraja_b2c_callback_events")
    .update({ processing_status: "reconciliation_required", processed_at: new Date().toISOString() })
    .eq("fingerprint", fingerprint);
  return accepted();
}