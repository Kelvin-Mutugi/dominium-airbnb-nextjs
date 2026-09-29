// lib/host/queries.ts
// Thin wrappers around Supabase for everything the host panel needs.
// Swap `supabase` for your existing client import — this file assumes
// you already have one at "@/lib/supabase/client" (browser) as set up
// in your project.

import { supabase } from "@/app/lib/supabase/client";
import type {
  Listing,
  Booking,
  Payout,
  HostDashboardStats,
  AvailabilityBlock,
  BookingStatus,
} from "./types";

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
