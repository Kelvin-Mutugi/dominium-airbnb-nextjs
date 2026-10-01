// app/admin/listings/actions.ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/app/lib/admin-auth";
import { recordAdminAuditEvent } from "@/app/lib/admin-audit";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import type { ListingFormValues } from "@/app/lib/host/types";

function listingPayload(values: Partial<ListingFormValues>) {
  return {
    title: String(values.title ?? "").trim(),
    description: String(values.description ?? "").trim(),
    county: String(values.county ?? "").trim(),
    town: String(values.town ?? "").trim(),
    address: String(values.address ?? "").trim() || null,
    property_type: String(values.property_type ?? "").trim(),
    price_per_night: Number(values.price_per_night),
    platform_fee_per_night: Number(values.platform_fee_per_night),
    service_fee_percent: 0,
    additional_charges: Array.isArray(values.additional_charges)
      ? values.additional_charges.map((charge) => ({
          name: String(charge.name ?? "").trim(),
          amount: Number(charge.amount),
          frequency: charge.frequency,
        }))
      : [],
    max_guests: Number(values.max_guests),
    bedrooms: Number(values.bedrooms),
    bathrooms: Number(values.bathrooms),
    amenities: Array.isArray(values.amenities) ? values.amenities : [],
    features: Array.isArray(values.features) ? values.features : [],
    house_rules: Array.isArray(values.house_rules) ? values.house_rules : [],
    check_in_time: String(values.check_in_time ?? "2:00 PM"),
    check_out_time: String(values.check_out_time ?? "11:00 AM"),
    min_nights: Number(values.min_nights),
    instant_book: Boolean(values.instant_book),
    cancellation_policy: String(values.cancellation_policy ?? "").trim(),
  };
}

function validateListing(values: ReturnType<typeof listingPayload>) {
  if (!values.title || !values.property_type || !values.county || !values.town) {
    throw new Error("Title, property type, county, and town are required.");
  }
  if (values.property_type.length > 80) throw new Error("Property type must be 80 characters or fewer.");
  if (!Number.isFinite(values.price_per_night) || values.price_per_night <= 0) {
    throw new Error("Price per night must be greater than zero.");
  }
  if (!Number.isFinite(values.platform_fee_per_night) || values.platform_fee_per_night < 0) {
    throw new Error("Platform fee per night must be zero or more.");
  }
  if (!Number.isInteger(values.max_guests) || values.max_guests < 1) {
    throw new Error("Maximum guests must be at least one.");
  }
  if (values.additional_charges.length > 20 || values.additional_charges.some((charge) =>
    !charge.name || charge.name.length > 80 || !Number.isFinite(charge.amount) || charge.amount <= 0 ||
    !["per_night", "per_booking"].includes(charge.frequency)
  )) {
    throw new Error("Additional charges must have a name up to 80 characters, a positive amount, and a valid frequency. Add no more than 20 charges.");
  }
}

export async function createAdminListing(hostId: string, values: ListingFormValues) {
  const actor = await requireAdmin();
  const normalizedHostId = hostId.trim();
  if (!normalizedHostId) throw new Error("A host must be selected before creating a listing.");

  const payload = listingPayload(values);
  validateListing(payload);

  const admin = getSupabaseAdmin();
  const slug = `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${crypto.randomUUID().slice(0, 6)}`;
  const { data, error } = await admin
    .from("listings")
    .insert({
      ...payload,
      slug,
      host_id: normalizedHostId,
      status: "pending_review",
      is_publish_ready: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message || "Unable to create listing.");
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "listing.created",
    entityType: "listing",
    entityId: data.id,
    summary: `Created listing "${payload.title}" for host ${normalizedHostId}.`,
    after: {
      title: payload.title,
      property_type: payload.property_type,
      price_per_night: payload.price_per_night,
      platform_fee_per_night: payload.platform_fee_per_night,
      additional_charges: payload.additional_charges,
      host_id: normalizedHostId,
      status: "pending_review",
    },
  });
  revalidatePath("/admin/listings");
  return data;
}

