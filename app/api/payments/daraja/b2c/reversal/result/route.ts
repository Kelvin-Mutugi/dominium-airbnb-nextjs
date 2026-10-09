import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

interface ReversalResult {
  ConversationID?: string;
  OriginatorConversationID?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
  ResultParameters?: {
    ResultParameter?: Array<{ Key?: string; Value?: unknown }>;
  };
}

function accepted() {
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: { Result?: ReversalResult };
  try {
    payload = JSON.parse(rawBody) as { Result?: ReversalResult };
  } catch {
    return accepted();
  }
  const result = payload.Result;
  if (!result?.ConversationID || !result.OriginatorConversationID) return accepted();

  const admin = getSupabaseAdmin();
  const { data: reversal, error: reversalError } = await admin
    .from("daraja_b2c_reversals")
    .select("id, payout_attempt_id")
    .eq("conversation_id", result.ConversationID)
    .eq("originator_conversation_id", result.OriginatorConversationID)
    .maybeSingle();
  if (reversalError) {
    console.error("Daraja reversal result lookup failed:", reversalError);
    return NextResponse.json({ error: "Reversal result processing failed." }, { status: 500 });
  }

  const fingerprint = createHash("sha256").update(rawBody).digest("hex");
  const { error: eventError } = await admin.from("daraja_b2c_callback_events").insert({
    attempt_id: reversal?.payout_attempt_id ?? null,
    conversation_id: result.ConversationID,
    originator_conversation_id: result.OriginatorConversationID,
    event_type: "result",
    fingerprint,
    processing_status: reversal ? "received" : "unmatched",
    payload,
  });
  if (eventError?.code === "23505") return accepted();
  if (eventError) {
    console.error("Daraja reversal result event could not be recorded:", eventError);
    return NextResponse.json({ error: "Reversal result processing failed." }, { status: 500 });
  }
  if (!reversal) return accepted();

  const { error } = await admin.rpc("settle_daraja_b2c_reversal_result", {
    p_conversation_id: result.ConversationID,
    p_originator_conversation_id: result.OriginatorConversationID,
    p_result_code: String(result.ResultCode ?? ""),
    p_result_description: String(result.ResultDesc ?? ""),
    p_raw_response: payload,
  });
  if (error) {
    console.error("Daraja reversal result settlement failed:", error);
    await admin.rpc("mark_daraja_b2c_reversal_reconciliation_required", {
      p_reversal_id: reversal.id,
      p_description: "Safaricom returned a reversal result that could not be safely settled; reconcile before any ledger change.",
      p_raw_response: payload,
    });
    await admin.from("daraja_b2c_callback_events")
      .update({ processing_status: "reconciliation_required", processed_at: new Date().toISOString() })
      .eq("fingerprint", fingerprint);
    return NextResponse.json({ error: "Reversal result processing failed." }, { status: 500 });
  }
  await admin.from("daraja_b2c_callback_events")
    .update({ processing_status: "processed", processed_at: new Date().toISOString() })
    .eq("fingerprint", fingerprint);
  return accepted();
}