"use server";

import { revalidatePath, updateTag } from "next/cache";
import { randomBytes } from "node:crypto";
import { requireHost } from "@/app/lib/host-auth";
import { activeBookingFilter } from "@/app/lib/booking/availability";
import {
  hashCalendarToken,
  syncCalendarConnection,
  syncStaleCalendarConnectionsForListing,
  validateExternalCalendarUrl,
} from "@/app/lib/host/calendar-sync";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";
import { todayISO } from "@/app/lib/format";
import { normalizeDarajaPhone } from "@/app/lib/payments/daraja";
import type {
  AvailabilityBlock,
  Booking,
  BookingStatus,
  HostDashboardStats,
  HostArrivalGuideDetails,
  HostBookingChangeRequest,
  HostOptionalFee,
  HostDateChangeRecord,
  HostListingRequest,
  Listing,
  ListingFormValues,
  ListingImage,
  Payout,
} from "./types";
import type { ListingImageMetadata } from "@/components/admin/listings/image-categories";
import type { RefundListItem, RefundProgress } from "@/types/refunds";

const MPESA_REGEX = /^0\d{9}$/;
const HOST_BOOKING_FIELDS =
  "id, booking_reference, listing_id, host_id, check_in, check_out, nights, adults_count, children_count, pets_count, rooms_count, status, completed_at, completion_source, host_payout_amount, guest_name, guest_country, special_requests, hold_expires_at";
const HOST_BOOKING_WITH_LISTING = `${HOST_BOOKING_FIELDS}, listing:listings(id, title, town, county, check_out_time)`;

function getSelectedOptionalFees(snapshot: unknown): HostOptionalFee[] | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot))
    return null;
  const lineItems = (snapshot as { line_items?: unknown }).line_items;
  if (!Array.isArray(lineItems)) return null;

  return lineItems.flatMap((item): HostOptionalFee[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const line = item as Record<string, unknown>;
    if (
      line.type !== "host_charge" ||
      line.required !== false ||
      typeof line.name !== "string" ||
      typeof line.total !== "number" ||
      typeof line.unit_amount !== "number" ||
      (line.frequency !== "per_night" && line.frequency !== "per_booking")
    ) {
      return [];
    }
    return [{
      name: line.name,
      amount: line.total,
      unitAmount: line.unit_amount,
      frequency: line.frequency,
    }];
  });
}

type HostUnreadThread = {
  booking_id: string;
  requester_last_read_at: string;
  messages: { created_at: string; sender_role: string }[];
};