export async function updateAdminListing(listingId: string, values: ListingFormValues) {
  const actor = await requireAdmin();
  const payload = listingPayload(values);
  validateListing(payload);

  const admin = getSupabaseAdmin();
  const { data: existingListing, error: lookupError } = await admin
    .from("listings")
    .select("host_id, title, county, town, property_type, price_per_night, platform_fee_per_night, additional_charges, status")
    .eq("id", listingId)
    .maybeSingle();

  if (lookupError || !existingListing) throw new Error("Listing not found.");

  const { error: updateError } = await admin
    .from("listings")
    .update(payload)
    .eq("id", listingId);

  if (updateError) throw new Error(updateError.message || "Unable to update listing.");

  const { error: guideError } = await admin
    .from("listing_arrival_guides")
    .upsert(
      {
        listing_id: listingId,
        host_id: existingListing.host_id,
        arrival_address: String(values.arrival_address ?? "").trim() || payload.address,
        arrival_directions: String(values.arrival_directions ?? "").trim() || null,
        check_in_instructions: String(values.check_in_instructions ?? "").trim() || null,
        wifi_name: String(values.wifi_name ?? "").trim() || null,
        wifi_password: String(values.wifi_password ?? "").trim() || null,
        arrival_contact: String(values.arrival_contact ?? "").trim() || null,
        local_tips: String(values.local_tips ?? "").trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "listing_id" },
    );

  if (guideError) throw new Error(guideError.message || "Unable to update arrival guide.");

  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "listing.updated",
    entityType: "listing",
    entityId: listingId,
    summary: `Updated listing "${payload.title}".`,
    before: {
      title: existingListing.title,
      county: existingListing.county,
      town: existingListing.town,
      property_type: existingListing.property_type,
      price_per_night: existingListing.price_per_night,
      platform_fee_per_night: existingListing.platform_fee_per_night,
      additional_charges: existingListing.additional_charges,
      status: existingListing.status,
    },
    after: {
      title: payload.title,
      county: payload.county,
      town: payload.town,
      property_type: payload.property_type,
      price_per_night: payload.price_per_night,
      platform_fee_per_night: payload.platform_fee_per_night,
      additional_charges: payload.additional_charges,
      status: existingListing.status,
    },
  });

  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
  revalidatePath(`/admin/listings/${listingId}/edit`);
  revalidateTag("public-listings", "max");
}

