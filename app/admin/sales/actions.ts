"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/lib/admin-auth";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import {
  ALLOWED_SALE_PROPERTY_IMAGE_TYPES,
  assertSalePropertyCanPublish,
  MAX_SALE_PROPERTY_IMAGE_BYTES,
  MAX_SALE_PROPERTY_IMAGES,
  normalizeKenyanPhone,
  parseOptionalNumber,
  parseRequiredNumber,
} from "@/app/lib/sale-marketplace";

const PROPERTY_TYPES = ["apartment", "unit", "house", "land", "commercial"] as const;
const PROPERTY_STATUSES = ["draft", "published", "sold", "withdrawn"] as const;
const LEAD_STATUSES = ["new", "contacted", "viewing", "offer", "closed", "lost"] as const;
const IMAGE_TYPES = new Set<string>(ALLOWED_SALE_PROPERTY_IMAGE_TYPES);
const MAX_IMAGE_BYTES = MAX_SALE_PROPERTY_IMAGE_BYTES;
const MAX_IMAGES = MAX_SALE_PROPERTY_IMAGES;
const ROOM_TAGS = ["living_room", "kitchen", "bedroom", "bathroom", "exterior", "floor_plan", "other"] as const;

export type SalePropertyInput = {
  title: string;
  description: string;
  property_type: string;
  asking_price: number | string;
  county: string;
  town: string;
  neighborhood: string;
  location_id?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  show_exact_location?: boolean;
  bedrooms: number | string;
  bathrooms: number | string;
  size_sqm: number | string | null;
  parking_spaces: number | string;
  amenities: string[];
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  status: string;
  title_type?: string | null;
  title_deed_status?: string | null;
  service_charge?: number | string | null;
  service_charge_period?: string | null;
  land_rates?: number | string | null;
  land_rates_period?: string | null;
  furnished_status?: string | null;
  occupancy?: string | null;
  completion_status?: string | null;
  year_built?: number | string | null;
  floor_level?: number | string | null;
  plot_size_acres?: number | string | null;
  zoning?: string | null;
  road_access?: string | null;
  price_negotiable?: boolean;
  reason_for_selling?: string | null;
  mandate_type?: string | null;
  mandate_expiry?: string | null;
  commission_terms?: string | null;
  open_to_short_stay_management?: boolean;
  sold_price?: number | string | null;
  owner_id_seen?: boolean;
  title_copy_seen?: boolean;
  site_visit_done?: boolean;
};

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function normalizedSaleProperty(input: SalePropertyInput) {
  const askingPrice = parseRequiredNumber(input.asking_price, "Asking price");
  const bedrooms = parseRequiredNumber(input.bedrooms, "Bedrooms");
  const bathrooms = parseRequiredNumber(input.bathrooms, "Bathrooms");
  const parkingSpaces = parseRequiredNumber(input.parking_spaces, "Parking spaces");
  const sizeSqm = parseOptionalNumber(input.size_sqm, "Floor area");
  const lat = parseOptionalNumber(input.lat, "Latitude");
  const lng = parseOptionalNumber(input.lng, "Longitude");
  const serviceCharge = parseOptionalNumber(input.service_charge, "Service charge");
  const landRates = parseOptionalNumber(input.land_rates, "Land rates");
  const yearBuilt = parseOptionalNumber(input.year_built, "Year built");
  const floorLevel = parseOptionalNumber(input.floor_level, "Floor level");
  const plotSizeAcres = parseOptionalNumber(input.plot_size_acres, "Plot size");
  const soldPrice = parseOptionalNumber(input.sold_price, "Sold price");
  const ownerPhone = normalizeKenyanPhone(input.owner_phone);
  const values = {
    title: cleanText(input.title, 140),
    description: cleanText(input.description, 5000),
    property_type: cleanText(input.property_type, 30),
    asking_price: askingPrice,
    county: cleanText(input.county, 80),
    town: cleanText(input.town, 100),
    neighborhood: cleanText(input.neighborhood, 120) || null,
    location_id: cleanText(input.location_id, 36) || null,
    lat,
    lng,
    show_exact_location: input.show_exact_location === true,
    bedrooms,
    bathrooms,
    size_sqm: sizeSqm,
    parking_spaces: parkingSpaces,
    amenities: Array.isArray(input.amenities)
      ? [...new Set(input.amenities.map((item) => cleanText(item, 60)).filter(Boolean))].slice(0, 30)
      : [],
    owner_name: cleanText(input.owner_name, 120),
    owner_email: cleanText(input.owner_email, 254).toLowerCase() || null,
    owner_phone: ownerPhone,
    status: cleanText(input.status, 20),
    title_type: cleanText(input.title_type, 20) || null,
    title_deed_status: cleanText(input.title_deed_status, 120) || null,
    service_charge: serviceCharge,
    service_charge_period: cleanText(input.service_charge_period, 20) || "monthly",
    land_rates: landRates,
    land_rates_period: cleanText(input.land_rates_period, 20) || "annual",
    furnished_status: cleanText(input.furnished_status, 20) || null,
    occupancy: cleanText(input.occupancy, 30) || null,
    completion_status: cleanText(input.completion_status, 30) || null,
    year_built: yearBuilt,
    floor_level: floorLevel,
    plot_size_acres: plotSizeAcres,
    zoning: cleanText(input.zoning, 120) || null,
    road_access: cleanText(input.road_access, 120) || null,
    price_negotiable: input.price_negotiable === true,
    reason_for_selling: cleanText(input.reason_for_selling, 1000) || null,
    mandate_type: cleanText(input.mandate_type, 20) || null,
    mandate_expiry: cleanText(input.mandate_expiry, 10) || null,
    commission_terms: cleanText(input.commission_terms, 1000) || null,
    open_to_short_stay_management: input.open_to_short_stay_management === true,
    sold_price: soldPrice,
    owner_id_seen: input.owner_id_seen === true,
    title_copy_seen: input.title_copy_seen === true,
    site_visit_done: input.site_visit_done === true,
  };

  if (
    values.title.length < 5 ||
    values.description.length < 30 ||
    !PROPERTY_TYPES.includes(values.property_type as (typeof PROPERTY_TYPES)[number]) ||
    !Number.isFinite(values.asking_price) ||
    values.asking_price <= 0 ||
    values.county.length < 2 ||
    values.town.length < 2 ||
    !Number.isInteger(values.bedrooms) ||
    values.bedrooms < 0 ||
    values.bedrooms > 50 ||
    !Number.isInteger(values.bathrooms) ||
    values.bathrooms < 0 ||
    values.bathrooms > 50 ||
    (values.size_sqm !== null &&
      (!Number.isFinite(values.size_sqm) || values.size_sqm <= 0 || values.size_sqm > 1000000)) ||
    !Number.isInteger(values.parking_spaces) ||
    values.parking_spaces < 0 ||
    values.parking_spaces > 50 ||
    values.owner_name.length < 2 ||
    (!values.owner_email && !values.owner_phone) ||
    (values.owner_email !== null &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.owner_email)) ||
    (values.lat === null) !== (values.lng === null) ||
    (values.lat !== null && (values.lat < -90 || values.lat > 90)) ||
    (values.lng !== null && (values.lng < -180 || values.lng > 180)) ||
    (values.service_charge !== null && values.service_charge < 0) ||
    (values.land_rates !== null && values.land_rates < 0) ||
    !["monthly", "annual"].includes(values.service_charge_period) ||
    !["monthly", "annual"].includes(values.land_rates_period) ||
    (values.year_built !== null && (!Number.isInteger(values.year_built) || values.year_built < 1800 || values.year_built > 2200)) ||
    (values.floor_level !== null && (!Number.isInteger(values.floor_level) || values.floor_level < -5 || values.floor_level > 200)) ||
    (values.plot_size_acres !== null && values.plot_size_acres <= 0) ||
    (values.sold_price !== null && values.sold_price <= 0) ||
    !["", "freehold", "leasehold", "other"].includes(values.title_type ?? "") ||
    !["", "unfurnished", "semi", "furnished"].includes(values.furnished_status ?? "") ||
    !["", "vacant", "tenanted", "owner_occupied"].includes(values.occupancy ?? "") ||
    !["", "ready", "off_plan", "under_construction"].includes(values.completion_status ?? "") ||
    !["", "exclusive", "open"].includes(values.mandate_type ?? "") ||
    (values.location_id !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(values.location_id)) ||
    !PROPERTY_STATUSES.includes(values.status as (typeof PROPERTY_STATUSES)[number])
  ) {
    throw new Error("Check the property, price, location, and owner contact details.");
  }
  return values;
}