async function getHostUnreadSupportCounts(
  userId: string,
  bookingIds?: string[],
) {
  if (bookingIds && bookingIds.length === 0)
    return {} as Record<string, number>;

  const admin = getSupabaseAdmin();
  const select =
    "booking_id, requester_last_read_at, messages:customer_support_messages!inner(created_at, sender_role)";
  const result = bookingIds
    ? await admin
        .from("customer_support_threads")
        .select(select)
        .eq("requester_id", userId)
        .eq("status", "waiting_on_requester")
        .eq("messages.sender_role", "admin")
        .in("booking_id", bookingIds)
    : await admin
        .from("customer_support_threads")
        .select(select)
        .eq("requester_id", userId)
        .eq("status", "waiting_on_requester")
        .eq("messages.sender_role", "admin");

  if (result.error) throw new Error("Unable to load customer support replies.");

  const counts: Record<string, number> = {};
  for (const thread of (result.data ?? []) as unknown as HostUnreadThread[]) {
    for (const message of thread.messages) {
      if (
        Date.parse(message.created_at) >
        Date.parse(thread.requester_last_read_at)
      ) {
        counts[thread.booking_id] = (counts[thread.booking_id] ?? 0) + 1;
      }
    }
  }
  return counts;
}

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

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("kyc_status, kyc_submitted_at, host_verified_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error("Unable to check your host application status.");
  if (existingProfile?.host_verified_at || existingProfile?.kyc_status === "approved") {
    throw new Error("Your host account is already verified.");
  }
  if (
    existingProfile?.kyc_status === "pending" ||
    (existingProfile?.kyc_submitted_at &&
      existingProfile.kyc_status !== "rejected")
  ) {
    throw new Error("Your host application is already under review.");
  }

  // ---- pull + server-side validate every field (never trust the client) ----
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const alternatePhone = String(formData.get("alternatePhone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const hostType = String(formData.get("hostType") ?? "individual") as
    | "individual"
    | "company";
  const businessName = String(formData.get("businessName") ?? "").trim();
  const idType = String(formData.get("idType") ?? "national_id") as
    | "national_id"
    | "passport";
  const idNumber = String(formData.get("idNumber") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "");
  const county = String(formData.get("county") ?? "").trim();
  const residentialAddress = String(
    formData.get("residentialAddress") ?? "",
  ).trim();
  const payoutMethod = String(formData.get("payoutMethod") ?? "mpesa");
  const mpesaNumber = String(formData.get("mpesaNumber") ?? "").trim();
  const hostBio = String(formData.get("hostBio") ?? "").trim();
  const agreedToHostTerms = formData.get("agreedToHostTerms") === "true";
  const idDocumentFront = formData.get("idDocumentFront");
  const idDocumentBack = formData.get("idDocumentBack");
  const frontDocument = idDocumentFront instanceof File ? idDocumentFront : null;
  const backDocument = idDocumentBack instanceof File ? idDocumentBack : null;

  if (!fullName) throw new Error("Full legal name is required.");
  if (!MPESA_REGEX.test(phone))
    throw new Error("Enter a valid phone number, e.g. 0712345678.");
  if (!email.includes("@")) throw new Error("Enter a valid email address.");
  if (idType !== "national_id" && idType !== "passport")
    throw new Error("Choose a valid ID document type.");
  if (!idNumber) throw new Error("National ID / passport number is required.");
  if (!dateOfBirth) throw new Error("Date of birth is required.");
  if (!isAdult(dateOfBirth))
    throw new Error("You must be at least 18 years old to host.");
  if (!county) throw new Error("County of residence is required.");
  if (!residentialAddress) throw new Error("Residential address is required.");
  if (hostType === "company" && !businessName)
    throw new Error("Company name is required for company hosts.");
  if (!frontDocument || frontDocument.size === 0)
    throw new Error("Please upload the front of your ID or your passport.");
  if (idType === "national_id" && (!backDocument || backDocument.size === 0))
    throw new Error("Please upload the back of your national ID.");
  if (payoutMethod !== "mpesa") {
    throw new Error("Host payouts are currently sent to M-Pesa numbers.");
  }
  if (!MPESA_REGEX.test(mpesaNumber)) {
    throw new Error("Enter a valid M-Pesa number, e.g. 0712345678.");
  }
  if (!agreedToHostTerms)
    throw new Error(
      "You must accept the Host Listing Agreement and Terms of Service.",
    );

  // ---- upload identity documents to a private, user-scoped folder ----
  const submittedAt = Date.now();
  const frontExtension = frontDocument.name.split(".").pop() ?? "jpg";
  const frontPath = `${user.id}/id-document-front-${submittedAt}.${frontExtension}`;
  const { error: uploadError } = await supabase.storage
    .from("host-documents")
    .upload(frontPath, frontDocument, {
      upsert: true,
    });
  if (uploadError)
    throw new Error(`Could not upload the front of your ID: ${uploadError.message}`);

  let backPath: string | null = null;
  if (idType === "national_id" && backDocument) {
    const backExtension = backDocument.name.split(".").pop() ?? "jpg";
    backPath = `${user.id}/id-document-back-${submittedAt}.${backExtension}`;
    const { error: backUploadError } = await supabase.storage
      .from("host-documents")
      .upload(backPath, backDocument, { upsert: true });
    if (backUploadError)
      throw new Error(`Could not upload the back of your ID: ${backUploadError.message}`);
  }

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
    id_document_url: frontPath,
    id_document_back_url: backPath,
    date_of_birth: dateOfBirth,
    county,
    residential_address: residentialAddress,
    payout_method: payoutMethod,
    payout_details: { mpesa_number: mpesaNumber },
    host_bio: hostBio || null,
    kyc_status: "pending",
    kyc_submitted_at: new Date().toISOString(),
    kyc_reviewed_at: null,
    kyc_reviewed_by: null,
    kyc_rejection_reason: null,
    host_verified_at: null,
  });
  if (upsertError)
    throw new Error(`Could not save your host details: ${upsertError.message}`);
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
    .select(
      "role, kyc_status, kyc_submitted_at, host_verified_at, kyc_rejection_reason, full_name, phone, alternate_phone, email, host_type, business_name, id_document_type, id_number, date_of_birth, county, residential_address, payout_method, payout_details, host_bio",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error("Unable to check host onboarding status.");
  return data;
}

export async function getHostPanelAccessStatus() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw new Error("Unable to check host panel access.");
  if (!user) return { isVerified: false, hasPendingApplication: false };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("kyc_status, kyc_submitted_at, host_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error("Unable to check host panel access.");
  return {
    isVerified:
      Boolean(profile?.host_verified_at) || profile?.kyc_status === "approved",
    hasPendingApplication:
      profile?.kyc_status === "pending" ||
      (Boolean(profile?.kyc_submitted_at) && profile?.kyc_status !== "rejected"),
  };
}

export async function getHostVerificationStatus() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("kyc_status, kyc_rejection_reason, host_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error("Unable to check host verification status.");
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
    monthly_rate:
      values.monthly_rate == null ? null : Number(values.monthly_rate),
    wifi_mbps: values.wifi_mbps == null ? null : Number(values.wifi_mbps),
    has_workspace: values.has_workspace === true,
    backup_power: values.backup_power ?? "none",
    security_features: Array.isArray(values.security_features)
      ? [...new Set(values.security_features)]
      : [],
    nearest_park_name: String(values.nearest_park_name ?? "").trim() || null,
    park_distance_km:
      values.park_distance_km == null ? null : Number(values.park_distance_km),
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
  if (
    values.monthly_rate !== null &&
    (!Number.isFinite(values.monthly_rate) || values.monthly_rate <= 0)
  ) {
    throw new Error("Monthly rate must be greater than zero.");
  }
  if (
    values.wifi_mbps !== null &&
    (!Number.isInteger(values.wifi_mbps) ||
      values.wifi_mbps < 0 ||
      values.wifi_mbps > 10000)
  ) {
    throw new Error("Wi-Fi speed must be between 0 and 10,000 Mbps.");
  }
  if (
    !["none", "inverter", "solar", "generator"].includes(values.backup_power)
  ) {
    throw new Error("Choose a valid backup power source.");
  }
  if (
    values.security_features.some(
      (feature) => !["gated", "guard_24h", "cctv_common"].includes(feature),
    )
  ) {
    throw new Error("Choose valid security features.");
  }
  if (
    values.nearest_park_name &&
    values.nearest_park_name.length > 120
  ) {
    throw new Error("Park or reserve name must be 120 characters or fewer.");
  }
  if (
    values.park_distance_km !== null &&
    (!Number.isFinite(values.park_distance_km) ||
      values.park_distance_km < 0 ||
      values.park_distance_km > 10000)
  ) {
    throw new Error("Park distance must be between 0 and 10,000 km.");
  }
}

type ArrivalGuideInput = Partial<
  Record<keyof HostArrivalGuideDetails, string | null>
> & {
  address?: string | null;
};

function arrivalGuidePayload(
  listingId: string,
  hostId: string,
  values: ArrivalGuideInput,
) {
  return {
    listing_id: listingId,
    host_id: hostId,
    arrival_address:
      String(values.arrival_address ?? "").trim() ||
      String(values.address ?? "").trim() ||
      null,
    arrival_directions: String(values.arrival_directions ?? "").trim() || null,
    check_in_instructions:
      String(values.check_in_instructions ?? "").trim() || null,
    wifi_name: String(values.wifi_name ?? "").trim() || null,
    wifi_password: String(values.wifi_password ?? "").trim() || null,
    arrival_contact: String(values.arrival_contact ?? "").trim() || null,
    local_tips: String(values.local_tips ?? "").trim() || null,
  };
}

function validateArrivalGuide(values: ArrivalGuideInput) {
  if ((values.arrival_directions ?? "").length > 5000)
    throw new Error("Arrival directions must be 5000 characters or fewer.");
  if ((values.arrival_address ?? "").length > 1000)
    throw new Error("Arrival address must be 1000 characters or fewer.");
  if ((values.check_in_instructions ?? "").length > 5000)
    throw new Error("Check-in instructions must be 5000 characters or fewer.");
  if ((values.wifi_name ?? "").length > 120)
    throw new Error("Wi-Fi name must be 120 characters or fewer.");
  if ((values.wifi_password ?? "").length > 200)
    throw new Error("Wi-Fi password must be 200 characters or fewer.");
  if ((values.arrival_contact ?? "").length > 500)
    throw new Error("Arrival contact must be 500 characters or fewer.");
  if ((values.local_tips ?? "").length > 5000)
    throw new Error("Local tips must be 5000 characters or fewer.");
}

async function saveArrivalGuide(
  listingId: string,
  hostId: string,
  values: ArrivalGuideInput,
) {
  validateArrivalGuide(values);
  const supabase = await createClient();
  const { error } = await supabase
    .from("listing_arrival_guides")
    .upsert(arrivalGuidePayload(listingId, hostId, values), {
      onConflict: "listing_id",
    });
  if (error) throw new Error("Unable to save arrival guide details.");
}

async function recordHostListingChange(
  listingId: string,
  hostId: string,
  beforeValues: Record<string, unknown>,
  afterValues: Record<string, unknown>,
) {
  const changed = Object.keys(afterValues).some(
    (field) =>
      JSON.stringify(beforeValues[field]) !== JSON.stringify(afterValues[field]),
  );
  if (!changed) return;

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("host_listing_change_requests").insert({
    listing_id: listingId,
    host_id: hostId,
    before_values: beforeValues,
    after_values: afterValues,
  });
  if (error) {
    console.error("Failed to add host listing edit to admin history:", error);
    throw new Error(
      "Your changes were saved, but could not be added to the admin change history. Please contact support.",
    );
  }
  revalidatePath("/admin/listing-changes");
  revalidatePath("/admin");
}

export async function createHostListing(values: ListingFormValues) {
  await requireHost();
  throw new Error(
    "Listing creation is managed by the admin team. Hosts can view listings only while the site is in its verification phase.",
  );
}

export async function updateHostListing(
  id: string,
  values: Partial<ListingFormValues>,
) {
  await requireHost();
  throw new Error(
    "Listing edits are disabled for hosts. The admin team reviews and manages listings on your behalf.",
  );
}

export async function setHostListingStatus(
  id: string,
  status: "draft" | "published",
) {
  await requireHost();
  throw new Error(
    "Host publishing is disabled. Listings are reviewed and published by the admin team.",
  );
}

export async function deleteHostListing(id: string) {
  await requireHost();
  throw new Error(
    "Host deletion is disabled. Listing removal is handled by the admin team.",
  );
}

export async function updateHostBookingStatus(
  id: string,
  status: BookingStatus,
) {
  await requireHost();
  if (status !== "completed") {
    throw new Error(
      "Hosts cannot manually confirm or decline a payment hold. Bookings are confirmed after successful payment verification.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("host_mark_booking_completed", {
    p_booking_id: id,
  });
  if (error) {
    if (error.message.includes("CHECKOUT_TIME_NOT_REACHED")) {
      throw new Error("The listing's check-out time has not passed yet.");
    }
    if (error.message.includes("PENDING_GUEST_REQUEST")) {
      throw new Error(
        "Resolve the pending guest request before marking this stay completed.",
      );
    }
    if (error.message.includes("BOOKING_NOT_CONFIRMED")) {
      throw new Error("Only confirmed bookings can be marked completed.");
    }
    if (error.message.includes("BOOKING_NOT_FOUND"))
      throw new Error("Booking not found.");
    console.error("Host booking completion RPC failed:", {
      error: String(error),
      ownProperties: Object.getOwnPropertyNames(error),
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(
      "We couldn't mark this stay as completed. Please try again. If it still fails, contact support.",
    );
  }

  revalidatePath("/host/bookings");
  revalidatePath("/host/payouts");
  revalidatePath("/host");
  revalidatePath("/host/calendar");
  revalidatePath("/account/bookings");
  revalidatePath("/admin/bookings");
}

export async function getHostDashboardData() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const [stats, pending, upcoming, payouts] = await Promise.all([
    supabase
      .from("host_dashboard_stats")
      .select("*")
      .eq("host_id", user.id)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select(HOST_BOOKING_WITH_LISTING)
      .eq("host_id", user.id)
      .eq("status", "pending")
      .gt("hold_expires_at", now)
      .order("check_in", { ascending: true }),
    supabase
      .from("bookings")
      .select(HOST_BOOKING_WITH_LISTING)
      .eq("host_id", user.id)
      .eq("status", "confirmed")
      .gte("check_in", today)
      .order("check_in", { ascending: true }),
    supabase.from("payouts").select("amount, status").eq("host_id", user.id),
  ]);
  if (stats.error || pending.error || upcoming.error || payouts.error)
    throw new Error("Unable to load host dashboard.");

  const payoutTotals = (payouts.data ?? []).reduce(
    (totals, payout) => {
      const amount = Number(payout.amount);
      if (payout.status === "owed") totals.balanceOwed += amount;
      if (payout.status === "paid") totals.lifetimePaidOut += amount;
      return totals;
    },
    { balanceOwed: 0, lifetimePaidOut: 0 },
  );

  return {
    stats: stats.data
      ? {
          ...(stats.data as HostDashboardStats),
          balance_owed: payoutTotals.balanceOwed,
          lifetime_paid_out: payoutTotals.lifetimePaidOut,
        }
      : null,
    pending: pending.data as unknown as Booking[],
    upcoming: upcoming.data as unknown as Booking[],
  };
}

export async function getHostOverviewData() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const today = todayISO();
  const now = new Date().toISOString();
  const todayDate = new Date(`${today}T12:00:00Z`);
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonthStart = new Date(
    Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth() + 1, 1),
  )
    .toISOString()
    .slice(0, 10);
  const previewDates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(todayDate);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const previewMonthKeys = [
    ...new Set(previewDates.map((date) => date.slice(0, 7))),
  ];
  const [
    listingCountResult,
    publishedListingCountResult,
    upcomingResult,
    pendingBookingsResult,
    listingsResult,
    monthBookingsResult,
    verificationResult,
    changesResult,
    unreadSupportCounts,
    payoutData,
    calendarData,
  ] = await Promise.all([
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("host_id", user.id)
      .in("status", ["draft", "published", "suspended"]),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("host_id", user.id)
      .eq("status", "published"),
    supabase
      .from("bookings")
      .select(HOST_BOOKING_WITH_LISTING)
      .eq("host_id", user.id)
      .eq("status", "confirmed")
      .gte("check_in", today)
      .order("check_in", { ascending: true })
      .limit(5),
    supabase
      .from("bookings")
      .select(HOST_BOOKING_WITH_LISTING)
      .eq("host_id", user.id)
      .eq("status", "pending")
      .gt("hold_expires_at", now)
      .order("check_in", { ascending: true }),
    supabase
      .from("listings")
      .select("id, title, status, average_rating, review_count, is_publish_ready, listing_images(url, sort_order)")
      .eq("host_id", user.id)
      .in("status", ["draft", "published", "suspended"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("bookings")
      .select("listing_id, check_in, check_out, status, host_payout_amount")
      .eq("host_id", user.id)
      .in("status", ["confirmed", "completed"])
      .lt("check_in", nextMonthStart)
      .gt("check_out", monthStart),
    supabase
      .from("profiles")
      .select("kyc_status, kyc_rejection_reason, host_verified_at, full_name, payout_details")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("booking_change_requests")
      .select(
        "id, booking_id, request_type, current_check_in, current_check_out, requested_check_in, requested_check_out, quoted_total_amount, amount_paid, refund_percent, estimated_refund_amount, reason, created_at, booking:bookings!inner(guest_name, listing:listings(title))",
      )
      .eq("host_id", user.id)
      .eq("request_type", "date_change")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10),
    getHostUnreadSupportCounts(user.id).catch(() => null),
    getHostPayoutsData(),
    Promise.all(previewMonthKeys.map((month) => getHostCalendarData(month))),
  ]);

  const failedQueries = [
    { name: "published listing count", error: publishedListingCountResult.error },
    { name: "upcoming bookings", error: upcomingResult.error },
    { name: "pending bookings", error: pendingBookingsResult.error },
    { name: "listing summaries", error: listingsResult.error },
    { name: "monthly bookings", error: monthBookingsResult.error },
  ].filter((query) => query.error !== null);
  if (failedQueries.length > 0) {
    console.error(
      "Host dashboard queries failed:",
      failedQueries.map(({ name, error }) => ({
        query: name,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      })),
    );
    throw new Error(
      `Unable to load host dashboard (${failedQueries.map(({ name }) => name).join(", ")}).`,
    );
  }

  const upcomingRows = (upcomingResult.data ?? []) as unknown as Booking[];
  const pendingBookingRows = (pendingBookingsResult.data ?? []) as unknown as Booking[];
  const contactBookingIds = [
    ...new Set([...upcomingRows, ...pendingBookingRows].map((booking) => booking.id)),
  ];
  const guestPhonesResult = contactBookingIds.length
    ? await supabase
        .from("bookings")
        .select("id, guest_phone")
        .eq("host_id", user.id)
        .in("id", contactBookingIds)
    : { data: [], error: null };
  if (guestPhonesResult.error) {
    console.warn("Host dashboard guest phone numbers are unavailable:", {
      code: guestPhonesResult.error.code,
      message: guestPhonesResult.error.message,
    });
  }
  const guestPhoneByBookingId = new Map(
    (guestPhonesResult.data ?? []).map((booking) => [
      booking.id,
      booking.guest_phone as string | null,
    ]),
  );
  const pendingBookings = pendingBookingRows.map((booking) => ({
    ...booking,
    guest_phone: guestPhoneByBookingId.get(booking.id) ?? null,
  }));
  const upcomingRowsWithPhones = upcomingRows.map((booking) => ({
    ...booking,
    guest_phone: guestPhoneByBookingId.get(booking.id) ?? null,
  }));
  const changeRequests = changesResult.error
    ? null
    : ((changesResult.data ?? []) as unknown as HostBookingChangeRequest[]);
  const onboardingStatus = verificationResult.error
    ? null
    : verificationResult.data;

  const listingSummaries = listingsResult.data ?? [];
  const monthBookings = monthBookingsResult.data ?? [];
  const daysInMonth = new Date(
    Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const bookedNights = monthBookings.reduce((total, booking) => {
    const start = booking.check_in < monthStart ? monthStart : booking.check_in;
    const end = booking.check_out > nextMonthStart ? nextMonthStart : booking.check_out;
    const nights = Math.max(
      0,
      (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
        86_400_000,
    );
    return total + nights;
  }, 0);
  const publishedListingCount = publishedListingCountResult.count ?? 0;
  const occupancyRate =
    publishedListingCount > 0
      ? Math.min(
          100,
          Math.round(
            (bookedNights / (publishedListingCount * daysInMonth)) * 100,
          ),
        )
      : 0;
  const payoutDetails =
    onboardingStatus?.payout_details &&
    typeof onboardingStatus.payout_details === "object"
      ? (onboardingStatus.payout_details as Record<string, unknown>)
      : {};
  const payoutPhone = String(
    payoutDetails.mpesa_number ??
      payoutDetails.phone ??
      payoutDetails.phone_number ??
      "",
  ).trim();
  const paidRequestPayoutIds = new Set(payoutData.paidRequestPayoutIds);
  const monthlyEarnings = payoutData.payouts.reduce((total, payout) => {
    const checkout = payout.booking?.check_out;
    if (!checkout || checkout < monthStart || checkout >= nextMonthStart) {
      return total;
    }

    if (payout.status === "paid") {
      const paidAmount = paidRequestPayoutIds.has(payout.id)
        ? payoutData.paidAmountByPayoutId[payout.id] ?? 0
        : Number(payout.amount);
      return total + paidAmount;
    }

    if (payout.status === "owed" && payout.eligible_for_withdrawal) {
      return total + (payoutData.remainingAmountByPayoutId[payout.id] ?? 0);
    }

    return total;
  }, 0);
  const pendingPayout = payoutData.payouts.reduce((total, payout) => {
    if (payout.status !== "owed" && payout.status !== "processing") return total;
    const paidAmount = payoutData.paidAmountByPayoutId[payout.id] ?? 0;
    return total + Math.max(Number(payout.amount) - paidAmount, 0);
  }, 0);
  const calendarBookings = calendarData.flatMap((calendar) => calendar.bookings);
  const calendarBlocks = calendarData.flatMap((calendar) => calendar.blocks);
  const externalCalendarBlocks = calendarData.flatMap(
    (calendar) => calendar.externalBlocks,
  );
  const calendarPreview = listingSummaries.map((listing) => ({
    id: listing.id,
    days: previewDates.map((date) => {
      const isBooked = calendarBookings.some(
        (booking) =>
          booking.listing_id === listing.id &&
          booking.check_in <= date &&
          booking.check_out > date,
      );
      if (isBooked) return "booked" as const;
      const isBlocked = calendarBlocks.some(
        (block) =>
          block.listing_id === listing.id &&
          block.start_date <= date &&
          block.end_date > date,
      );
      const isExternallyBlocked = externalCalendarBlocks.some(
        (block) =>
          block.listing_id === listing.id &&
          block.start_date <= date &&
          block.end_date > date,
      );
      return isBlocked || isExternallyBlocked
        ? ("blocked" as const)
        : ("available" as const);
    }),
  }));

  const upcomingBookingIds = upcomingRows.map((booking) => booking.id);
  const dateChangesResult = upcomingBookingIds.length
    ? await supabase
        .from("booking_change_requests")
        .select(
          "id, booking_id, current_check_in, current_check_out, requested_check_in, requested_check_out, created_at",
        )
        .eq("host_id", user.id)
        .eq("request_type", "date_change")
        .eq("status", "approved")
        .in("booking_id", upcomingBookingIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (dateChangesResult.error)
    throw new Error("Unable to load booking date-change history.");

  const dateChangesByBooking = new Map<
    string,
    NonNullable<Booking["dateChangeHistory"]>
  >();
  for (const dateChange of dateChangesResult.data ?? []) {
    const history = dateChangesByBooking.get(dateChange.booking_id) ?? [];
    history.push(dateChange);
    dateChangesByBooking.set(dateChange.booking_id, history);
  }
  const upcoming = upcomingRowsWithPhones.map((booking) => ({
    ...booking,
    dateChangeHistory: dateChangesByBooking.get(booking.id) ?? [],
  }));

  const listingIds = [
    ...new Set(upcoming.map((booking) => booking.listing_id)),
  ];
  const unreadBookingIds = Object.keys(unreadSupportCounts ?? {});
  const [guidesResult, unreadRows] = await Promise.all([
    listingIds.length
      ? supabase
          .from("listing_arrival_guides")
          .select(
            "listing_id, arrival_address, arrival_directions, check_in_instructions, wifi_name, wifi_password, arrival_contact, local_tips",
          )
          .eq("host_id", user.id)
          .in("listing_id", listingIds)
      : Promise.resolve({ data: [], error: null }),
    unreadBookingIds.length
      ? supabase
          .from("bookings")
          .select(HOST_BOOKING_WITH_LISTING)
          .eq("host_id", user.id)
          .in("id", unreadBookingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  let arrivalGuides: Record<string, HostArrivalGuideDetails | null> | null =
    null;
  if (!guidesResult.error) {
    const guides = Object.fromEntries(
      (guidesResult.data ?? []).map(({ listing_id, ...details }) => [
        listing_id,
        details as HostArrivalGuideDetails,
      ]),
    );
    arrivalGuides = Object.fromEntries(
      listingIds.map((id) => [id, guides[id] ?? null]),
    );
  }

  const supportReplyBookings =
    unreadSupportCounts === null || unreadRows.error
      ? null
      : (unreadRows.data ?? []).map((booking) => ({
          ...(booking as unknown as Booking),
          unreadSupportReplyCount: unreadSupportCounts[booking.id] ?? 0,
        }));

  return {
    hasActiveOrDraftListings: listingCountResult.error
      ? null
      : (listingCountResult.count ?? 0) > 0,
    upcoming,
    pendingBookings,
    hostName: onboardingStatus?.full_name?.trim().split(/\s+/)[0] || "there",
    listings: listingSummaries,
    calendarPreview,
    calendarDates: previewDates,
    payoutPhone,
    availablePayout: payoutData.requestableAmount,
    pendingPayout,
    monthlyEarnings,
    occupancyRate,
    monthlyBookingCount: monthBookings.filter(
      (booking) =>
        booking.check_in >= monthStart && booking.check_in < nextMonthStart,
    ).length,
    onboardingStatus,
    supportReplyBookings,
    changeRequests,
    arrivalGuides,
  };
}

export async function getHostNavigationAttentionCount() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const [changesResult, unreadSupportCounts] = await Promise.all([
    supabase
      .from("booking_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("host_id", user.id)
      .eq("request_type", "date_change")
      .eq("status", "pending"),
    getHostUnreadSupportCounts(user.id),
  ]);
  if (changesResult.error)
    throw new Error("Unable to load host attention count.");

  const unreadSupportReplyCount = Object.values(unreadSupportCounts).reduce(
    (total, count) => total + count,
    0,
  );
  return unreadSupportReplyCount + (changesResult.count ?? 0);
}

export async function getHostListingsData(
  page = 1,
  filter: "all" | Listing["status"] | "pending_review" = "all",
  includeStatusCounts = true,
) {
  const pageSize = 10;
  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Invalid listings page.");
  }

  const { user } = await requireHost();
  const supabase = await createClient();
  let listingsQuery = supabase
    .from("listings")
    .select(
      "id, title, status, is_publish_ready, town, county, price_per_night, bedrooms, bathrooms, average_rating, review_count, created_at, listing_images(id, url, sort_order)",
      { count: "exact" },
    )
    .eq("host_id", user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (filter !== "all") {
    listingsQuery = listingsQuery.eq("status", filter);
  }

  const statuses = [
    "published",
    "draft",
    "pending_review",
    "suspended",
    "archived",
  ] as const;
  const [listingsResult, ...statusCountResults] = await Promise.all([
    listingsQuery,
    ...(includeStatusCounts
      ? statuses.map((status) =>
          supabase
            .from("listings")
            .select("id", { count: "exact", head: true })
            .eq("host_id", user.id)
            .eq("status", status),
        )
      : []),
  ]);
  if (listingsResult.error || statusCountResults.some((result) => result.error)) {
    console.error("Failed to load paginated host listings:", {
      listingsError: listingsResult.error?.message,
      statusCountErrors: statusCountResults
        .map((result, index) =>
          result.error
            ? { status: statuses[index], message: result.error.message }
            : null,
        )
        .filter((error) => error !== null),
    });
    throw new Error("Unable to load listings.");
  }

  const statusCounts = includeStatusCounts
    ? (Object.fromEntries(
        statuses.map((status, index) => [
          status,
          statusCountResults[index].count ?? 0,
        ]),
      ) as Record<(typeof statuses)[number], number>)
    : null;
  const totalCount = statusCounts
    ? statuses.reduce((total, status) => total + statusCounts[status], 0)
    : null;

  return {
    listings: (listingsResult.data ?? []) as unknown as Listing[],
    totalCount,
    filteredCount: listingsResult.count ?? 0,
    totalPages: Math.max(1, Math.ceil((listingsResult.count ?? 0) / pageSize)),
    statusCounts,
    pageSize,
  };
}

export async function getHostListingRequestsData() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("host_listing_requests")
    .select(
      "id, host_id, proposed_title, property_type, county, town, address, contact_phone, property_notes, status, proposed_visit_at, host_message, listing_id, created_at, updated_at",
    )
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load your listing requests.");
  return (data ?? []) as HostListingRequest[];
}

export async function submitHostListingRequest(input: {
  proposedTitle: string;
  propertyType: string;
  county: string;
  town: string;
  address: string;
  contactPhone: string;
  propertyNotes: string;
}) {
  const { user } = await requireHost();
  const values = {
    proposed_title: input.proposedTitle.trim(),
    property_type: input.propertyType.trim(),
    county: input.county.trim(),
    town: input.town.trim(),
    address: input.address.trim() || null,
    contact_phone: input.contactPhone.trim() || null,
    property_notes: input.propertyNotes.trim() || null,
  };

  if (values.proposed_title.length < 3 || values.proposed_title.length > 120)
    throw new Error("Property name must be 3 to 120 characters.");
  if (values.property_type.length < 2 || values.property_type.length > 80)
    throw new Error("Enter a property type up to 80 characters.");
  if (values.county.length < 2 || values.county.length > 80)
    throw new Error("Enter a valid county.");
  if (values.town.length < 2 || values.town.length > 100)
    throw new Error("Enter a valid town or area.");
  if (
    (values.address?.length ?? 0) > 500 ||
    (values.contact_phone?.length ?? 0) > 40 ||
    (values.property_notes?.length ?? 0) > 3000
  ) {
    throw new Error("One or more property details exceed the allowed length.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("host_listing_requests")
    .insert({ ...values, host_id: user.id })
    .select("*")
    .single();
  if (error) throw new Error("Unable to submit your property visit request.");

  revalidatePath("/host/listings");
  revalidatePath("/admin/listing-requests");
  revalidatePath("/admin");
  return data as HostListingRequest;
}

export async function getHostBookingsData(
  status: BookingStatus,
) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(HOST_BOOKING_WITH_LISTING)
    .eq("host_id", user.id)
    .eq("status", status)
    .order("check_in", { ascending: true });
  if (error) {
    console.error("Host bookings query failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    const diagnostic =
      process.env.NODE_ENV === "production"
        ? ""
        : ` (${error.code}: ${error.message})`;
    throw new Error(`Unable to load bookings.${diagnostic}`);
  }
  const bookings = (data ?? []) as unknown as Booking[];
  if (!bookings.length) return bookings;

  const bookingIds = bookings.map((booking) => booking.id);
  const admin = getSupabaseAdmin();
  const [
    unreadByBooking,
    dateChangesResult,
    refundRequestsResult,
    cancellationRefundsResult,
    bookingSnapshotResult,
    paymentResult,
    payoutResult,
  ] = await Promise.all([
    getHostUnreadSupportCounts(user.id, bookingIds),
    supabase
      .from("booking_change_requests")
      .select(
        "id, booking_id, current_check_in, current_check_out, requested_check_in, requested_check_out, created_at",
      )
      .eq("host_id", user.id)
      .eq("request_type", "date_change")
      .eq("status", "approved")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false }),
    admin
      .from("payment_refund_requests")
      .select(
        "id, payment_id, booking_id, status, amount_paid, actual_refund_amount, created_at, updated_at, processed_at",
      )
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false }),
    admin
      .from("booking_change_requests")
      .select(
        "id, booking_id, amount_paid, estimated_refund_amount, refund_processing_status, actual_refund_amount, created_at, responded_at, refund_decided_at, refund_processed_at",
      )
      .eq("host_id", user.id)
      .eq("request_type", "cancellation")
      .eq("status", "approved")
      .in("booking_id", bookingIds)
      .in("refund_processing_status", [
        "awaiting_admin_review",
        "awaiting_manual_processing",
        "declined",
        "processed",
        "not_eligible",
      ])
      .order("created_at", { ascending: false }),
    admin
      .from("bookings")
      .select("id, pricing_snapshot")
      .in("id", bookingIds),
    admin
      .from("payments")
      .select("booking_id, status, paid_at, created_at")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false }),
    admin
      .from("payouts")
      .select("id, booking_id, amount, status, eligible_for_withdrawal")
      .in("booking_id", bookingIds),
  ]);
  if (dateChangesResult.error)
    throw new Error("Unable to load booking date-change history.");
  if (refundRequestsResult.error) {
    console.error(
      "Unable to load host refund progress:",
      refundRequestsResult.error,
    );
  }
  if (cancellationRefundsResult.error) {
    console.error(
      "Unable to load host cancellation refund progress:",
      cancellationRefundsResult.error,
    );
  }
  if (bookingSnapshotResult.error)
    throw new Error("Unable to load selected optional fees.");
  if (paymentResult.error)
    throw new Error("Unable to load optional-fee payment status.");
  if (payoutResult.error)
    throw new Error("Unable to load booking payout status.");
  const payouts = payoutResult.data ?? [];
  const payoutIds = payouts.map((payout) => payout.id);
  const { data: payoutItems, error: payoutItemsError } = payoutIds.length
    ? await admin
        .from("host_payout_request_items")
        .select("request_id, payout_id, amount")
        .in("payout_id", payoutIds)
    : { data: [], error: null };
  if (payoutItemsError)
    throw new Error("Unable to load booking payout requests.");
  const payoutRequestIds = [
    ...new Set((payoutItems ?? []).map((item) => item.request_id)),
  ];
  const { data: payoutRequests, error: payoutRequestsError } =
    payoutRequestIds.length
      ? await admin
          .from("host_payout_requests")
          .select("id, status")
          .in("id", payoutRequestIds)
      : { data: [], error: null };
  if (payoutRequestsError)
    throw new Error("Unable to load booking payout requests.");
  const payoutRequestStatusById = new Map(
    (payoutRequests ?? []).map((request) => [request.id, request.status]),
  );
  const payoutRequestAmounts = new Map<
    string,
    { requested: number; processing: number; paid: number }
  >();
  for (const item of payoutItems ?? []) {
    const status = payoutRequestStatusById.get(item.request_id);
    if (
      status !== "requested" &&
      status !== "processing" &&
      status !== "paid"
    ) {
      continue;
    }
    const amounts = payoutRequestAmounts.get(item.payout_id) ?? {
      requested: 0,
      processing: 0,
      paid: 0,
    };
    if (status === "requested") amounts.requested += Number(item.amount);
    else if (status === "processing")
      amounts.processing += Number(item.amount);
    else amounts.paid += Number(item.amount);
    payoutRequestAmounts.set(item.payout_id, amounts);
  }
  const payoutStatusByBooking = new Map<
    string,
    NonNullable<Booking["hostPayoutStatus"]>
  >();
  for (const payout of payouts) {
    const amounts = payoutRequestAmounts.get(payout.id);
    const requestedAmount = amounts?.requested ?? 0;
    const processingAmount = amounts?.processing ?? 0;
    const paidAmount = amounts?.paid ?? 0;
    const payoutAmount = Number(payout.amount);
    const activeAmount = requestedAmount + processingAmount;
    const remainingAmount = Math.max(payoutAmount - paidAmount, 0);
    let status: NonNullable<Booking["hostPayoutStatus"]>;
    if (payout.status === "paid" || paidAmount >= payoutAmount) {
      status = "paid";
    } else if (paidAmount > 0) {
      status = "partially_paid";
    } else if (activeAmount > 0) {
      if (activeAmount < remainingAmount) {
        status = "partially_requested";
      } else if (processingAmount > 0) {
        status = "processing";
      } else {
        status = "requested";
      }
    } else if (payout.status === "processing") {
      status = "processing";
    } else if (!payout.eligible_for_withdrawal) {
      status = "under_review";
    } else {
      status = "available";
    }
    payoutStatusByBooking.set(payout.booking_id, status);
  }
  const optionalFeesByBooking = new Map<string, HostOptionalFee[] | null>(
    (bookingSnapshotResult.data ?? []).map((row) => [
      row.id,
      getSelectedOptionalFees(row.pricing_snapshot),
    ]),
  );
  const paymentByBooking = new Map<
    string,
    { status: string; paid_at: string | null }
  >();
  for (const payment of paymentResult.data ?? []) {
    if (!paymentByBooking.has(payment.booking_id)) {
      paymentByBooking.set(payment.booking_id, {
        status: payment.status,
        paid_at: payment.paid_at,
      });
    }
  }

  const dateChangesByBooking = new Map<
    string,
    NonNullable<Booking["dateChangeHistory"]>
  >();
  for (const dateChange of dateChangesResult.data ?? []) {
    const history = dateChangesByBooking.get(dateChange.booking_id) ?? [];
    history.push(dateChange);
    dateChangesByBooking.set(dateChange.booking_id, history);
  }
  const refundRequestsByBooking = new Map<
    string,
    NonNullable<Booking["refundRequests"]>
  >();
  for (const refund of refundRequestsResult.error
    ? []
    : (refundRequestsResult.data ?? [])) {
    const requests = refundRequestsByBooking.get(refund.booking_id) ?? [];
    requests.push({ ...refund, source: "payment" });
    refundRequestsByBooking.set(refund.booking_id, requests);
  }
  for (const refund of cancellationRefundsResult.error
    ? []
    : (cancellationRefundsResult.data ?? [])) {
    const requests = refundRequestsByBooking.get(refund.booking_id) ?? [];
    requests.push({
      id: refund.id,
      booking_id: refund.booking_id,
      payment_id: null,
      source: "cancellation",
      status: refund.refund_processing_status,
      amount_paid: refund.amount_paid,
      estimated_refund_amount: refund.estimated_refund_amount,
      actual_refund_amount: refund.actual_refund_amount,
      created_at: refund.created_at,
      updated_at:
        refund.refund_processed_at ??
        refund.refund_decided_at ??
        refund.responded_at ??
        refund.created_at,
      processed_at: refund.refund_processed_at,
    });
    refundRequestsByBooking.set(refund.booking_id, requests);
  }

  return bookings.map((booking) => ({
    ...booking,
    selectedOptionalFees: optionalFeesByBooking.get(booking.id) ?? null,
    paymentStatus: paymentByBooking.get(booking.id)?.status ?? null,
    paymentPaidAt: paymentByBooking.get(booking.id)?.paid_at ?? null,
    hostPayoutStatus:
      payoutStatusByBooking.get(booking.id) ?? "not_released",
    unreadSupportReplyCount: unreadByBooking[booking.id] ?? 0,
    dateChangeHistory: dateChangesByBooking.get(booking.id) ?? [],
    refundRequests: refundRequestsByBooking.get(booking.id) ?? [],
  }));
}

export async function getHostRefundsData(): Promise<RefundListItem[]> {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data: bookings, error: bookingError } = await supabase
    .from("bookings")
    .select("id, booking_reference, listing:listings(title)")
    .eq("host_id", user.id);
  if (bookingError)
    throw new Error("Unable to load bookings for your refunds.");
  const bookingDetails = (bookings ?? []) as unknown as Array<{
    id: string;
    booking_reference: string;
    listing: { title: string } | Array<{ title: string }> | null;
  }>;
  if (!bookingDetails.length) return [];

  const bookingIds = bookingDetails.map((booking) => booking.id);
  const admin = getSupabaseAdmin();
  const [paymentResult, cancellationResult] = await Promise.all([
    admin
      .from("payment_refund_requests")
      .select(
        "id, payment_id, booking_id, status, amount_paid, actual_refund_amount, created_at, updated_at, processed_at",
      )
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false }),
    admin
      .from("booking_change_requests")
      .select(
        "id, booking_id, amount_paid, estimated_refund_amount, refund_processing_status, actual_refund_amount, created_at, responded_at, refund_decided_at, refund_processed_at",
      )
      .eq("host_id", user.id)
      .eq("request_type", "cancellation")
      .eq("status", "approved")
      .in("refund_processing_status", [
        "awaiting_admin_review",
        "awaiting_manual_processing",
        "declined",
        "processed",
        "not_eligible",
      ])
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false }),
  ]);
  if (paymentResult.error || cancellationResult.error) {
    console.error(
      "Unable to load host refund section:",
      paymentResult.error ?? cancellationResult.error,
    );
    throw new Error(
      "Unable to load refunds for your bookings. Please try again.",
    );
  }

  const refunds: RefundProgress[] = [
    ...((paymentResult.data ?? []) as RefundProgress[]).map((refund) => ({
      ...refund,
      source: "payment" as const,
    })),
    ...(cancellationResult.data ?? []).map((refund) => ({
      id: refund.id,
      booking_id: refund.booking_id,
      payment_id: null,
      source: "cancellation" as const,
      status: refund.refund_processing_status as RefundProgress["status"],
      amount_paid: refund.amount_paid,
      estimated_refund_amount: refund.estimated_refund_amount,
      actual_refund_amount: refund.actual_refund_amount,
      created_at: refund.created_at,
      updated_at:
        refund.refund_processed_at ??
        refund.refund_decided_at ??
        refund.responded_at ??
        refund.created_at,
      processed_at: refund.refund_processed_at,
    })),
  ];
  const bookingById = new Map(
    bookingDetails.map((booking) => {
      const listing = Array.isArray(booking.listing)
        ? booking.listing[0]
        : booking.listing;
      return [
        booking.id,
        {
          booking_reference: booking.booking_reference,
          listing_title: listing?.title ?? null,
        },
      ];
    }),
  );

  return refunds
    .map((refund) => ({ ...refund, ...bookingById.get(refund.booking_id) }))
    .filter((refund): refund is RefundListItem =>
      Boolean(refund.booking_reference),
    )
    .sort(
      (first, second) =>
        Date.parse(second.updated_at ?? second.created_at) -
        Date.parse(first.updated_at ?? first.created_at),
    );
}

