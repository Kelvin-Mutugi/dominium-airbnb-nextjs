// app/admin/listings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/lib/admin-auth";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

// add to app/admin/listings/actions.ts
export async function reinstateListing(listingId: string) {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("listings")
    .update({ status: "published" })
    .eq("id", listingId)
    .eq("status", "suspended");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/listings");
}

export async function rejectListing(listingId: string) {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("listings")
    .update({ status: "draft" })
    .eq("id", listingId)
    .eq("status", "pending_review");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/listings");
}

export async function archiveListing(listingId: string) {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("listings")
    .update({ status: "archived" })
    .eq("id", listingId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/listings");
}

export async function suspendListing(listingId: string) {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("listings")
    .update({ status: "suspended" })
    .eq("id", listingId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/listings");
}
// app/admin/listings/actions.ts — updated approve/reject
export async function approveListing(listingId: string) {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("listings")
    .update({ status: "published" })
    .eq("id", listingId)
    .eq("status", "pending_review");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/listings");
}