async function resolveSaleLocation(locationId: string | null) {
  if (!locationId) return null;
  const admin = getSupabaseAdmin();
  const { data: neighborhood, error: neighborhoodError } = await admin
    .from("locations")
    .select("id, name, level, parent_id")
    .eq("id", locationId)
    .maybeSingle();
  if (neighborhoodError) throw new Error("Unable to validate the property location.");
  if (!neighborhood || neighborhood.level !== "neighborhood" || !neighborhood.parent_id) {
    throw new Error("Choose a valid neighborhood from the location list.");
  }
  const { data: town, error: townError } = await admin
    .from("locations")
    .select("id, name, level, parent_id")
    .eq("id", neighborhood.parent_id)
    .maybeSingle();
  if (townError) throw new Error("Unable to validate the property town.");
  if (!town || town.level !== "town" || !town.parent_id) {
    throw new Error("The selected neighborhood has an invalid town.");
  }
  const { data: county, error: countyError } = await admin
    .from("locations")
    .select("id, name, level")
    .eq("id", town.parent_id)
    .maybeSingle();
  if (countyError) throw new Error("Unable to validate the property county.");
  if (!county || county.level !== "county") {
    throw new Error("The selected town has an invalid county.");
  }
  return { county: county.name, town: town.name, neighborhood: neighborhood.name };
}

