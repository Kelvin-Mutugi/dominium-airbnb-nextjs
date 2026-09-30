"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { requireHost } from "@/app/lib/host-auth";
import { hashCalendarToken, syncCalendarConnection, syncStaleCalendarConnectionsForListing, validateExternalCalendarUrl } from "@/app/lib/host/calendar-sync";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";
import { todayISO } from "@/app/lib/format";
import { getRequesterSupportUnreadCounts } from "@/app/customer-support/actions";
import type {
  AvailabilityBlock,
  Booking,
  BookingStatus,
  HostDashboardStats,
  HostArrivalGuideDetails,
  HostBookingChangeRequest,
  HostListingRequest,
  Listing,
  ListingFormValues,
  ListingImage,
  Payout,
} from "./types";

const MPESA_REGEX = /^0\d{9}$/;
const HOST_BOOKING_FIELDS = "id, booking_reference, listing_id, host_id, check_in, check_out, nights, adults_count, children_count, rooms_count, status, host_payout_amount, guest_name, guest_country, special_requests";
const HOST_BOOKING_WITH_LISTING = `${HOST_BOOKING_FIELDS}, listing:listings(id, title, town, county)`;

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

type ArrivalGuideInput = Partial<Record<keyof HostArrivalGuideDetails, string | null>> & {
  address?: string | null;
};

function arrivalGuidePayload(listingId: string, hostId: string, values: ArrivalGuideInput) {
  return {
    listing_id: listingId,
    host_id: hostId,
    arrival_address: String(values.arrival_address ?? "").trim() || String(values.address ?? "").trim() || null,
    arrival_directions: String(values.arrival_directions ?? "").trim() || null,
    check_in_instructions: String(values.check_in_instructions ?? "").trim() || null,
    wifi_name: String(values.wifi_name ?? "").trim() || null,
    wifi_password: String(values.wifi_password ?? "").trim() || null,
    arrival_contact: String(values.arrival_contact ?? "").trim() || null,
    local_tips: String(values.local_tips ?? "").trim() || null,
  };
}

function validateArrivalGuide(values: ArrivalGuideInput) {
  if ((values.arrival_directions ?? "").length > 5000) throw new Error("Arrival directions must be 5000 characters or fewer.");
  if ((values.arrival_address ?? "").length > 1000) throw new Error("Arrival address must be 1000 characters or fewer.");
  if ((values.check_in_instructions ?? "").length > 5000) throw new Error("Check-in instructions must be 5000 characters or fewer.");
  if ((values.wifi_name ?? "").length > 120) throw new Error("Wi-Fi name must be 120 characters or fewer.");
  if ((values.wifi_password ?? "").length > 200) throw new Error("Wi-Fi password must be 200 characters or fewer.");
  if ((values.arrival_contact ?? "").length > 500) throw new Error("Arrival contact must be 500 characters or fewer.");
  if ((values.local_tips ?? "").length > 5000) throw new Error("Local tips must be 5000 characters or fewer.");
}

async function saveArrivalGuide(listingId: string, hostId: string, values: ArrivalGuideInput) {
  validateArrivalGuide(values);
  const supabase = await createClient();
  const { error } = await supabase
    .from("listing_arrival_guides")
    .upsert(arrivalGuidePayload(listingId, hostId, values), { onConflict: "listing_id" });
  if (error) throw new Error("Unable to save arrival guide details.");
}

export async function createHostListing(values: ListingFormValues) {
  await requireHost();
  throw new Error("Listing creation is managed by the admin team. Hosts can view listings only while the site is in its verification phase.");
}

export async function updateHostListing(id: string, values: Partial<ListingFormValues>) {
  await requireHost();
  throw new Error("Listing edits are disabled for hosts. The admin team reviews and manages listings on your behalf.");
}

export async function setHostListingStatus(id: string, status: "draft" | "published") {
  await requireHost();
  throw new Error("Host publishing is disabled. Listings are reviewed and published by the admin team.");
}

export async function deleteHostListing(id: string) {
  await requireHost();
  throw new Error("Host deletion is disabled. Listing removal is handled by the admin team.");
}

