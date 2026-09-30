// app/admin/bookings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/lib/admin-auth";
import { recordAdminAuditEvent } from "@/app/lib/admin-audit";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

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