function slugPart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "property";
}

function assertUuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error("Invalid property identifier.");
  }
}

function invalidateSalePages(slug?: string) {
  updateTag("public-sale-properties");
  revalidatePath("/for-sale");
  if (slug) revalidatePath(`/for-sale/${slug}`);
  revalidatePath("/admin/sales");
  revalidatePath("/admin/sales/leads");
}

async function getPropertyPhotoCount(propertyId: string) {
  const { count, error } = await getSupabaseAdmin()
    .from("sale_property_images")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);
  if (error) throw new Error("Unable to verify property photos.");
  return count ?? 0;
}

function verificationAuditPatch(
  current: Record<string, unknown>,
  values: ReturnType<typeof normalizedSaleProperty>,
  actorId: string,
) {
  const now = new Date().toISOString();
  const patch: Record<string, string | null> = {};
  const checks = [
    ["owner_id_seen", "owner_id_verified_by", "owner_id_verified_at"],
    ["title_copy_seen", "title_copy_verified_by", "title_copy_verified_at"],
    ["site_visit_done", "site_visit_verified_by", "site_visit_verified_at"],
  ] as const;
  for (const [field, verifiedBy, verifiedAt] of checks) {
    if (current[field] === values[field]) continue;
    patch[verifiedBy] = values[field] ? actorId : null;
    patch[verifiedAt] = values[field] ? now : null;
  }
  return patch;
}

function verificationInsertAuditFields(
  values: ReturnType<typeof normalizedSaleProperty>,
  actorId: string,
) {
  const verifiedAt = new Date().toISOString();
  return {
    owner_id_verified_by: values.owner_id_seen ? actorId : null,
    owner_id_verified_at: values.owner_id_seen ? verifiedAt : null,
    title_copy_verified_by: values.title_copy_seen ? actorId : null,
    title_copy_verified_at: values.title_copy_seen ? verifiedAt : null,
    site_visit_verified_by: values.site_visit_done ? actorId : null,
    site_visit_verified_at: values.site_visit_done ? verifiedAt : null,
  };
}

