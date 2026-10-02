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

// pending -> confirmed (admin manually confirms)
export async function confirmBooking(bookingId: string) {
  const actor = await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Booking is no longer pending. Refresh and try again.");
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "booking.confirmed",
    entityType: "booking",
    entityId: bookingId,
    summary: "Confirmed booking.",
    before: { status: "pending" },
    after: { status: "confirmed" },
  });
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

// pending or confirmed -> cancelled (not allowed from completed)
export async function cancelBooking(bookingId: string) {
  const actor = await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data: booking, error: lookupError } = await admin
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .maybeSingle();
  if (lookupError || !booking) throw new Error("Booking not found.");
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    throw new Error("Only pending or confirmed bookings can be cancelled.");
  }

  const { data, error } = await admin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("status", booking.status)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Booking status changed. Refresh and try again.");
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "booking.cancelled",
    entityType: "booking",
    entityId: bookingId,
    summary: "Cancelled booking.",
    before: { status: booking.status },
    after: { status: "cancelled" },
  });
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}