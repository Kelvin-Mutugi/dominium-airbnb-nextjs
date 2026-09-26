// lib/host/types.ts
// Mirrors the Supabase schema (+ the additions in sql/001_host_panel_schema.sql)

export type ListingStatus = "draft" | "published" | "suspended" | "archived";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PayoutStatus = "owed" | "paid" | "processing";

export interface Listing {
  id: string;
  host_id: string;
  title: string;
  description: string;
  county: string;
  town: string;
  address: string | null;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  features: string[];
  house_rules: string[];
  status: ListingStatus;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  check_in_time: string;
  check_out_time: string;
  min_nights: number;
  service_fee_percent: number;
  cancellation_policy: string | null;
  booking_terms: string | null;
  refund_policy: string | null;
  is_rare_find: boolean;
  rare_find_note: string | null;
  average_rating: number;
  review_count: number;
  is_feartured: boolean; // NB: typo exists in the live schema, kept as-is
  instant_book: boolean;
  is_publish_ready: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  url: string;
  sort_order: number;
}

export interface AvailabilityBlock {
  id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export interface Booking {
  id: string;
  listing_id: string;
  guest_id: string | null;
  host_id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  children_count: number;
  rooms_count: number;
  status: BookingStatus;
  total_amount: number;
  commission_amount: number;
  host_payout_amount: number;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  special_requests: string | null;
  created_at: string;
  // joined
  listing?: Pick<Listing, "id" | "title" | "town" | "county">;
}

export interface Payout {
  id: string;
  host_id: string;
  booking_id: string;
  amount: number;
  status: PayoutStatus;
  paid_at: string | null;
  created_at: string;
  booking?: Pick<
    Booking,
    | "check_in"
    | "check_out"
    | "guests_count"
    | "total_amount"
    | "host_payout_amount"
    | "guest_name"
    | "guest_email"
    | "guest_phone"
  > & {
    listing?: Pick<Listing, "id" | "title" | "town" | "county">;
  };
}

export interface HostDashboardStats {
  host_id: string;
  active_listings: number;
  draft_listings: number;
  pending_bookings: number;
  upcoming_bookings: number;
  balance_owed: number;
  lifetime_paid_out: number;
}

// Form-only shape used by the create/edit listing form
export interface ListingFormValues {
  title: string;
  description: string;
  county: string;
  town: string;
  address: string;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  features: string[];
  house_rules: string[];
  check_in_time: string;
  check_out_time: string;
  min_nights: number;
  instant_book: boolean;
  cancellation_policy: string;
}