export async function getHostBookingChangeRequestsData() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_change_requests")
    .select(
      "id, booking_id, request_type, current_check_in, current_check_out, requested_check_in, requested_check_out, quoted_total_amount, amount_paid, refund_percent, estimated_refund_amount, reason, created_at, auto_decision_at, booking:bookings!inner(guest_name, listing:listings(title))",
    )
    .eq("host_id", user.id)
    .eq("request_type", "date_change")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error("Unable to load booking change requests.");
  return (data ?? []) as unknown as HostBookingChangeRequest[];
}

export async function getHostDateChangeHistoryData(): Promise<
  HostDateChangeRecord[]
> {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_change_requests")
    .select(
      "id, booking_id, status, current_check_in, current_check_out, requested_check_in, requested_check_out, quoted_total_amount, reason, created_at, responded_at, host_response, auto_decision_at, decision_source, booking:bookings!inner(booking_reference, guest_name, listing:listings(title))",
    )
    .eq("host_id", user.id)
    .eq("request_type", "date_change")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Unable to load date-change requests.");
  return (data ?? []) as unknown as HostDateChangeRecord[];
}

export async function respondToBookingChangeRequest(
  requestId: string,
  approve: boolean,
  hostResponse = "",
) {
  const response = hostResponse.trim();
  if (!approve && (response.length < 5 || response.length > 1000)) {
    throw new Error(
      "Add a decline reason between 5 and 1000 characters. The guest will see it.",
    );
  }
  await requireHost();
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_booking_change_request", {
    p_request_id: requestId,
    p_approve: approve,
    p_host_response: response || null,
  });
  if (error) {
    if (error.message.includes("PRICE_CHANGE_REQUIRES_SUPPORT")) {
      throw new Error(
        "The new dates change the total. Contact the guest and support to arrange the price difference before changing this booking.",
      );
    }
    if (error.message.includes("REQUESTED_DATES_UNAVAILABLE")) {
      throw new Error(
        "Those dates are no longer available. Decline the request and ask the guest to choose other dates.",
      );
    }
    if (error.message.includes("REQUEST_ALREADY_HANDLED"))
      throw new Error("This request has already been handled.");
    if (error.message.includes("DECLINE_REASON_REQUIRED"))
      throw new Error(
        "Add a decline reason between 5 and 1000 characters. The guest will see it.",
      );
    if (error.message.includes("RESPONSE_WINDOW_EXPIRED"))
      throw new Error(
        "The response window has expired. The system is processing this request automatically.",
      );
    throw new Error("Unable to update this booking request.");
  }
  revalidatePath("/host/bookings");
  revalidatePath("/host/date-changes");
  revalidatePath("/account/bookings");
  revalidatePath("/host/payouts");
}

