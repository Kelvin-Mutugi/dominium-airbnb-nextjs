"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/lib/admin-auth";
import { recordAdminAuditEvent } from "@/app/lib/admin-audit";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

const CHANGE_STATUSES = ["pending_review", "reviewed", "follow_up"] as const;

export async function reviewHostListingChangeRequest(formData: FormData) {
  const actor = await requireAdmin();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const adminNote = String(formData.get("admin_note") ?? "").trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    )
  ) {
    throw new Error("Invalid listing change request.");
  }
  if (!CHANGE_STATUSES.includes(status as (typeof CHANGE_STATUSES)[number])) {
    throw new Error("Choose a valid review status.");
  }
  if (adminNote.length > 3000) {
    throw new Error("Admin notes must be 3000 characters or fewer.");
  }

  const admin = getSupabaseAdmin();
  const { data: previous, error: lookupError } = await admin
    .from("host_listing_change_requests")
    .select("listing_id, host_id, status, admin_note")
    .eq("id", requestId)
    .maybeSingle();
  if (lookupError || !previous) {
    throw new Error("Listing change request not found.");
  }

  const { data: updated, error: updateError } = await admin
    .from("host_listing_change_requests")
    .update({
      status,
      admin_note: adminNote || null,
      reviewed_by: status === "pending_review" ? null : actor.id,
      reviewed_at: status === "pending_review" ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", previous.status)
    .select("id")
    .maybeSingle();
  if (updateError) throw new Error("Unable to save the listing change review.");
  if (!updated) throw new Error("This request changed. Refresh and try again.");

  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "host_listing_change.reviewed",
    entityType: "listing",
    entityId: previous.listing_id,
    summary: `Reviewed host listing change request (${status.replaceAll("_", " ")}).`,
    before: { status: previous.status, admin_note: previous.admin_note },
    after: { status, admin_note: adminNote || null, request_id: requestId },
  });

  revalidatePath("/admin/listing-changes");
  revalidatePath("/admin");
  revalidatePath(`/host/listings/${previous.listing_id}/edit`);
}
