"use server";

import { revalidatePath } from "next/cache";
import { requireHost } from "@/app/lib/host-auth";
import { createClient } from "@/app/lib/supabase/server";
import type {
  AvailabilityBlock,
  Booking,
  BookingStatus,
  HostDashboardStats,
  Listing,
  ListingFormValues,
  ListingImage,
  Payout,
} from "./types";

const MPESA_REGEX = /^0\d{9}$/;

function isAdult(dob: string) {
  const birth = new Date(dob);
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
  return birth <= eighteenYearsAgo;
}

export async function submitHostOnboarding(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to become a host.");

  // ---- pull + server-side validate every field (never trust the client) ----
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const alternatePhone = String(formData.get("alternatePhone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const hostType = String(formData.get("hostType") ?? "individual") as "individual" | "company";
  const businessName = String(formData.get("businessName") ?? "").trim();
  const idType = String(formData.get("idType") ?? "national_id") as "national_id" | "passport";
  const idNumber = String(formData.get("idNumber") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "");
  const county = String(formData.get("county") ?? "").trim();
  const residentialAddress = String(formData.get("residentialAddress") ?? "").trim();
  const payoutMethod = String(formData.get("payoutMethod") ?? "mpesa") as "mpesa" | "bank";
  const mpesaNumber = String(formData.get("mpesaNumber") ?? "").trim();
  const bankName = String(formData.get("bankName") ?? "").trim();
  const bankAccount = String(formData.get("bankAccount") ?? "").trim();
  const hostBio = String(formData.get("hostBio") ?? "").trim();
  const agreedToHostTerms = formData.get("agreedToHostTerms") === "true";
  const idDocument = formData.get("idDocument") as File | null;

  if (!fullName) throw new Error("Full legal name is required.");
  if (!MPESA_REGEX.test(phone)) throw new Error("Enter a valid phone number, e.g. 0712345678.");
  if (!email.includes("@")) throw new Error("Enter a valid email address.");
  if (!idNumber) throw new Error("National ID / passport number is required.");
  if (!dateOfBirth) throw new Error("Date of birth is required.");
  if (!isAdult(dateOfBirth)) throw new Error("You must be at least 18 years old to host.");
  if (!county) throw new Error("County of residence is required.");
  if (!residentialAddress) throw new Error("Residential address is required.");
  if (hostType === "company" && !businessName) throw new Error("Company name is required for company hosts.");
  if (!idDocument || idDocument.size === 0) throw new Error("Please upload a copy of your ID or passport.");
  if (payoutMethod === "mpesa" && !MPESA_REGEX.test(mpesaNumber)) {
    throw new Error("Enter a valid M-Pesa number, e.g. 0712345678.");
  }
  if (payoutMethod === "bank" && (!bankName || !bankAccount)) {
    throw new Error("Bank name and account number are both required.");
  }
  if (!agreedToHostTerms) throw new Error("You must accept the Host Listing Agreement and Terms of Service.");

  // ---- upload the ID document to a private bucket, folder-scoped per user ----
  const extension = idDocument.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/id-document-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("host-documents").upload(path, idDocument, {
    upsert: true,
  });
  if (uploadError) throw new Error(`Could not upload ID document: ${uploadError.message}`);

  // ---- upsert the profile row ----
  const { error: upsertError } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
    phone,
    alternate_phone: alternatePhone || null,
    email,
    role: "host",
    host_type: hostType,
    business_name: hostType === "company" ? businessName : null,
    id_number: idNumber,
    id_document_type: idType,
    id_document_url: path,
    date_of_birth: dateOfBirth,
    county,
    residential_address: residentialAddress,
    payout_method: payoutMethod,
    payout_details:
      payoutMethod === "mpesa" ? { mpesa_number: mpesaNumber } : { bank_name: bankName, account_number: bankAccount },
    host_bio: hostBio || null,
    kyc_status: "pending",
    kyc_submitted_at: new Date().toISOString(),
    kyc_reviewed_at: null,
    kyc_reviewed_by: null,
    kyc_rejection_reason: null,
    host_verified_at: null,
  });
  if (upsertError) throw new Error(`Could not save your host details: ${upsertError.message}`);
}