export async function getHostPayoutsData() {
  const { user } = await requireHost();
  const admin = getSupabaseAdmin();
  const [
    { data, error },
    { data: requests, error: requestError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    admin
      .from("payouts")
      .select(
        "*, booking:bookings(id, booking_reference, check_in, check_out, nights, adults_count, children_count, pets_count, rooms_count, status, host_payout_amount, host_gross_amount, collection_fee_amount, collection_fee_reconciled, guest_name, guest_country, special_requests, listing:listings(id, title, town, county))",
      )
      .eq("host_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("host_payout_requests")
      .select(
        "id, amount, net_amount, destination_method, destination_details, status, external_reference, requested_at, processed_at, admin_note",
      )
      .eq("host_id", user.id)
      .order("requested_at", { ascending: false }),
    admin
      .from("profiles")
      .select("host_fee_balance, payout_method, payout_details")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  if (error || requestError || profileError)
    throw new Error("Unable to load payouts.");

  const requestIds = (requests ?? [])
    .filter((request) => ["requested", "processing", "paid"].includes(request.status))
    .map((request) => request.id);
  const { data: reservedItems, error: reservedError } = requestIds.length
    ? await admin
        .from("host_payout_request_items")
      .select("request_id, payout_id, amount")
        .in("request_id", requestIds)
    : { data: [], error: null };
  if (reservedError) throw new Error("Unable to load payout requests.");

  const reservedByPayoutId = new Map<string, number>();
  const paidByPayoutId = new Map<string, number>();
  const requestStatusById = new Map(
    (requests ?? []).map((request) => [request.id, request.status]),
  );
  const paidRequestPayoutIds = new Set<string>();
  for (const item of reservedItems ?? []) {
    reservedByPayoutId.set(
      item.payout_id,
      (reservedByPayoutId.get(item.payout_id) ?? 0) + Number(item.amount),
    );
    if (requestStatusById.get(item.request_id) === "paid") {
      paidRequestPayoutIds.add(item.payout_id);
      paidByPayoutId.set(
        item.payout_id,
        (paidByPayoutId.get(item.payout_id) ?? 0) + Number(item.amount),
      );
    }
  }
  const payouts = (data ?? []) as unknown as Payout[];
  const remainingAmountByPayoutId = Object.fromEntries(
    payouts.map((payout) => [
      payout.id,
      payout.status === "owed" && payout.eligible_for_withdrawal
        ? Math.max(
            Number(payout.amount) - (reservedByPayoutId.get(payout.id) ?? 0),
            0,
          )
        : 0,
    ]),
  );
  const availableAmount = payouts
    .filter(
      (payout) =>
        payout.status === "owed" &&
        payout.eligible_for_withdrawal,
    )
    .reduce(
      (sum, payout) =>
        sum +
        Math.max(
          Number(payout.amount) - (reservedByPayoutId.get(payout.id) ?? 0),
          0,
        ),
      0,
    );
  const feeBalance = Number(profile?.host_fee_balance ?? 0);
  const payoutDetails =
    profile?.payout_details && typeof profile.payout_details === "object"
      ? (profile.payout_details as Record<string, unknown>)
      : {};

  return {
    payouts,
    requests: requests ?? [],
    availableAmount,
    remainingAmountByPayoutId,
    paidAmountByPayoutId: Object.fromEntries(paidByPayoutId),
    paidRequestPayoutIds: [...paidRequestPayoutIds],
    requestableAmount: Math.min(
      availableAmount,
      Math.max(availableAmount - feeBalance, 0),
    ),
    feeBalance,
    payoutPhone: String(
      payoutDetails.mpesa_number ?? payoutDetails.phone ?? payoutDetails.phone_number ?? "",
    ),
  };
}

export async function requestHostPayout(input: {
  amount: number;
  mpesaNumber: string;
}) {
  const { user } = await requireHost();
  if (
    !input ||
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    Number(input.amount.toFixed(2)) !== input.amount
  ) {
    throw new Error("Enter a payout amount greater than zero.");
  }
  let mpesaNumber: string;
  try {
    mpesaNumber = normalizeDarajaPhone(input.mpesaNumber);
  } catch {
    throw new Error("Enter a valid Kenyan M-Pesa number.");
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("create_host_payout_request_with_amount", {
    p_host_id: user.id,
    p_request_amount: input.amount,
    p_mpesa_number: mpesaNumber,
  });
  if (error) {
    if (error.message.includes("PAYOUT_PROCESSING_FEES_EXCEED_REQUEST"))
      throw new Error(
        "Choose an amount higher than any payout processing fees due.",
      );
    if (error.message.includes("NO_PAYOUTS_AVAILABLE"))
      throw new Error(
        "There are no available completed-booking payouts to request.",
      );
    if (error.message.includes("INVALID_PAYOUT_REQUEST_AMOUNT"))
      throw new Error(
        "That amount is greater than your available payout. Refresh the page and try again.",
      );
    if (error.message.includes("INVALID_MPESA_DESTINATION"))
      throw new Error("Enter a valid Kenyan M-Pesa number.");
    console.error("Host payout request failed:", error);
    throw new Error("Unable to request your payout. Please try again.");
  }
  const request = Array.isArray(data) ? data[0] : data;
  if (!request?.request_id)
    throw new Error("Unable to create your payout request.");
  revalidatePath("/host/payouts");
  revalidatePath("/admin/payouts/requests");
  return {
    requestId: request.request_id,
    amount: Number(request.request_amount),
  };
}

export async function getHostListingData(id: string) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, host_id, title, description, county, town, address, property_type, categories, price_per_night, monthly_rate, wifi_mbps, has_workspace, backup_power, security_features, nearest_park_name, park_distance_km, additional_charges, max_guests, bedrooms, bathrooms, amenities, features, house_rules, status, slug, latitude, longitude, check_in_time, check_out_time, min_nights, cancellation_policy, instant_book, is_publish_ready, created_at, updated_at, listing_images(id, url, sort_order, position, category, room_index, caption, is_cover, width, height)",
    )
    .eq("id", id)
    .eq("host_id", user.id)
    .single();
  if (error) throw new Error("Listing not found.");
  return data as unknown as Listing & { listing_images?: ListingImage[] };
}

export type HostListingChangeRequest = {
  id: string;
  listing_id: string;
  host_note: string | null;
  before_values: Record<string, unknown>;
  after_values: Record<string, unknown>;
  status: "pending_review" | "reviewed" | "follow_up";
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export async function getHostListingChangesData(listingId: string) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("host_listing_change_requests")
    .select(
      "id, listing_id, host_note, before_values, after_values, status, admin_note, reviewed_at, created_at",
    )
    .eq("listing_id", listingId)
    .eq("host_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error("Unable to load listing change history.");
  return (data ?? []) as HostListingChangeRequest[];
}

const HOST_LISTING_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const HOST_LISTING_IMAGE_CATEGORIES = new Set([
  "exterior",
  "living",
  "kitchen",
  "bedroom",
  "bathroom",
  "outdoor",
  "amenities",
  "neighborhood",
]);

function validateHostListingImageMetadata(metadata: ListingImageMetadata) {
  const usesRoomIndex =
    metadata.category === "bedroom" || metadata.category === "bathroom";
  const hasValidRoomIndex = usesRoomIndex
    ? Number.isInteger(metadata.roomIndex) &&
      metadata.roomIndex !== null &&
      metadata.roomIndex >= 1 &&
      metadata.roomIndex <= 10
    : metadata.roomIndex === null;

  if (
    !HOST_LISTING_IMAGE_CATEGORIES.has(metadata.category) ||
    !Number.isInteger(metadata.position) ||
    metadata.position < 0 ||
    typeof metadata.isCover !== "boolean" ||
    typeof metadata.caption !== "string" ||
    metadata.caption.trim().length > 80 ||
    !Number.isInteger(metadata.width) ||
    metadata.width < 1 ||
    !Number.isInteger(metadata.height) ||
    metadata.height < 1 ||
    !hasValidRoomIndex
  ) {
    throw new Error("Invalid listing image details.");
  }
}

export async function createHostListingImageUploadUrl(
  listingId: string,
  contentType: string,
  fileSize: number,
) {
  const { user } = await requireHost();
  const extension = HOST_LISTING_IMAGE_TYPES[contentType];
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      listingId,
    ) ||
    !extension ||
    !Number.isFinite(fileSize) ||
    fileSize <= 0 ||
    fileSize > 10 * 1024 * 1024
  ) {
    throw new Error("Choose a JPG, PNG, or WebP image up to 10 MB.");
  }

  const admin = getSupabaseAdmin();
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (listingError || !listing) throw new Error("Listing not found.");

  const path = `${user.id}/${listingId}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await admin.storage
    .from("listing-images")
    .createSignedUploadUrl(path);
  if (error || !data) throw new Error("Unable to prepare image upload.");

  return { path, signedUrl: data.signedUrl };
}

export async function registerHostListingImage(
  listingId: string,
  path: string,
  metadata?: ListingImageMetadata,
) {
  const { user } = await requireHost();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      listingId,
    )
  ) {
    throw new Error("Invalid listing.");
  }

  const admin = getSupabaseAdmin();
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (listingError || !listing) throw new Error("Listing not found.");

  const folder = `${user.id}/${listingId}`;
  const fileName = path.startsWith(`${folder}/`)
    ? path.slice(folder.length + 1)
    : "";
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(fileName)) {
    throw new Error("Invalid image upload path.");
  }

  const { data: files, error: storageError } = await admin.storage
    .from("listing-images")
    .list(folder, { search: fileName, limit: 10 });
  if (storageError || !files?.some((file) => file.name === fileName)) {
    throw new Error("Uploaded image could not be found.");
  }

  if (metadata) validateHostListingImageMetadata(metadata);
  let nextPosition = metadata?.position;
  if (nextPosition === undefined) {
    const { data: latestImage, error: latestImageError } = await admin
      .from("listing_images")
      .select("position")
      .eq("listing_id", listingId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestImageError) throw new Error("Unable to determine image order.");
    nextPosition = (latestImage?.position ?? -1) + 1;
  }

  const { data: publicUrl } = admin.storage
    .from("listing-images")
    .getPublicUrl(path);
  const { data: image, error: insertError } = await admin
    .from("listing_images")
    .insert({
      listing_id: listingId,
      url: publicUrl.publicUrl,
      sort_order: nextPosition,
      position: nextPosition,
      ...(metadata
        ? {
            category: metadata.category,
            room_index: metadata.roomIndex,
            caption: metadata.caption.trim(),
            is_cover: metadata.isCover,
            width: metadata.width,
            height: metadata.height,
          }
        : {}),
    })
    .select("id, url, sort_order, position")
    .single();

  if (insertError) {
    const { error: cleanupError } = await admin.storage
      .from("listing-images")
      .remove([path]);
    if (cleanupError) {
      console.error("Failed to remove unregistered listing image:", cleanupError);
    }
    throw new Error(insertError.message || "Unable to save listing image.");
  }

  revalidatePath("/host/listings");
  revalidatePath(`/host/listings/${listingId}`);
  revalidatePath(`/host/listings/${listingId}/edit`);
  revalidatePath(`/admin/listings/${listingId}`);
  revalidatePath(`/admin/listings/${listingId}/edit`);
  updateTag("public-listings");
  return image;
}

export type HostListingImageArrangement = ListingImageMetadata & {
  id: string;
};

export async function saveHostListingImageArrangement(
  listingId: string,
  arrangement: HostListingImageArrangement[],
) {
  const { user } = await requireHost();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      listingId,
    )
  ) {
    throw new Error("Invalid listing.");
  }
  if (!Array.isArray(arrangement) || arrangement.length > 40) {
    throw new Error("A listing can have no more than 40 photos.");
  }
  if (
    new Set(arrangement.map((image) => image.id)).size !== arrangement.length
  ) {
    throw new Error("A photo appears more than once in the gallery.");
  }

  arrangement.forEach((image, index) => {
    validateHostListingImageMetadata(image);
    if (image.position !== index || image.isCover !== (index === 0)) {
      throw new Error("Invalid listing photo order or cover.");
    }
  });

  const admin = getSupabaseAdmin();
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id, host_id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (listingError || !listing) throw new Error("Listing not found.");

  const { data: existingImages, error: imagesError } = await admin
    .from("listing_images")
    .select(
      "id, url, position, sort_order, category, room_index, caption, is_cover",
    )
    .eq("listing_id", listingId);
  if (imagesError) throw new Error("Unable to load listing photos.");

  const currentImages = existingImages ?? [];
  const currentById = new Map(currentImages.map((image) => [image.id, image]));
  if (arrangement.some((image) => !currentById.has(image.id))) {
    throw new Error("One or more photos no longer belong to this listing.");
  }

  const keptIds = new Set(arrangement.map((image) => image.id));
  const removedImages = currentImages.filter((image) => !keptIds.has(image.id));
  const expectedFolder = `${user.id}/${listingId}/`;
  const marker = "/storage/v1/object/public/listing-images/";

  for (const image of removedImages) {
    let objectPath = "";
    try {
      const imageUrl = new URL(image.url);
      const markerIndex = imageUrl.pathname.indexOf(marker);
      if (markerIndex >= 0) {
        objectPath = decodeURIComponent(
          imageUrl.pathname.slice(markerIndex + marker.length),
        );
      }
    } catch (error) {
      if (!(error instanceof TypeError) && !(error instanceof URIError)) {
        throw error;
      }
    }
    if (!objectPath.startsWith(expectedFolder)) continue;

    const { error: removeError } = await admin.storage
      .from("listing-images")
      .remove([objectPath]);
    if (removeError) {
      throw new Error("Unable to remove a deleted listing photo.");
    }
  }

  if (removedImages.length > 0) {
    const { error: deleteError } = await admin
      .from("listing_images")
      .delete()
      .eq("listing_id", listingId)
      .in(
        "id",
        removedImages.map((image) => image.id),
      );
    if (deleteError) {
      throw new Error(deleteError.message || "Unable to remove listing photos.");
    }
  }

  const { error: coverError } = await admin
    .from("listing_images")
    .update({ is_cover: false })
    .eq("listing_id", listingId);
  if (coverError) throw new Error("Unable to update the listing cover photo.");

  const maxPosition = currentImages.reduce(
    (maximum, image) => Math.max(maximum, image.position ?? -1),
    -1,
  );
  for (const [index, image] of arrangement.entries()) {
    const temporaryPosition = maxPosition + arrangement.length + index + 1;
    const { error: temporaryOrderError } = await admin
      .from("listing_images")
      .update({ position: temporaryPosition, sort_order: temporaryPosition })
      .eq("listing_id", listingId)
      .eq("id", image.id);
    if (temporaryOrderError) {
      throw new Error("Unable to prepare the new photo order.");
    }
  }

  for (const image of arrangement) {
    const { error: updateError } = await admin
      .from("listing_images")
      .update({
        category: image.category,
        room_index: image.roomIndex,
        caption: image.caption.trim(),
        is_cover: image.isCover,
        width: image.width,
        height: image.height,
        position: image.position,
        sort_order: image.position,
      })
      .eq("listing_id", listingId)
      .eq("id", image.id);
    if (updateError) {
      throw new Error(updateError.message || "Unable to save listing photos.");
    }
  }

  const beforePhotoGallery = currentImages.map((image, index) => ({
    id: image.id,
    category: image.category ?? null,
    room_index: image.room_index ?? null,
    caption: image.caption ?? "",
    position: image.position ?? image.sort_order ?? index,
    is_cover: image.is_cover === true,
  }));
  const afterPhotoGallery = arrangement.map((image) => ({
      id: image.id,
      category: image.category ?? null,
      room_index: image.roomIndex,
      caption: image.caption ?? "",
      position: image.position,
      is_cover: image.isCover,
    }));
  revalidatePath("/host/listings");
  revalidatePath(`/host/listings/${listingId}`);
  revalidatePath(`/host/listings/${listingId}/edit`);
  revalidatePath(`/admin/listings/${listingId}`);
  revalidatePath(`/admin/listings/${listingId}/edit`);
  updateTag("public-listings");
  await recordHostListingChange(
    listingId,
    user.id,
    { photo_gallery: beforePhotoGallery },
    { photo_gallery: afterPhotoGallery },
  );
}

export async function deleteHostListingImage(imageId: string) {
  const { user } = await requireHost();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      imageId,
    )
  ) {
    throw new Error("Invalid listing image.");
  }

  const admin = getSupabaseAdmin();
  const { data: image, error: imageError } = await admin
    .from("listing_images")
    .select("id, listing_id, url")
    .eq("id", imageId)
    .maybeSingle();
  if (imageError || !image) throw new Error("Listing image not found.");

  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id, host_id")
    .eq("id", image.listing_id)
    .eq("host_id", user.id)
    .maybeSingle();
  if (listingError || !listing) throw new Error("Listing not found.");

  const { error: deleteError } = await admin
    .from("listing_images")
    .delete()
    .eq("id", imageId)
    .eq("listing_id", listing.id);
  if (deleteError) throw new Error("Unable to remove listing image.");

  const marker = "/storage/v1/object/public/listing-images/";
  let objectPath = "";
  let cleanupWarning: string | null = null;
  try {
    const imageUrl = new URL(image.url);
    const markerIndex = imageUrl.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      objectPath = decodeURIComponent(
        imageUrl.pathname.slice(markerIndex + marker.length),
      );
    }
  } catch {
    cleanupWarning = "Image removed from the listing, but its storage URL is invalid.";
  }

  if (objectPath && objectPath.startsWith(`${user.id}/${listing.id}/`)) {
    const { error } = await admin.storage
      .from("listing-images")
      .remove([objectPath]);
    if (error) {
      console.error("Failed to remove deleted listing image from storage:", error);
      cleanupWarning =
        "Image removed from the listing, but its stored file could not be deleted.";
    }
  } else if (!cleanupWarning) {
    cleanupWarning =
      "Image removed from the listing, but its stored file could not be identified.";
  }

  const supabase = await createClient();
  const { data: remainingImages, error: remainingImagesError } = await admin
    .from("listing_images")
    .select("id")
    .eq("listing_id", listing.id)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(1);
  if (remainingImagesError) {
    cleanupWarning = "Image removed, but unable to update the listing cover.";
  } else if (remainingImages?.[0]) {
    const { error: coverError } = await supabase.rpc(
      "host_set_listing_image_cover",
      { p_listing_id: listing.id, p_image_id: remainingImages[0].id },
    );
    if (coverError) {
      cleanupWarning = "Image removed, but unable to update the listing cover.";
    }
  }

  revalidatePath("/host/listings");
  revalidatePath(`/host/listings/${listing.id}`);
  revalidatePath(`/host/listings/${listing.id}/edit`);
  revalidatePath(`/admin/listings/${listing.id}`);
  revalidatePath(`/admin/listings/${listing.id}/edit`);
  updateTag("public-listings");

  return cleanupWarning;
}

export async function setHostListingImageCover(
  listingId: string,
  imageId: string,
) {
  const { user } = await requireHost();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      listingId,
    ) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      imageId,
    )
  ) {
    throw new Error("Invalid listing image.");
  }

  const admin = getSupabaseAdmin();
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (listingError || !listing) throw new Error("Listing not found.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("host_set_listing_image_cover", {
    p_listing_id: listingId,
    p_image_id: imageId,
  });
  if (error) {
    if (error.message.includes("LISTING_IMAGE_NOT_FOUND")) {
      throw new Error("That image is no longer part of this listing.");
    }
    if (
      error.code === "PGRST202" ||
      error.code === "42883" ||
      error.message.includes("host_set_listing_image_cover")
    ) {
      throw new Error(
        "Cover image support is not enabled in the database yet. Apply the latest Supabase migration and try again.",
      );
    }
    console.error("Failed to set host listing cover image:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Unable to set the listing cover image: ${error.message}`);
  }

  revalidatePath("/host/listings");
  revalidatePath(`/host/listings/${listingId}`);
  revalidatePath(`/host/listings/${listingId}/edit`);
  updateTag("public-listings");
}

