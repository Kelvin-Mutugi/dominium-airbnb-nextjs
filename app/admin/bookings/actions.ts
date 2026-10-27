// app/admin/bookings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/lib/admin-auth";
import { recordAdminAuditEvent } from "@/app/lib/admin-audit";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";

async function respondToCancellationRequest(requestId: string, responseText: string | null, approve: boolean) {
  const actor = await requireAdmin();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    throw new Error("Invalid cancellation request.");
  }
  const adminResponse = String(responseText ?? "").trim();
  if (adminResponse.length > 1000 || (!approve && !adminResponse)) {
    throw new Error("A decline reason of 1 to 1000 characters is required.");
  }

  const admin = getSupabaseAdmin();
  const { data: request, error: lookupError } = await admin
    .from("booking_change_requests")
    .select("booking_id, status, request_type")
    .eq("id", requestId)
    .maybeSingle();
  if (lookupError || !request || request.request_type !== "cancellation" || request.status !== "pending") {
    throw new Error("This cancellation request is no longer awaiting review.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_respond_to_booking_cancellation", {
    p_request_id: requestId,
    p_approve: approve,
    p_admin_response: adminResponse || null,
  });
  if (error) {
    if (error.message.includes("CANCELLATION_WINDOW_CLOSED")) {
      throw new Error("This cancellation request is no longer eligible because check-in has started.");
    }
    if (error.message.includes("REQUEST_ALREADY_HANDLED")) throw new Error("This request has already been handled.");
    if (error.message.includes("BOOKING_DATES_CHANGED")) throw new Error("The booking dates changed after this request was submitted.");
    throw new Error("Unable to update this cancellation request.");
  }

  await recordAdminAuditEvent({
    actorId: actor.id,
    action: approve ? "booking.cancellation.approved" : "booking.cancellation.declined",
    entityType: "booking",
    entityId: request.booking_id,
    summary: approve ? "Approved guest cancellation request." : "Declined guest cancellation request.",
    before: { booking_change_request_status: "pending" },
    after: { booking_change_request_status: approve ? "approved" : "declined", admin_response: adminResponse || null },
  });

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${request.booking_id}`);
  revalidatePath("/host/bookings");
  revalidatePath("/account/bookings");
}

export async function approveCancellationRequest(requestId: string) {
  await respondToCancellationRequest(requestId, null, true);
}

export async function declineCancellationRequest(requestId: string, reason: string) {
  await respondToCancellationRequest(requestId, reason, false);
}

// Platform cancellations route outstanding payments to full-refund review.
export async function cancelBooking(bookingId: string) {
  const actor = await requireAdmin();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookingId)) {
    throw new Error("Invalid booking.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "admin_cancel_booking_with_full_refund",
    { p_booking_id: bookingId },
  );
  if (error) {
    if (error.message.includes("BOOKING_NOT_FOUND")) throw new Error("Booking not found.");
    if (error.message.includes("BOOKING_NOT_CANCELLABLE")) {
      throw new Error("Only pending or confirmed bookings can be cancelled.");
    }
    if (error.message.includes("ADMIN_REQUIRED")) {
      throw new Error("You are not authorized to cancel this booking.");
    }
    console.error("Unable to cancel booking and route its refund:", error);
    throw new Error("Unable to cancel this booking. Try again.");
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.booking_id) {
    throw new Error("Booking was cancelled, but its refund status could not be confirmed.");
  }
  const amountPaid = Number(result.amount_paid ?? 0);
  const refundReviewAmount = Number(result.refund_review_amount ?? 0);
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "booking.cancelled",
    entityType: "booking",
    entityId: bookingId,
    summary: refundReviewAmount > 0
      ? `Cancelled a ${result.previous_status} booking and routed its remaining paid amount to full refund review.`
      : amountPaid > 0
        ? `Cancelled a ${result.previous_status} booking with no additional cancellation refund amount to route.`
        : "Cancelled an unpaid booking.",
    before: { status: result.previous_status },
    after: {
      status: "cancelled",
      amount_paid: amountPaid,
      refund_review_amount: refundReviewAmount,
      cancellation_refund_request_id: result.cancellation_refund_request_id ?? null,
    },
  });
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/refunds");
  revalidatePath("/host/bookings");
  revalidatePath("/account/refunds");
  revalidatePath("/account/bookings");
}