export async function updateHostBookingStatus(id: string, status: BookingStatus, declineReason = "") {
  const { user } = await requireHost();
  if (!["confirmed", "cancelled", "completed"].includes(status)) throw new Error("Invalid booking status.");
  const normalizedReason = declineReason.trim();
  if (status === "cancelled" && normalizedReason.length > 500) {
    throw new Error("Decline reason must be 500 characters or fewer.");
  }

  const supabase = await createClient();
  const { data: booking, error: lookupError } = await supabase
    .from("bookings")
    .select("status, check_out")
    .eq("id", id)
    .eq("host_id", user.id)
    .maybeSingle();
  if (lookupError || !booking) throw new Error("Booking not found.");

  const today = new Date().toISOString().slice(0, 10);
  const isAllowedTransition =
    (booking.status === "pending" && (status === "confirmed" || status === "cancelled")) ||
    (booking.status === "confirmed" && status === "completed" && booking.check_out <= today);
  if (!isAllowedTransition) throw new Error("This booking can no longer be changed to that status.");

  const { data: updated, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .eq("host_id", user.id)
    .eq("status", booking.status)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Unable to update booking status.");
  if (!updated) throw new Error("Booking status changed. Refresh and try again.");

  if (status === "cancelled" && normalizedReason) {
    const admin = getSupabaseAdmin();
    const { error: updateLogError } = await admin.from("booking_updates").insert({
      booking_id: id,
      actor_id: user.id,
      event_type: "booking_status_changed",
      summary: `Host declined booking request: ${normalizedReason}`,
      details: { old_status: booking.status, new_status: status, decline_reason: normalizedReason },
    });
    if (updateLogError) console.error("Failed to record host decline reason:", updateLogError);
  }

  revalidatePath("/host/bookings");
  revalidatePath("/host/payouts");
  revalidatePath("/host");
}

export async function getHostDashboardData() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [stats, pending, upcoming, payouts] = await Promise.all([
    supabase.from("host_dashboard_stats").select("*").eq("host_id", user.id).maybeSingle(),
    supabase.from("bookings").select(HOST_BOOKING_WITH_LISTING).eq("host_id", user.id).eq("status", "pending").order("check_in", { ascending: true }),
    supabase.from("bookings").select(HOST_BOOKING_WITH_LISTING).eq("host_id", user.id).eq("status", "confirmed").gte("check_in", today).order("check_in", { ascending: true }),
    supabase.from("payouts").select("amount, status").eq("host_id", user.id),
  ]);
  if (stats.error || pending.error || upcoming.error || payouts.error) throw new Error("Unable to load host dashboard.");

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
  const [listingCountResult, upcomingResult, verificationResult, changesResult] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("host_id", user.id).in("status", ["draft", "published"]),
    supabase.from("bookings").select(HOST_BOOKING_WITH_LISTING).eq("host_id", user.id).eq("status", "confirmed").gte("check_in", today).order("check_in", { ascending: true }).limit(5),
    supabase.from("profiles").select("kyc_status, kyc_rejection_reason, host_verified_at").eq("id", user.id).maybeSingle(),
    supabase.from("booking_change_requests").select("id, booking_id, request_type, current_check_in, current_check_out, requested_check_in, requested_check_out, quoted_total_amount, amount_paid, refund_percent, estimated_refund_amount, reason, created_at, booking:bookings!inner(guest_name, listing:listings(title))").eq("host_id", user.id).eq("status", "pending").order("created_at", { ascending: true }).limit(10),
  ]);

  if (upcomingResult.error) {
    throw new Error("Unable to load host dashboard.");
  }

  const upcoming = (upcomingResult.data ?? []) as unknown as Booking[];
  const changeRequests = changesResult.error ? null : (changesResult.data ?? []) as unknown as HostBookingChangeRequest[];
  const onboardingStatus = verificationResult.error ? null : verificationResult.data;

  let supportReplyBookings: Booking[] | null = null;
  const admin = getSupabaseAdmin();
  const listingIds = [...new Set(upcoming.map((booking) => booking.listing_id))];
  const [threadsResult, guidesResult] = await Promise.all([
    admin.from("customer_support_threads")
      .select("id, booking_id, requester_last_read_at")
      .eq("requester_id", user.id)
      .eq("status", "waiting_on_requester"),
    listingIds.length
      ? supabase.from("listing_arrival_guides")
          .select("listing_id, arrival_address, arrival_directions, check_in_instructions, wifi_name, wifi_password, arrival_contact, local_tips")
          .eq("host_id", user.id)
          .in("listing_id", listingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  let arrivalGuides: Record<string, HostArrivalGuideDetails | null> | null = null;
  if (!guidesResult.error) {
    const guides = Object.fromEntries((guidesResult.data ?? []).map(({ listing_id, ...details }) => [listing_id, details as HostArrivalGuideDetails]));
    arrivalGuides = Object.fromEntries(listingIds.map((id) => [id, guides[id] ?? null]));
  }

  if (!threadsResult.error) {
    const supportThreads = threadsResult.data ?? [];
    const { data: messages, error: messagesError } = supportThreads.length
      ? await admin.from("customer_support_messages")
          .select("thread_id, created_at")
          .in("thread_id", supportThreads.map((thread) => thread.id))
          .eq("sender_role", "admin")
      : { data: [], error: null };

    if (!messagesError) {
      const threadById = new Map(supportThreads.map((thread) => [thread.id, thread]));
      const unreadCountByBooking = new Map<string, number>();
      for (const message of messages ?? []) {
        const thread = threadById.get(message.thread_id);
        if (thread && Date.parse(message.created_at) > Date.parse(thread.requester_last_read_at)) {
          unreadCountByBooking.set(thread.booking_id, (unreadCountByBooking.get(thread.booking_id) ?? 0) + 1);
        }
      }

      const unreadBookingIds = [...unreadCountByBooking.keys()];
      const unreadRows = unreadBookingIds.length
        ? await supabase.from("bookings")
            .select(HOST_BOOKING_WITH_LISTING)
            .eq("host_id", user.id)
            .in("id", unreadBookingIds)
        : { data: [], error: null };
      supportReplyBookings = unreadRows.error
        ? null
        : (unreadRows.data ?? []).map((booking) => ({
            ...(booking as unknown as Booking),
            unreadSupportReplyCount: unreadCountByBooking.get(booking.id) ?? 0,
          }));
    }
  }

  return {
    hasActiveOrDraftListings: listingCountResult.error ? null : (listingCountResult.count ?? 0) > 0,
    upcoming,
    onboardingStatus,
    supportReplyBookings,
    changeRequests,
    arrivalGuides,
  };
}

export async function getHostNavigationAttentionCount() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const [bookingsResult, changesResult] = await Promise.all([
    supabase.from("bookings").select("id, status").eq("host_id", user.id),
    supabase.from("booking_change_requests").select("id").eq("host_id", user.id).eq("status", "pending"),
  ]);
  if (bookingsResult.error || changesResult.error) throw new Error("Unable to load host attention count.");

  const bookings = bookingsResult.data ?? [];
  const bookingIds = bookings.map((booking) => booking.id);
  const unreadSupportReplies = await getRequesterSupportUnreadCounts(user.id, bookingIds);
  const unreadSupportReplyCount = Object.values(unreadSupportReplies).reduce((total, count) => total + count, 0);

  const pendingBookingCount = bookings.filter((booking) => booking.status === "pending").length;
  return pendingBookingCount + unreadSupportReplyCount + (changesResult.data?.length ?? 0);
}

export async function getHostListingsData() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase.from("listings").select("*, listing_images(id, url, sort_order)").eq("host_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load listings.");
  return data as unknown as Listing[];
}