export async function submitHostListingChangeRequest(
  listingId: string,
  formData: FormData,
) {
  await requireHost();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      listingId,
    )
  ) {
    throw new Error("Invalid listing.");
  }

  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const list = (key: string, maxItems = 50) => {
    const items = text(key)
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    if (items.length > maxItems || items.some((item) => item.length > 500)) {
      throw new Error(`Please shorten the ${key.replaceAll("_", " ")} list.`);
    }
    return items;
  };
  const amenities = formData
    .getAll("amenities")
    .map((amenity) => String(amenity).trim())
    .filter(Boolean);
  if (
    amenities.length > 50 ||
    amenities.some((amenity) => amenity.length > 500) ||
    new Set(amenities.map((amenity) => amenity.toLocaleLowerCase())).size !==
      amenities.length
  ) {
    throw new Error("Please provide up to 50 unique amenities.");
  }
  const houseRules = formData
    .getAll("house_rules")
    .map((rule) => String(rule).trim())
    .filter(Boolean);
  if (
    houseRules.length > 50 ||
    houseRules.some((rule) => rule.length > 500) ||
    new Set(houseRules.map((rule) => rule.toLocaleLowerCase())).size !==
      houseRules.length
  ) {
    throw new Error("Please provide up to 50 unique house rules.");
  }
  let additionalCharges: unknown;
  try {
    additionalCharges = JSON.parse(text("additional_charges"));
  } catch {
    throw new Error("Please review the additional guest charges.");
  }
  if (
    !Array.isArray(additionalCharges) ||
    additionalCharges.length > 20 ||
    additionalCharges.some(
      (charge) =>
        !charge ||
        typeof charge !== "object" ||
        typeof charge.name !== "string" ||
        !charge.name.trim() ||
        charge.name.trim().length > 80 ||
        typeof charge.amount !== "number" ||
        !Number.isFinite(charge.amount) ||
        charge.amount <= 0 ||
        charge.amount > 100000000 ||
        !["per_booking", "per_night"].includes(charge.frequency) ||
        typeof charge.required !== "boolean",
    ) ||
    new Set(
      additionalCharges.map((charge) => charge.name.trim().toLocaleLowerCase()),
    ).size !== additionalCharges.length
  ) {
    throw new Error("Please provide up to 20 valid, uniquely named guest charges.");
  }
  const categories = formData
    .getAll("categories")
    .map((category) => String(category).trim())
    .filter(Boolean);
  if (categories.length > 10 || new Set(categories).size !== categories.length) {
    throw new Error("Choose valid listing categories.");
  }
  const number = (key: string, minimum: number, integer = true) => {
    const parsed = Number(text(key));
    if (
      !Number.isFinite(parsed) ||
      parsed < minimum ||
      (integer && !Number.isInteger(parsed))
    ) {
      throw new Error(`Enter a valid ${key.replaceAll("_", " ")}.`);
    }
    return parsed;
  };
  const optionalNumber = (
    key: string,
    minimum: number,
    maximum: number,
    integer = false,
  ) => {
    const rawValue = text(key);
    if (!rawValue) return null;
    const parsed = Number(rawValue);
    if (
      !Number.isFinite(parsed) ||
      parsed < minimum ||
      parsed > maximum ||
      (integer && !Number.isInteger(parsed))
    ) {
      throw new Error(`Enter a valid ${key.replaceAll("_", " ")}.`);
    }
    return parsed;
  };
  const backupPower = text("backup_power");
  if (!["none", "inverter", "solar", "generator"].includes(backupPower)) {
    throw new Error("Choose a valid backup power source.");
  }
  const securityFeatures = formData
    .getAll("security_features")
    .map((feature) => String(feature).trim())
    .filter(Boolean);
  if (
    securityFeatures.some(
      (feature) => !["gated", "guard_24h", "cctv_common"].includes(feature),
    ) ||
    new Set(securityFeatures).size !== securityFeatures.length
  ) {
    throw new Error("Choose valid security features.");
  }
  const nearestParkName = text("nearest_park_name");
  if (nearestParkName.length > 120) {
    throw new Error("Park or reserve name must be 120 characters or fewer.");
  }

  const changes = {
    title: text("title"),
    description: text("description"),
    county: text("county"),
    town: text("town"),
    address: text("address"),
    property_type: text("property_type"),
    categories,
    price_per_night: number("price_per_night", 1, false),
    monthly_rate: optionalNumber("monthly_rate", 0.01, 100000000),
    wifi_mbps: optionalNumber("wifi_mbps", 0, 10000, true),
    has_workspace: formData.get("has_workspace") === "on",
    backup_power: backupPower,
    security_features: securityFeatures,
    nearest_park_name: nearestParkName || null,
    park_distance_km: optionalNumber("park_distance_km", 0, 10000),
    max_guests: number("max_guests", 1),
    bedrooms: number("bedrooms", 0),
    bathrooms: number("bathrooms", 0, false),
    amenities,
    additional_charges: additionalCharges,
    features: list("features"),
    house_rules: houseRules,
    check_in_time: text("check_in_time"),
    check_out_time: text("check_out_time"),
    min_nights: number("min_nights", 1),
    instant_book: formData.get("instant_book") === "on",
  };
  const hostNote = text("host_note");
  if (hostNote.length > 1500) {
    throw new Error("Your note must be 1500 characters or fewer.");
  }
  const expectedUpdatedAt = text("expected_updated_at");
  if (!expectedUpdatedAt || !Number.isFinite(Date.parse(expectedUpdatedAt))) {
    throw new Error("Refresh this listing before submitting your changes.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "host_update_listing_with_change_request",
    {
      p_listing_id: listingId,
      p_changes: changes,
      p_host_note: hostNote || null,
      p_expected_updated_at: expectedUpdatedAt,
    },
  );
  if (error) {
    if (error.message.includes("NO_LISTING_CHANGES")) {
      throw new Error("Make a change or add a note before submitting.");
    }
    if (error.message.includes("LISTING_NOT_FOUND")) {
      throw new Error("Listing not found or you do not have access to it.");
    }
    if (error.message.includes("LISTING_CHANGED_REFRESH")) {
      throw new Error("This listing changed since you opened the form. Refresh and review the latest details.");
    }
    throw new Error("Unable to apply listing changes. Please review the fields and try again.");
  }

  revalidatePath("/host");
  revalidatePath("/host/listings");
  revalidatePath(`/host/listings/${listingId}`);
  revalidatePath(`/host/listings/${listingId}/edit`);
  revalidatePath("/admin/listing-changes");
  revalidatePath("/admin");
  updateTag("public-listings");
}

