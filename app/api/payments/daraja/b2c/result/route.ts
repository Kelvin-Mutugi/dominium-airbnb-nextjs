import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

interface B2CResult {
  ConversationID?: string;
  OriginatorConversationID?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
  TransactionID?: string;
  ResultParameters?: {
    ResultParameter?: Array<{ Key?: string; Value?: unknown }>;
  };
}

function resultParameter(result: B2CResult, key: string): unknown {
  return result.ResultParameters?.ResultParameter?.find(
    (parameter) => parameter.Key === key,
  )?.Value;
}

function accepted() {
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: { Result?: B2CResult };
  try {
    payload = JSON.parse(rawBody) as { Result?: B2CResult };
  } catch {
    return accepted();
  }

  const result = payload.Result;
  if (!result?.ConversationID || !result.OriginatorConversationID) {
    return accepted();
  }

  const admin = getSupabaseAdmin();
  const { data: attempt, error: attemptError } = await admin
    .from("daraja_b2c_attempts")
    .select("id")
    .eq("conversation_id", result.ConversationID)
    .eq("originator_conversation_id", result.OriginatorConversationID)
    .maybeSingle();
  if (attemptError) {
    console.error("Daraja B2C result lookup failed:", attemptError);
    return NextResponse.json({ error: "Result processing failed." }, { status: 500 });
  }

  const fingerprint = createHash("sha256").update(rawBody).digest("hex");
  const { error: eventError } = await admin
    .from("daraja_b2c_callback_events")
    .insert({
      attempt_id: attempt?.id ?? null,
      conversation_id: result.ConversationID,
      originator_conversation_id: result.OriginatorConversationID,
      event_type: "result",
      fingerprint,
      processing_status: attempt ? "received" : "unmatched",
      payload,
    });
  if (eventError?.code === "23505") return accepted();
  if (eventError) {
    console.error("Daraja B2C result event could not be saved:", eventError);
    return NextResponse.json({ error: "Result processing failed." }, { status: 500 });
  }
  if (!attempt) return accepted();

  const transactionId =
    result.TransactionID ?? resultParameter(result, "TransactionID");
  const { error } = await admin.rpc("settle_daraja_b2c_result", {
    p_conversation_id: result.ConversationID,
    p_originator_conversation_id: result.OriginatorConversationID,
    p_result_code: String(result.ResultCode ?? ""),
    p_result_description: String(result.ResultDesc ?? ""),
    p_transaction_id: transactionId == null ? null : String(transactionId),
    p_raw_response: payload,
  });
  if (error) {
    console.error("Daraja B2C result settlement failed:", error);
    await admin
      .from("daraja_b2c_attempts")
      .update({
        status: "reconciliation_required",
        result_description: "B2C result could not be safely settled; reconcile with Safaricom.",
        result_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id)
      .in("status", ["submitted", "reconciliation_required"]);
    await admin
      .from("daraja_b2c_callback_events")
      .update({ processing_status: "reconciliation_required", processed_at: new Date().toISOString() })
      .eq("fingerprint", fingerprint);
    return NextResponse.json({ error: "Result processing failed." }, { status: 500 });
  }

  await admin
    .from("daraja_b2c_callback_events")
    .update({ processing_status: "processed", processed_at: new Date().toISOString() })
    .eq("fingerprint", fingerprint);
  return accepted();
}