export async function getHostOnboardingStatus() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role, kyc_status, kyc_submitted_at, host_verified_at, kyc_rejection_reason, full_name, phone, alternate_phone, email, host_type, business_name, id_document_type, id_number, date_of_birth, county, residential_address, payout_method, payout_details, host_bio")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error("Unable to check host onboarding status.");
  return data;
}

function listingPayload(values: Partial<ListingFormValues>) {
  return {
    title: String(values.title ?? "").trim(),
    description: String(values.description ?? "").trim(),
    county: String(values.county ?? "").trim(),
    town: String(values.town ?? "").trim(),
    address: String(values.address ?? "").trim() || null,
    price_per_night: Number(values.price_per_night),
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
  if (!values.title || !values.county || !values.town) {
    throw new Error("Title, county, and town are required.");
  }
  if (!Number.isFinite(values.price_per_night) || values.price_per_night <= 0) {
    throw new Error("Price per night must be greater than zero.");
  }
  if (!Number.isInteger(values.max_guests) || values.max_guests < 1) {
    throw new Error("Maximum guests must be at least one.");
  }
}

export async function createHostListing(values: ListingFormValues) {
  const { user } = await requireHost();
  const payload = listingPayload(values);
  validateListing(payload);
  const supabase = await createClient();
  const slug = `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${crypto.randomUUID().slice(0, 6)}`;
  const { data, error } = await supabase.from("listings").insert({ ...payload, slug, host_id: user.id, status: "draft" }).select().single();
  if (error) throw new Error("Unable to create listing.");
  revalidatePath("/host");
  revalidatePath("/host/listings");
  return data as Listing;
}

export async function updateHostListing(id: string, values: Partial<ListingFormValues>) {
  const { user } = await requireHost();
  const payload = listingPayload(values);
  validateListing(payload);
  const supabase = await createClient();
  const { data, error } = await supabase.from("listings").update(payload).eq("id", id).eq("host_id", user.id).select().single();
  if (error) throw new Error("Unable to update listing.");
  revalidatePath(`/host/listings/${id}/edit`);
  revalidatePath("/host/listings");
  revalidatePath("/host");
  return data as Listing;
}

export async function setHostListingStatus(id: string, status: "draft" | "published") {
  const { user } = await requireHost();
  const supabase = await createClient();
  const patch = status === "published" ? { status, last_published_at: new Date().toISOString() } : { status };
  const { error } = await supabase.from("listings").update(patch).eq("id", id).eq("host_id", user.id);
  if (error) throw new Error("Unable to update listing status.");
  revalidatePath(`/host/listings/${id}/edit`);
  revalidatePath("/host/listings");
  revalidatePath("/host");
}

export async function deleteHostListing(id: string) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { error } = await supabase.from("listings").delete().eq("id", id).eq("host_id", user.id);
  if (error) throw new Error("Unable to delete listing.");
  revalidatePath("/host/listings");
  revalidatePath("/host");
}

export async function updateHostBookingStatus(id: string, status: BookingStatus) {
  const { user } = await requireHost();
  if (!["confirmed", "cancelled", "completed"].includes(status)) throw new Error("Invalid booking status.");
  const supabase = await createClient();
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id).eq("host_id", user.id);
  if (error) throw new Error("Unable to update booking status.");
  revalidatePath("/host/bookings");
  revalidatePath("/host");
}

export async function getHostDashboardData() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const [stats, listings, bookings] = await Promise.all([
    supabase.from("host_dashboard_stats").select("*").eq("host_id", user.id).maybeSingle(),
    supabase.from("listings").select("*, listing_images(id, url, sort_order)").eq("host_id", user.id).order("created_at", { ascending: false }),
    supabase.from("bookings").select("*, listing:listings(id, title, town, county)").eq("host_id", user.id).eq("status", "pending").order("check_in", { ascending: true }),
  ]);
  if (stats.error || listings.error || bookings.error) throw new Error("Unable to load host dashboard.");
  return { stats: stats.data as HostDashboardStats | null, listings: listings.data as unknown as Listing[], pending: bookings.data as unknown as Booking[] };
}

export async function getHostListingsData() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase.from("listings").select("*, listing_images(id, url, sort_order)").eq("host_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load listings.");
  return data as unknown as Listing[];
}

export async function getHostBookingsData() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase.from("bookings").select("*, listing:listings(id, title, town, county)").eq("host_id", user.id).order("check_in", { ascending: true });
  if (error) throw new Error("Unable to load bookings.");
  return data as unknown as Booking[];
}

