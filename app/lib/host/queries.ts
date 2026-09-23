// lib/host/queries.ts
// Thin wrappers around Supabase for everything the host panel needs.
// Swap `supabase` for your existing client import — this file assumes
// you already have one at "@/lib/supabase/client" (browser) as set up
// in your project.

import { supabase } from "@/app/lib/supabase/client";
import type {
  Listing,
  ListingImage,
  ListingFormValues,
  Booking,
  Payout,
  HostDashboardStats,
  AvailabilityBlock,
  BookingStatus,
} from "./types";

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
export async function getHostDashboardStats(hostId: string): Promise<HostDashboardStats | null> {
  const { data, error } = await supabase
    .from("host_dashboard_stats")
    .select("*")
    .eq("host_id", hostId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------
export async function getHostListings(hostId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_images(id, url, sort_order)")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as Listing[];
}

export async function getListingById(id: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_images(id, url, sort_order)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createListing(hostId: string, values: ListingFormValues) {
  const { data, error } = await supabase
    .from("listings")
    .insert({
      host_id: hostId,
      slug: slugify(values.title),
      status: "draft",
      ...values,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Listing;
}

export async function updateListing(id: string, values: Partial<ListingFormValues>) {
  const { data, error } = await supabase
    .from("listings")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Listing;
}

export async function setListingStatus(id: string, status: Listing["status"]) {
  const patch: Record<string, unknown> = { status };
  if (status === "published") patch.last_published_at = new Date().toISOString();
  const { error } = await supabase.from("listings").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteListing(id: string) {
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Listing images (storage bucket: "listing-images", folder = host id)
// ---------------------------------------------------------------------
export async function uploadListingImage(hostId: string, listingId: string, file: File, sortOrder: number) {
  const path = `${hostId}/${listingId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("listing-images").upload(path, file);
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from("listing-images").getPublicUrl(path);

  const { data, error } = await supabase
    .from("listing_images")
    .insert({ listing_id: listingId, url: publicUrl.publicUrl, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as ListingImage;
}

export async function deleteListingImage(imageId: string) {
  const { error } = await supabase.from("listing_images").delete().eq("id", imageId);
  if (error) throw error;
}

export async function reorderListingImages(images: { id: string; sort_order: number }[]) {
  await Promise.all(
    images.map((img) =>
      supabase.from("listing_images").update({ sort_order: img.sort_order }).eq("id", img.id)
    )
  );
}

// ---------------------------------------------------------------------
// Availability blocks
// ---------------------------------------------------------------------
export async function getAvailabilityBlocks(listingId: string): Promise<AvailabilityBlock[]> {
  const { data, error } = await supabase
    .from("listing_availability_blocks")
    .select("*")
    .eq("listing_id", listingId)
    .order("start_date");
  if (error) throw error;
  return data;
}

export async function addAvailabilityBlock(listingId: string, start_date: string, end_date: string, reason: string) {
  const { error } = await supabase
    .from("listing_availability_blocks")
    .insert({ listing_id: listingId, start_date, end_date, reason });
  if (error) throw error;
}

export async function removeAvailabilityBlock(id: string) {
  const { error } = await supabase.from("listing_availability_blocks").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------
export async function getHostBookings(hostId: string, status?: BookingStatus): Promise<Booking[]> {
  let query = supabase
    .from("bookings")
    .select("*, listing:listings(id, title, town, county)")
    .eq("host_id", hostId)
    .order("check_in", { ascending: true });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Booking[];
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------
export async function getHostPayouts(hostId: string): Promise<Payout[]> {
  const { data, error } = await supabase
    .from("payouts")
    .select("*, booking:bookings(check_in, check_out)")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as Payout[];
}