export async function getHostListingRequestsData() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("host_listing_requests")
    .select("id, host_id, proposed_title, property_type, county, town, address, contact_phone, property_notes, status, proposed_visit_at, host_message, listing_id, created_at, updated_at")
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

  if (values.proposed_title.length < 3 || values.proposed_title.length > 120) throw new Error("Property name must be 3 to 120 characters.");
  if (values.property_type.length < 2 || values.property_type.length > 80) throw new Error("Enter a property type up to 80 characters.");
  if (values.county.length < 2 || values.county.length > 80) throw new Error("Enter a valid county.");
  if (values.town.length < 2 || values.town.length > 100) throw new Error("Enter a valid town or area.");
  if ((values.address?.length ?? 0) > 500 || (values.contact_phone?.length ?? 0) > 40 || (values.property_notes?.length ?? 0) > 3000) {
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

export async function getHostBookingsData(status: Exclude<BookingStatus, "pending">) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase.from("bookings").select(HOST_BOOKING_WITH_LISTING).eq("host_id", user.id).eq("status", status).order("check_in", { ascending: true });
  if (error) throw new Error("Unable to load bookings.");
  const bookings = (data ?? []) as unknown as Booking[];
  if (!bookings.length) return bookings;

  const bookingIds = bookings.map((booking) => booking.id);
  const unreadByBooking = await getRequesterSupportUnreadCounts(user.id, bookingIds);
  return bookings.map((booking) => ({ ...booking, unreadSupportReplyCount: unreadByBooking[booking.id] ?? 0 }));
}