export async function getHostPayoutsData() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase.from("payouts").select("*, booking:bookings(check_in, check_out)").eq("host_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load payouts.");
  return data as unknown as Payout[];
}

export async function getHostListingData(id: string) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase.from("listings").select("*, listing_images(id, url, sort_order)").eq("id", id).eq("host_id", user.id).single();
  if (error) throw new Error("Listing not found.");
  return data as unknown as Listing & { listing_images?: ListingImage[] };
}

export async function getHostAvailabilityData(listingId: string) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data: listing } = await supabase.from("listings").select("id").eq("id", listingId).eq("host_id", user.id).maybeSingle();
  if (!listing) throw new Error("Listing not found.");
  const { data, error } = await supabase.from("listing_availability_blocks").select("*").eq("listing_id", listingId).order("start_date");
  if (error) throw new Error("Unable to load availability.");
  return data as AvailabilityBlock[];
}

export async function addHostAvailabilityBlock(listingId: string, startDate: string, endDate: string, reason: string) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data: listing } = await supabase.from("listings").select("id").eq("id", listingId).eq("host_id", user.id).maybeSingle();
  if (!listing || startDate >= endDate) throw new Error("Invalid availability dates.");
  const { error } = await supabase.from("listing_availability_blocks").insert({ listing_id: listingId, start_date: startDate, end_date: endDate, reason: reason.trim() || null });
  if (error) throw new Error("Unable to block dates.");
  revalidatePath(`/host/listings/${listingId}/edit`);
}

export async function removeHostAvailabilityBlock(id: string) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data: block } = await supabase.from("listing_availability_blocks").select("listing_id").eq("id", id).maybeSingle();
  if (!block) throw new Error("Availability block not found.");
  const { data: listing } = await supabase.from("listings").select("id").eq("id", block.listing_id).eq("host_id", user.id).maybeSingle();
  if (!listing) throw new Error("You do not own this listing.");
  const { error } = await supabase.from("listing_availability_blocks").delete().eq("id", id);
  if (error) throw new Error("Unable to remove blocked dates.");
  revalidatePath(`/host/listings/${block.listing_id}/edit`);
}

export async function uploadHostListingImage(listingId: string, file: File, sortOrder: number) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data: listing } = await supabase.from("listings").select("id").eq("id", listingId).eq("host_id", user.id).maybeSingle();
  if (!listing || !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("Invalid image or listing.");
  const path = `${user.id}/${listingId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("listing-images").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error("Unable to upload image.");
  const { data: publicUrl } = supabase.storage.from("listing-images").getPublicUrl(path);
  const { data, error } = await supabase.from("listing_images").insert({ listing_id: listingId, url: publicUrl.publicUrl, sort_order: Math.max(0, Math.trunc(sortOrder)) }).select().single();
  if (error) throw new Error("Unable to save image.");
  revalidatePath(`/host/listings/${listingId}/edit`);
  return data as ListingImage;
}

export async function deleteHostListingImage(imageId: string) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data: image } = await supabase.from("listing_images").select("id, listing_id").eq("id", imageId).maybeSingle();
  if (!image) throw new Error("Image not found.");
  const { data: listing } = await supabase.from("listings").select("id").eq("id", image.listing_id).eq("host_id", user.id).maybeSingle();
  if (!listing) throw new Error("You do not own this listing.");
  const { error } = await supabase.from("listing_images").delete().eq("id", imageId);
  if (error) throw new Error("Unable to delete image.");
  revalidatePath(`/host/listings/${image.listing_id}/edit`);
}

export async function reorderHostListingImages(images: { id: string; sort_order: number }[]) {
  const { user } = await requireHost();
  const supabase = await createClient();
  for (const image of images) {
    const { data: row } = await supabase.from("listing_images").select("listing_id").eq("id", image.id).maybeSingle();
    if (!row) throw new Error("Image not found.");
    const { data: listing } = await supabase.from("listings").select("id").eq("id", row.listing_id).eq("host_id", user.id).maybeSingle();
    if (!listing) throw new Error("You do not own this listing.");
    const { error } = await supabase.from("listing_images").update({ sort_order: Math.max(0, Math.trunc(image.sort_order)) }).eq("id", image.id);
    if (error) throw new Error("Unable to reorder images.");
  }
  revalidatePath("/host/listings");
}