export async function getHostArrivalGuidesData(listingIds: string[]) {
  const { user } = await requireHost();
  const uniqueIds = [...new Set(listingIds)].filter(Boolean);
  if (uniqueIds.length === 0)
    return {} as Record<string, HostArrivalGuideDetails | null>;

  const supabase = await createClient();
  const { data: ownedListings, error: listingError } = await supabase
    .from("listings")
    .select("id")
    .eq("host_id", user.id)
    .in("id", uniqueIds);
  if (listingError) throw new Error("Unable to check your listings.");

  const ownedIds = (ownedListings ?? []).map((listing) => listing.id);
  const { data, error } = ownedIds.length
    ? await supabase
        .from("listing_arrival_guides")
        .select(
          "listing_id, arrival_address, arrival_directions, check_in_instructions, wifi_name, wifi_password, arrival_contact, local_tips",
        )
        .eq("host_id", user.id)
        .in("listing_id", ownedIds)
    : { data: [], error: null };
  if (error) throw new Error("Unable to load arrival guide details.");

  const guides = Object.fromEntries(
    (data ?? []).map(({ listing_id, ...details }) => [
      listing_id,
      details as HostArrivalGuideDetails,
    ]),
  );
  return Object.fromEntries(
    ownedIds.map((id) => [id, guides[id] ?? null]),
  ) as Record<string, HostArrivalGuideDetails | null>;
}