export async function getHostBookingChangeRequestsData() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('booking_change_requests')
    .select('id, booking_id, request_type, current_check_in, current_check_out, requested_check_in, requested_check_out, quoted_total_amount, amount_paid, refund_percent, estimated_refund_amount, reason, created_at, booking:bookings!inner(guest_name, listing:listings(title))')
    .eq('host_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw new Error('Unable to load booking change requests.');
  return (data ?? []) as unknown as HostBookingChangeRequest[];
}

export async function respondToBookingChangeRequest(requestId: string, approve: boolean) {
  await requireHost();
  const supabase = await createClient();
  const { error } = await supabase.rpc('respond_to_booking_change_request', {
    p_request_id: requestId,
    p_approve: approve,
    p_host_response: null,
  });
  if (error) {
    if (error.message.includes('PRICE_CHANGE_REQUIRES_SUPPORT')) {
      throw new Error('The new dates change the total. Contact the guest and support to arrange the price difference before changing this booking.');
    }
    if (error.message.includes('REQUESTED_DATES_UNAVAILABLE')) {
      throw new Error('Those dates are no longer available. Decline the request and ask the guest to choose other dates.');
    }
    if (error.message.includes('REQUEST_ALREADY_HANDLED')) throw new Error('This request has already been handled.');
    throw new Error('Unable to update this booking request.');
  }
  revalidatePath('/host/bookings');
  revalidatePath('/account/bookings');
  revalidatePath('/host/payouts');
}

export async function getHostPayoutsData() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payouts")
    .select("*, booking:bookings(id, booking_reference, check_in, check_out, nights, adults_count, children_count, rooms_count, status, host_payout_amount, guest_name, guest_country, special_requests, listing:listings(id, title, town, county))")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load payouts.");
  return data as unknown as Payout[];
}

export async function getHostListingData(id: string) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase.from("listings").select("*, listing_images(id, url, sort_order)").eq("id", id).eq("host_id", user.id).single();
  if (error) throw new Error("Listing not found.");
  const { data: arrivalGuide, error: guideError } = await supabase
    .from("listing_arrival_guides")
    .select("arrival_address, arrival_directions, check_in_instructions, wifi_name, wifi_password, arrival_contact, local_tips")
    .eq("listing_id", id)
    .maybeSingle();
  if (guideError) throw new Error("Unable to load arrival guide details.");
  return { ...data, ...arrivalGuide } as unknown as Listing & ListingFormValues & { listing_images?: ListingImage[] };
}

export async function getHostArrivalGuidesData(listingIds: string[]) {
  const { user } = await requireHost();
  const uniqueIds = [...new Set(listingIds)].filter(Boolean);
  if (uniqueIds.length === 0) return {} as Record<string, HostArrivalGuideDetails | null>;

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
        .select("listing_id, arrival_address, arrival_directions, check_in_instructions, wifi_name, wifi_password, arrival_contact, local_tips")
        .eq("host_id", user.id)
        .in("listing_id", ownedIds)
    : { data: [], error: null };
  if (error) throw new Error("Unable to load arrival guide details.");

  const guides = Object.fromEntries(
    (data ?? []).map(({ listing_id, ...details }) => [listing_id, details as HostArrivalGuideDetails]),
  );
  return Object.fromEntries(ownedIds.map((id) => [id, guides[id] ?? null])) as Record<string, HostArrivalGuideDetails | null>;
}

export async function updateHostArrivalGuide(listingId: string, values: HostArrivalGuideDetails) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (listingError || !listing) throw new Error("Listing not found.");

  await saveArrivalGuide(listingId, user.id, values);
  revalidatePath("/host");
  revalidatePath(`/host/listings/${listingId}`);
  revalidatePath(`/account/bookings`);
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

