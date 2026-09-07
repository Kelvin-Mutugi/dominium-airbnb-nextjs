// app/admin/bookings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/lib/admin-auth";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

// pending -> confirmed (admin manually confirms)
export async function confirmBooking(bookingId: string) {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/bookings");
}

// pending or confirmed -> cancelled (not allowed from completed)
export async function cancelBooking(bookingId: string) {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .in("status", ["pending", "confirmed"]);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/bookings");
}