const ADMIN_LISTING_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function createAdminListingImageUploadUrl(
  listingId: string,
  contentType: string,
  fileSize: number,
) {
  await requireAdmin();
  const extension = ADMIN_LISTING_IMAGE_TYPES[contentType];
  if (!extension || !Number.isFinite(fileSize) || fileSize <= 0 || fileSize > 10 * 1024 * 1024) {
    throw new Error("Choose a JPG, PNG, or WebP image up to 10 MB.");
  }

  const admin = getSupabaseAdmin();
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("host_id")
    .eq("id", listingId)
    .maybeSingle();
  if (listingError || !listing) throw new Error("Listing not found.");

  const path = `${listing.host_id}/${listingId}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await admin.storage
    .from("listing-images")
    .createSignedUploadUrl(path);
  if (error || !data) throw new Error("Unable to prepare image upload.");

  return { path, token: data.token };
}

export async function registerAdminListingImage(listingId: string, path: string) {
  const actor = await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("host_id")
    .eq("id", listingId)
    .maybeSingle();
  if (listingError || !listing) throw new Error("Listing not found.");

  const folder = `${listing.host_id}/${listingId}`;
  const fileName = path.startsWith(`${folder}/`) ? path.slice(folder.length + 1) : "";
  if (!/^[0-9a-f-]+\.(jpg|png|webp)$/i.test(fileName)) {
    throw new Error("Invalid image upload path.");
  }

  const { data: files, error: storageError } = await admin.storage
    .from("listing-images")
    .list(folder, { search: fileName, limit: 10 });
  if (storageError || !files?.some((file) => file.name === fileName)) {
    throw new Error("Uploaded image could not be found.");
  }

  const { data: latestImage, error: latestImageError } = await admin
    .from("listing_images")
    .select("sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestImageError) throw new Error("Unable to determine image order.");

  const { data: publicUrl } = admin.storage.from("listing-images").getPublicUrl(path);
  const { data: image, error: insertError } = await admin
    .from("listing_images")
    .insert({
      listing_id: listingId,
      url: publicUrl.publicUrl,
      sort_order: (latestImage?.sort_order ?? -1) + 1,
    })
    .select("id, url, sort_order")
    .single();

  if (insertError) {
    await admin.storage.from("listing-images").remove([path]);
    throw new Error(insertError.message || "Unable to save listing image.");
  }

  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "listing.image_added",
    entityType: "listing",
    entityId: listingId,
    summary: "Added an image to the listing.",
    after: { image_id: image.id, sort_order: image.sort_order },
  });

  revalidatePath(`/admin/listings/${listingId}`);
  revalidatePath(`/admin/listings/${listingId}/edit`);
  revalidatePath("/admin/listings");
  revalidateTag("public-listings", "max");
  return image;
}

export async function deleteAdminListingImage(imageId: string) {
  const actor = await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data: image, error: imageError } = await admin
    .from("listing_images")
    .select("id, listing_id, url")
    .eq("id", imageId)
    .maybeSingle();
  if (imageError || !image) throw new Error("Listing image not found.");

  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("host_id")
    .eq("id", image.listing_id)
    .maybeSingle();
  if (listingError || !listing) throw new Error("Listing not found.");

  const marker = "/storage/v1/object/public/listing-images/";
  const markerIndex = new URL(image.url).pathname.indexOf(marker);
  const objectPath = markerIndex >= 0
    ? decodeURIComponent(new URL(image.url).pathname.slice(markerIndex + marker.length))
    : "";
  const expectedFolder = `${listing.host_id}/${image.listing_id}/`;

  if (objectPath.startsWith(expectedFolder)) {
    const { error: removeError } = await admin.storage
      .from("listing-images")
      .remove([objectPath]);
    if (removeError) throw new Error("Unable to remove image from storage.");
  }

  const { error: deleteError } = await admin
    .from("listing_images")
    .delete()
    .eq("id", imageId);
  if (deleteError) throw new Error(deleteError.message || "Unable to remove listing image.");

  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "listing.image_removed",
    entityType: "listing",
    entityId: image.listing_id,
    summary: "Removed an image from the listing.",
    before: { image_id: image.id },
  });

  revalidatePath(`/admin/listings/${image.listing_id}`);
  revalidatePath(`/admin/listings/${image.listing_id}/edit`);
  revalidatePath("/admin/listings");
  revalidateTag("public-listings", "max");
}

async function updateListingStatus(
  listingId: string,
  allowedStatuses: string[],
  nextStatus: string | ((currentStatus: string) => string),
  action: string,
  summary: string,
  actorId: string,
) {
  const admin = getSupabaseAdmin();
  const { data: listing, error: lookupError } = await admin
    .from("listings")
    .select("status, title")
    .eq("id", listingId)
    .maybeSingle();

  if (lookupError || !listing) throw new Error("Listing not found.");
  if (!allowedStatuses.includes(listing.status)) {
    throw new Error(`Cannot ${action.replace("listing.", "").replaceAll("_", " ")} a listing with status ${listing.status}.`);
  }
  const resolvedNextStatus = typeof nextStatus === "function"
    ? nextStatus(listing.status)
    : nextStatus;

  const { data: updated, error } = await admin
    .from("listings")
    .update({ status: resolvedNextStatus })
    .eq("id", listingId)
    .eq("status", listing.status)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!updated) throw new Error("Listing status changed. Refresh and try again.");

  await recordAdminAuditEvent({
    actorId,
    action,
    entityType: "listing",
    entityId: listingId,
    summary: summary.replace("{title}", listing.title ?? listingId),
    before: { status: listing.status },
    after: { status: resolvedNextStatus },
  });

  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
  revalidateTag("public-listings", "max");
}

export async function reinstateListing(listingId: string) {
  const actor = await requireAdmin();
  await updateListingStatus(listingId, ["suspended"], "published", "listing.reinstated", "Reinstated listing {title}.", actor.id);
}

export async function restoreArchivedListing(listingId: string) {
  const actor = await requireAdmin();
  await updateListingStatus(listingId, ["archived"], "published", "listing.restored", "Restored archived listing {title}.", actor.id);
}

export async function toggleAdminListingPublication(listingId: string) {
  const actor = await requireAdmin();
  await updateListingStatus(
    listingId,
    ["published", "draft", "pending_review"],
    (status) => status === "published" ? "draft" : "published",
    "listing.publication_toggled",
    "Changed publication status for listing {title}.",
    actor.id,
  );
}

// approve listing
export async function approveListing(listingId: string) {
  const actor = await requireAdmin();
  await updateListingStatus(listingId, ["pending_review", "draft"], "published", "listing.published", "Published listing {title}.", actor.id);
}

//reject listing
export async function rejectListing(listingId: string) {
  const actor = await requireAdmin();
  await updateListingStatus(listingId, ["pending_review"], "draft", "listing.rejected", "Rejected listing {title}.", actor.id);
}

//archive listing
export async function archiveListing(listingId: string) {
  const actor = await requireAdmin();
  await updateListingStatus(listingId, ["published"], "archived", "listing.archived", "Archived listing {title}.", actor.id);
}

//suspend listing
export async function suspendListing(listingId: string) {
  const actor = await requireAdmin();
  await updateListingStatus(listingId, ["published"], "suspended", "listing.suspended", "Suspended listing {title}.", actor.id);
}