export async function updateHostArrivalGuide(
  listingId: string,
  values: HostArrivalGuideDetails,
) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (listingError || !listing) throw new Error("Listing not found.");

  const { data: previousGuide, error: guideError } = await supabase
    .from("listing_arrival_guides")
    .select(
      "arrival_address, arrival_directions, check_in_instructions, wifi_name, wifi_password, arrival_contact, local_tips",
    )
    .eq("listing_id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (guideError) throw new Error("Unable to load the current arrival guide.");

  const beforeValues = {
    arrival_address: previousGuide?.arrival_address ?? null,
    arrival_directions: previousGuide?.arrival_directions ?? null,
    check_in_instructions: previousGuide?.check_in_instructions ?? null,
    wifi_name: previousGuide?.wifi_name ?? null,
    wifi_password: previousGuide?.wifi_password ? "Saved" : "Not set",
    arrival_contact: previousGuide?.arrival_contact ?? null,
    local_tips: previousGuide?.local_tips ?? null,
  };
  const payload = arrivalGuidePayload(listingId, user.id, values);
  const afterValues = {
    arrival_address: payload.arrival_address,
    arrival_directions: payload.arrival_directions,
    check_in_instructions: payload.check_in_instructions,
    wifi_name: payload.wifi_name,
    wifi_password: payload.wifi_password ? "Saved" : "Not set",
    arrival_contact: payload.arrival_contact,
    local_tips: payload.local_tips,
  };

  await saveArrivalGuide(listingId, user.id, values);
  await recordHostListingChange(listingId, user.id, beforeValues, afterValues);
  revalidatePath("/host");
  revalidatePath(`/host/listings/${listingId}/arrival-guide`);
  revalidatePath(`/host/listings/${listingId}`);
  revalidatePath(`/host/listings/${listingId}/edit`);
  revalidatePath(`/account/bookings`);
}

