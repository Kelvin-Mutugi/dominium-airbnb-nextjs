"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/lib/admin-auth";
import { recordAdminAuditEvent } from "@/app/lib/admin-audit";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

const REQUEST_STATUSES = [
  "submitted",
  "reviewing",
  "visit_scheduled",
  "visited",
  "details_collected",
  "listing_created",
  "declined",
] as const;

export async function linkCreatedListingToHostRequest(requestId: string, listingId: string) {
  const actor = await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data: request, error: requestError } = await admin
    .from("host_listing_requests")
    .select("host_id, status, proposed_title, listing_id")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError || !request) throw new Error("Property request not found.");

  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("host_id")
    .eq("id", listingId)
    .maybeSingle();
  if (listingError || !listing || listing.host_id !== request.host_id) {
    throw new Error("The created listing must belong to the requesting host.");
  }

  const { data: updated, error: updateError } = await admin
    .from("host_listing_requests")
    .update({ listing_id: listingId, status: "listing_created", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("host_id", request.host_id)
    .select("id")
    .maybeSingle();
  if (updateError) throw new Error("Listing was created, but the request could not be linked.");
  if (!updated) throw new Error("Listing was created, but the request could not be linked. Refresh the request and try again.");

  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "host_listing_request.listing_created",
    entityType: "user",
    entityId: request.host_id,
    summary: `Created a listing for property request "${request.proposed_title}".`,
    before: { status: request.status, listing_id: request.listing_id },
    after: { status: "listing_created", listing_id: listingId },
  });

  revalidatePath("/admin/listing-requests");
  revalidatePath("/admin");
  revalidatePath("/host/listings");
}

export async function updateHostListingRequest(formData: FormData) {
  const actor = await requireAdmin();
  const requestId = String(formData.get("request_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();
  const hostMessage = String(formData.get("host_message") ?? "").trim();
  const visitValue = String(formData.get("proposed_visit_at") ?? "").trim();
  const listingIdValue = String(formData.get("listing_id") ?? "").trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    throw new Error("Invalid property request.");
  }
  if (!REQUEST_STATUSES.includes(status as typeof REQUEST_STATUSES[number])) {
    throw new Error("Choose a valid request status.");
  }
  if (adminNotes.length > 3000) throw new Error("Admin notes must be 3000 characters or fewer.");
  if (hostMessage.length > 1000) throw new Error("Host update must be 1000 characters or fewer.");
  if (visitValue && !Number.isFinite(Date.parse(visitValue))) throw new Error("Choose a valid visit date.");
  if (listingIdValue && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listingIdValue)) {
    throw new Error("Invalid linked listing.");
  }

  const admin = getSupabaseAdmin();
  const { data: previous, error: lookupError } = await admin
    .from("host_listing_requests")
    .select("host_id, status, proposed_title, listing_id")
    .eq("id", requestId)
    .maybeSingle();
  if (lookupError || !previous) throw new Error("Property request not found.");

  if (listingIdValue) {
    const { data: listing, error: listingError } = await admin
      .from("listings")
      .select("id, host_id")
      .eq("id", listingIdValue)
      .maybeSingle();
    if (listingError || !listing || listing.host_id !== previous.host_id) {
      throw new Error("The linked listing must belong to the requesting host.");
    }
  }

  const { data: updated, error: updateError } = await admin
    .from("host_listing_requests")
    .update({
      status,
      admin_notes: adminNotes || null,
      host_message: hostMessage || null,
      proposed_visit_at: visitValue ? new Date(visitValue).toISOString() : null,
      listing_id: listingIdValue || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", previous.status)
    .select("id")
    .maybeSingle();
  if (updateError) throw new Error("Unable to update property request.");
  if (!updated) throw new Error("This request changed. Refresh and try again.");

  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "host_listing_request.updated",
    entityType: "user",
    entityId: previous.host_id,
    summary: `Updated property request for "${previous.proposed_title}" to ${status.replaceAll("_", " ")}.`,
    before: { status: previous.status, listing_id: previous.listing_id },
    after: { status, listing_id: listingIdValue || null, proposed_visit_at: visitValue || null },
  });

  revalidatePath("/admin/listing-requests");
  revalidatePath("/admin");
  revalidatePath("/host/listings");
}