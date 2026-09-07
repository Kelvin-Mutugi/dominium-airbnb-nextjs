// app/admin/listings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/lib/admin-auth";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

//reinstatate listing
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

// approve listing
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

//reject listing
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

//archive listing
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

//suspend listing
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