export async function createSaleProperty(input: SalePropertyInput) {
  const actor = await requireAdmin();
  let values = normalizedSaleProperty({ ...input, status: "draft" });
  const location = await resolveSaleLocation(values.location_id);
  if (location) values = { ...values, ...location, status: "draft" };
  const id = crypto.randomUUID();
  const slug = `${slugPart(values.title)}-${id.slice(0, 8)}`;
  const { error } = await getSupabaseAdmin()
    .from("sale_properties")
    .insert({
      id,
      slug,
      ...values,
      ...verificationInsertAuditFields(values, actor.id),
      status: "draft",
      created_by: actor.id,
      updated_by: actor.id,
    });

  if (error) {
    console.error("Admin sale property creation failed:", error);
    throw new Error("Unable to create the property listing.");
  }
  revalidatePath("/admin/sales");
  return { id, slug };
}

export async function saveSaleProperty(id: string, input: SalePropertyInput) {
  const actor = await requireAdmin();
  assertUuid(id);
  let values = normalizedSaleProperty(input);
  const location = await resolveSaleLocation(values.location_id);
  if (location) {
    values = { ...values, ...location };
  }
  const photoCount = await getPropertyPhotoCount(id);
  assertSalePropertyCanPublish({
    status: values.status,
    photoCount,
    askingPrice: values.asking_price,
    locationId: values.location_id,
  });

  const { data: current, error: lookupError } = await getSupabaseAdmin()
    .from("sale_properties")
    .select("slug, status, owner_id_seen, owner_id_verified_by, owner_id_verified_at, title_copy_seen, title_copy_verified_by, title_copy_verified_at, site_visit_done, site_visit_verified_by, site_visit_verified_at")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) throw new Error("Unable to load the property listing.");
  if (!current) throw new Error("Property listing not found.");

  const { error } = await getSupabaseAdmin()
    .from("sale_properties")
    .update({
      ...values,
      ...verificationAuditPatch(current, values, actor.id),
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Admin sale property update failed:", error);
    throw new Error("Unable to save the property listing.");
  }
  invalidateSalePages(current.slug);
  return { slug: current.slug };
}