export async function getHostCalendarData(month: string) {
  const { user } = await requireHost();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid calendar month.");

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
  if (listings.length === 0) return { listings, bookings: [], blocks: [], externalBlocks: [] };

  const listingIds = listings.map((listing) => listing.id);
  const [bookingsResult, blocksResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(HOST_BOOKING_WITH_LISTING)
      .eq("host_id", user.id)
      .in("status", ["pending", "confirmed"])
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

  if (bookingsResult.error || blocksResult.error) throw new Error("Unable to load host calendar.");
  const admin = getSupabaseAdmin();
  const { data: externalEvents, error: externalEventsError } = await admin
    .from("host_external_calendar_events")
    .select("id, listing_id, start_date, end_date, connection:host_calendar_connections(source_name)")
    .eq("host_id", user.id)
    .in("listing_id", listingIds)
    .lt("start_date", nextMonthStart)
    .gt("end_date", monthStart)
    .order("start_date");

  if (externalEventsError) throw new Error("Unable to load imported calendar dates.");
  return {
    listings,
    bookings: (bookingsResult.data ?? []) as unknown as Booking[],
    blocks: (blocksResult.data ?? []) as AvailabilityBlock[],
    externalBlocks: (externalEvents ?? []).map((event) => {
      const connection = event.connection as unknown as { source_name?: string } | null;
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
    .select("id, listing_id, source_name, last_synced_at, last_sync_status, last_sync_error, created_at")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load calendar connections.");
  return data ?? [];
}

export async function addHostCalendarConnection(listingId: string, sourceUrl: string, sourceName: string) {
  const { user } = await requireHost();
  const safeUrl = validateExternalCalendarUrl(sourceUrl.trim());
  const safeName = sourceName.trim().replace(/[<>\r\n]/g, "").slice(0, 80) || new URL(safeUrl).hostname;
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
    .insert({ host_id: user.id, listing_id: listingId, source_name: safeName, source_url: safeUrl })
    .select("id")
    .single();
  if (error || !connection) {
    if (error?.code === "23505") throw new Error("This calendar is already connected to the listing.");
    throw new Error("Unable to connect this calendar.");
  }

  let syncMessage: string | null = null;
  try {
    await syncCalendarConnection(connection.id, true);
  } catch (syncError) {
    syncMessage = syncError instanceof Error ? syncError.message : "Calendar connected, but the first sync failed.";
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
    .upsert({ listing_id: listingId, host_id: user.id, token_hash: hashCalendarToken(token) }, { onConflict: "listing_id" });
  if (error) throw new Error("Unable to create a private calendar link.");
  return token;
}

export async function addHostAvailabilityBlock(listingId: string, startDate: string, endDate: string, reason: string) {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data: listing } = await supabase.from("listings").select("id").eq("id", listingId).eq("host_id", user.id).maybeSingle();
  if (!listing || startDate >= endDate) throw new Error("Invalid availability dates.");
  await syncStaleCalendarConnectionsForListing(listingId);
  const [bookingConflict, blockConflict] = await Promise.all([
    supabase
      .from("bookings")
      .select("id")
      .eq("listing_id", listingId)
      .in("status", ["pending", "confirmed"])
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
  if (bookingConflict.error || blockConflict.error) throw new Error("Unable to verify date availability.");
  if (bookingConflict.data?.length) throw new Error("These dates overlap a booking request or confirmed stay.");
  if (blockConflict.data?.length) throw new Error("These dates overlap an existing blocked period.");
  const admin = getSupabaseAdmin();
  const { data: externalConflict, error: externalConflictError } = await admin
    .from("host_external_calendar_events")
    .select("id")
    .eq("host_id", user.id)
    .eq("listing_id", listingId)
    .lt("start_date", endDate)
    .gt("end_date", startDate)
    .limit(1);
  if (externalConflictError) throw new Error("Unable to verify imported calendar dates.");
  if (externalConflict?.length) throw new Error("These dates overlap an imported external booking.");
  const { error } = await supabase.from("listing_availability_blocks").insert({ listing_id: listingId, start_date: startDate, end_date: endDate, reason: reason.trim() || null });
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