export async function getHostAvailabilityData(listingId: string) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (!listing) throw new Error("Listing not found.");
  const { data, error } = await supabase
    .from("listing_availability_blocks")
    .select("*")
    .eq("listing_id", listingId)
    .order("start_date");
  if (error) throw new Error("Unable to load availability.");
  return data as AvailabilityBlock[];
}

export async function getHostCalendarData(month: string) {
  const { user } = await requireHost();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new Error("Invalid calendar month.");

  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const monthStart = `${month}-01`;
  const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  const supabase = await createClient();
  const { data: listingsData, error: listingsError } = await supabase
    .from("listings")
    .select("id, title, status")
    .eq("host_id", user.id)
    .order("title");

  if (listingsError) throw new Error("Unable to load calendar listings.");
  const listings = listingsData ?? [];
  if (listings.length === 0)
    return { listings, bookings: [], blocks: [], externalBlocks: [] };

  const listingIds = listings.map((listing) => listing.id);
  const [bookingsResult, blocksResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(HOST_BOOKING_WITH_LISTING)
      .eq("host_id", user.id)
      .or(activeBookingFilter())
      .lt("check_in", nextMonthStart)
      .gt("check_out", monthStart)
      .order("check_in"),
    supabase
      .from("listing_availability_blocks")
      .select("*")
      .in("listing_id", listingIds)
      .lt("start_date", nextMonthStart)
      .gt("end_date", monthStart)
      .order("start_date"),
  ]);

  const failedQueries = [
    { name: "bookings", error: bookingsResult.error },
    { name: "availability blocks", error: blocksResult.error },
  ].filter((query) => query.error !== null);
  if (failedQueries.length > 0) {
    console.error(
      "Host calendar queries failed:",
      failedQueries.map(({ name, error }) => ({
        query: name,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      })),
    );
    throw new Error(
      `Unable to load host calendar (${failedQueries.map(({ name }) => name).join(", ")}).`,
    );
  }
  const admin = getSupabaseAdmin();
  const { data: externalEvents, error: externalEventsError } = await admin
    .from("host_external_calendar_events")
    .select(
      "id, listing_id, start_date, end_date, connection:host_calendar_connections(source_name)",
    )
    .eq("host_id", user.id)
    .in("listing_id", listingIds)
    .lt("start_date", nextMonthStart)
    .gt("end_date", monthStart)
    .order("start_date");

  if (externalEventsError)
    throw new Error("Unable to load imported calendar dates.");
  return {
    listings,
    bookings: (bookingsResult.data ?? []) as unknown as Booking[],
    blocks: (blocksResult.data ?? []) as AvailabilityBlock[],
    externalBlocks: (externalEvents ?? []).map((event) => {
      const connection = event.connection as unknown as {
        source_name?: string;
      } | null;
      return {
        id: event.id,
        listing_id: event.listing_id,
        start_date: event.start_date,
        end_date: event.end_date,
        source_name: connection?.source_name ?? "External calendar",
      };
    }),
  };
}

export async function getHostCalendarConnections() {
  const { user } = await requireHost();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("host_calendar_connections")
    .select(
      "id, listing_id, source_name, last_synced_at, last_sync_status, last_sync_error, created_at",
    )
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load calendar connections.");
  return data ?? [];
}

export async function addHostCalendarConnection(
  listingId: string,
  sourceUrl: string,
  sourceName: string,
) {
  const { user } = await requireHost();
  const safeUrl = validateExternalCalendarUrl(sourceUrl.trim());
  const safeName =
    sourceName
      .trim()
      .replace(/[<>\r\n]/g, "")
      .slice(0, 80) || new URL(safeUrl).hostname;
  const sessionClient = await createClient();
  const { data: listing } = await sessionClient
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (!listing) throw new Error("Listing not found.");

  const admin = getSupabaseAdmin();
  const { data: connection, error } = await admin
    .from("host_calendar_connections")
    .insert({
      host_id: user.id,
      listing_id: listingId,
      source_name: safeName,
      source_url: safeUrl,
    })
    .select("id")
    .single();
  if (error || !connection) {
    if (error?.code === "23505")
      throw new Error("This calendar is already connected to the listing.");
    throw new Error("Unable to connect this calendar.");
  }

  let syncMessage: string | null = null;
  try {
    await syncCalendarConnection(connection.id, true);
  } catch (syncError) {
    syncMessage =
      syncError instanceof Error
        ? syncError.message
        : "Calendar connected, but the first sync failed.";
  }
  revalidatePath("/host/calendar");
  return { id: connection.id, syncMessage };
}

export async function syncHostCalendarConnection(connectionId: string) {
  const { user } = await requireHost();
  const admin = getSupabaseAdmin();
  const { data: connection } = await admin
    .from("host_calendar_connections")
    .select("id")
    .eq("id", connectionId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (!connection) throw new Error("Calendar connection not found.");
  const result = await syncCalendarConnection(connection.id, true);
  revalidatePath("/host/calendar");
  return result;
}

export async function removeHostCalendarConnection(connectionId: string) {
  const { user } = await requireHost();
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("host_calendar_connections")
    .delete()
    .eq("id", connectionId)
    .eq("host_id", user.id);
  if (error) throw new Error("Unable to remove calendar connection.");
  revalidatePath("/host/calendar");
}

export async function rotateHostCalendarExportFeed(listingId: string) {
  const { user } = await requireHost();
  const sessionClient = await createClient();
  const { data: listing } = await sessionClient
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (!listing) throw new Error("Listing not found.");

  const token = randomBytes(32).toString("base64url");
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("host_calendar_export_feeds")
    .upsert(
      {
        listing_id: listingId,
        host_id: user.id,
        token_hash: hashCalendarToken(token),
      },
      { onConflict: "listing_id" },
    );
  if (error) throw new Error("Unable to create a private calendar link.");
  return token;
}

export async function addHostAvailabilityBlock(
  listingId: string,
  startDate: string,
  endDate: string,
  reason: string,
) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (!listing || startDate >= endDate)
    throw new Error("Invalid availability dates.");
  await syncStaleCalendarConnectionsForListing(listingId);
  const [bookingConflict, blockConflict] = await Promise.all([
    supabase
      .from("bookings")
      .select("id")
      .eq("listing_id", listingId)
      .or(activeBookingFilter())
      .lt("check_in", endDate)
      .gt("check_out", startDate)
      .limit(1),
    supabase
      .from("listing_availability_blocks")
      .select("id")
      .eq("listing_id", listingId)
      .lt("start_date", endDate)
      .gt("end_date", startDate)
      .limit(1),
  ]);
  if (bookingConflict.error || blockConflict.error)
    throw new Error("Unable to verify date availability.");
  if (bookingConflict.data?.length)
    throw new Error("These dates overlap an active payment hold or confirmed stay.");
  if (blockConflict.data?.length)
    throw new Error("These dates overlap an existing blocked period.");
  const admin = getSupabaseAdmin();
  const { data: externalConflict, error: externalConflictError } = await admin
    .from("host_external_calendar_events")
    .select("id")
    .eq("host_id", user.id)
    .eq("listing_id", listingId)
    .lt("start_date", endDate)
    .gt("end_date", startDate)
    .limit(1);
  if (externalConflictError)
    throw new Error("Unable to verify imported calendar dates.");
  if (externalConflict?.length)
    throw new Error("These dates overlap an imported external booking.");
  const { error } = await supabase
    .from("listing_availability_blocks")
    .insert({
      listing_id: listingId,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || null,
    });
  if (error) throw new Error("Unable to block dates.");
  revalidatePath(`/host/listings/${listingId}/edit`);
  revalidatePath("/host/calendar");
}

export async function removeHostAvailabilityBlock(id: string) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data: block } = await supabase
    .from("listing_availability_blocks")
    .select("listing_id")
    .eq("id", id)
    .maybeSingle();
  if (!block) throw new Error("Availability block not found.");

  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("id", block.listing_id)
    .eq("host_id", user.id)
    .maybeSingle();
  if (!listing) throw new Error("You do not own this listing.");

  const { error } = await supabase
    .from("listing_availability_blocks")
    .delete()
    .eq("id", id);
  if (error) throw new Error("Unable to remove blocked dates.");

  revalidatePath(`/host/listings/${block.listing_id}/edit`);
  revalidatePath("/host/calendar");
}