export async function createSalePropertyImageUpload(id: string, contentType: string, size: number) {
  await requireAdmin();
  assertUuid(id);
  if (!IMAGE_TYPES.has(contentType) || !Number.isInteger(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be JPG, PNG, or WebP and smaller than 10 MB.");
  }

  const { data: property, error: propertyError } = await getSupabaseAdmin()
    .from("sale_properties")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (propertyError) throw new Error("Unable to verify the property listing.");
  if (!property) throw new Error("Property listing not found.");

  const { count, error: countError } = await getSupabaseAdmin()
    .from("sale_property_images")
    .select("id", { count: "exact", head: true })
    .eq("property_id", id);
  if (countError) throw new Error("Unable to check the property photo limit.");
  if ((count ?? 0) >= MAX_IMAGES) throw new Error("A property can have no more than 15 photos.");

  const extension = contentType === "image/webp" ? "webp" : contentType === "image/png" ? "png" : "jpg";
  const path = `${id}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await getSupabaseAdmin()
    .storage.from("sale-property-images")
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data) {
    console.error("Sale property image upload URL creation failed:", error);
    throw new Error("Unable to prepare the photo upload.");
  }
  return { path, token: data.token };
}

export async function registerSalePropertyImage(
  id: string,
  path: string,
  width: number,
  height: number,
  altText: string,
) {
  await requireAdmin();
  assertUuid(id);
  if (
    !path.startsWith(`${id}/`) ||
    !/^[0-9a-f-]{36}\.(webp|jpg|png)$/i.test(path.slice(id.length + 1)) ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 2400 ||
    height > 2400
  ) {
    throw new Error("Invalid property photo.");
  }

  const admin = getSupabaseAdmin();
  const { count, error: countError } = await admin
    .from("sale_property_images")
    .select("id", { count: "exact", head: true })
    .eq("property_id", id);
  if (countError) throw new Error("Unable to check the property photo limit.");
  const position = count ?? 0;
  if (position >= MAX_IMAGES) throw new Error("A property can have no more than 15 photos.");

  const { error } = await admin.from("sale_property_images").insert({
    property_id: id,
    storage_path: path,
    position,
    sort_order: position,
    is_cover: position === 0,
    alt_text: cleanText(altText, 160) || "Other photo",
    width,
    height,
  });
  if (error) {
    console.error("Sale property image registration failed:", error);
    const { error: cleanupError } = await admin.storage
      .from("sale-property-images")
      .remove([path]);
    if (cleanupError) {
      console.error("Unregistered sale property photo cleanup failed:", cleanupError);
    }
    throw new Error("The photo uploaded but could not be added to the listing.");
  }
  revalidatePath("/admin/sales");
  return { url: admin.storage.from("sale-property-images").getPublicUrl(path).data.publicUrl };
}

export async function updateSalePropertyImageDetails(input: {
  imageId: string;
  roomTag: string;
  isCover: boolean;
  altText: string;
}) {
  await requireAdmin();
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.imageId !== "string" ||
    typeof input.roomTag !== "string" ||
    typeof input.isCover !== "boolean" ||
    typeof input.altText !== "string"
  ) {
    throw new Error("Invalid image details.");
  }
  assertUuid(input.imageId);
  if (!ROOM_TAGS.includes(input.roomTag as (typeof ROOM_TAGS)[number])) {
    throw new Error("Choose a valid photo room tag.");
  }
  const admin = getSupabaseAdmin();
  const { data: image, error: imageError } = await admin
    .from("sale_property_images")
    .select("id, property_id")
    .eq("id", input.imageId)
    .maybeSingle();
  if (imageError) throw new Error("Unable to load the property photo.");
  if (!image) throw new Error("Property photo not found.");

  if (input.isCover) {
    const { error: clearError } = await admin
      .from("sale_property_images")
      .update({ is_cover: false })
      .eq("property_id", image.property_id);
    if (clearError) throw new Error("Unable to update the cover photo.");
  }
  const { error } = await admin
    .from("sale_property_images")
    .update({
      room_tag: input.roomTag,
      is_cover: input.isCover,
      alt_text: cleanText(input.altText, 160),
    })
    .eq("id", input.imageId);
  if (error) {
    console.error("Sale property image metadata update failed:", error);
    throw new Error("Unable to update photo details.");
  }
  revalidatePath(`/admin/sales/${image.property_id}/edit`);
  invalidateSalePages();
}

export async function reorderSalePropertyImages(propertyId: string, imageIds: string[]) {
  await requireAdmin();
  assertUuid(propertyId);
  if (!Array.isArray(imageIds) || imageIds.length > MAX_IMAGES || imageIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
    throw new Error("Invalid property photo order.");
  }
  const { error } = await getSupabaseAdmin().rpc("reorder_sale_property_images", {
    p_property_id: propertyId,
    p_image_ids: imageIds,
  });
  if (error) {
    console.error("Sale property photo reorder failed:", error);
    throw new Error("Unable to save the photo order.");
  }
  revalidatePath(`/admin/sales/${propertyId}/edit`);
  invalidateSalePages();
}

export async function deleteSalePropertyImage(imageId: string) {
  await requireAdmin();
  assertUuid(imageId);

  const admin = getSupabaseAdmin();
  const { data: image, error: imageError } = await admin
    .from("sale_property_images")
    .select("id, property_id, storage_path, sort_order")
    .eq("id", imageId)
    .maybeSingle();
  if (imageError) throw new Error("Unable to load the property photo.");
  if (!image) throw new Error("Property photo not found.");

  const { error: storageError } = await admin.storage
    .from("sale-property-images")
    .remove([image.storage_path]);
  if (storageError) {
    console.error("Sale property photo deletion failed:", storageError);
    throw new Error("Unable to delete the photo from storage.");
  }
  const { error } = await admin
    .from("sale_property_images")
    .delete()
    .eq("id", imageId);
  if (error) {
    console.error("Sale property photo record deletion failed:", error);
    throw new Error("The photo file was removed but its listing record could not be updated.");
  }

  const { data: remaining, error: remainingError } = await admin
    .from("sale_property_images")
    .select("id")
    .eq("property_id", image.property_id)
    .order("sort_order", { ascending: true });
  if (remainingError) throw new Error("Photo deleted, but the gallery order could not be refreshed.");

  const remainingImages = remaining ?? [];
  const { error: orderError } = await admin.rpc("reorder_sale_property_images", {
    p_property_id: image.property_id,
    p_image_ids: remainingImages.map((row) => row.id),
  });
  if (orderError) {
    console.error("Sale property gallery reorder failed:", orderError);
    throw new Error("Photo deleted, but the gallery order could not be refreshed.");
  }
  if (remainingImages.length > 0) {
    const { error: coverError } = await admin
      .from("sale_property_images")
      .update({ is_cover: false })
      .eq("property_id", image.property_id);
    if (coverError) throw new Error("Photo deleted, but the cover photo could not be refreshed.");
    const { error: firstCoverError } = await admin
      .from("sale_property_images")
      .update({ is_cover: true })
      .eq("id", remainingImages[0].id);
    if (firstCoverError) throw new Error("Photo deleted, but the cover photo could not be refreshed.");
  }
  revalidatePath("/admin/sales");
  revalidatePath(`/admin/sales/${image.property_id}/edit`);
  invalidateSalePages();
}

export async function updateSaleLead(formData: FormData) {
  const actor = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const assignedToValue = String(formData.get("assigned_to") ?? "");
  const assignedTo = assignedToValue || null;
  assertUuid(id);
  if (!LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
    throw new Error("Choose a valid lead status.");
  }
  if (assignedTo) {
    assertUuid(assignedTo);
    const { data: assignee, error: assigneeError } = await getSupabaseAdmin()
      .from("admin_roles")
      .select("user_id")
      .eq("user_id", assignedTo)
      .maybeSingle();
    if (assigneeError) throw new Error("Unable to validate the assigned agent.");
    if (!assignee) throw new Error("Choose an authorized sales agent.");
  }

  const { data, error } = await getSupabaseAdmin()
    .from("leads")
    .update({
      status,
      assigned_to: assignedTo,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Sale lead update failed:", error);
    throw new Error("Unable to update the buyer lead.");
  }
  if (!data) throw new Error("Buyer lead not found.");
  revalidatePath("/admin/sales/leads");
}

export async function createSaleNeighborhood(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const townId = String(formData.get("town_id") ?? "");
  if (name.length < 2 || name.length > 120) {
    throw new Error("Neighborhood name must be between 2 and 120 characters.");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(townId)) {
    throw new Error("Choose a valid town.");
  }

  const admin = getSupabaseAdmin();
  const { data: town, error: townError } = await admin
    .from("locations")
    .select("id, level")
    .eq("id", townId)
    .maybeSingle();
  if (townError) throw new Error("Unable to validate the selected town.");
  if (!town || town.level !== "town") throw new Error("Choose a valid town.");

  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  const normalizedSlug = slug.replace(/-+$/g, "");
  if (!normalizedSlug) throw new Error("Enter a neighborhood name containing letters or numbers.");

  const { error } = await admin.from("locations").insert({
    name,
    slug: normalizedSlug,
    level: "neighborhood",
    parent_id: townId,
  });
  if (error?.code === "23505") {
    throw new Error("A neighborhood with this name already exists in the selected town.");
  }
  if (error) {
    console.error("Sale neighborhood creation failed:", error);
    throw new Error("Unable to add this neighborhood.");
  }

  revalidatePath("/admin/sales/locations");
  revalidatePath("/admin/sales/new");
  revalidatePath("/admin/sales");
  redirect("/admin/sales/locations?created=1");
}
