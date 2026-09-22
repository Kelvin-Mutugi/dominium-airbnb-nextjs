// FILE LOCATION: types/account.ts
// Put this file at types/account.ts in your project root (or src/types/account.ts if your project has a src/ folder).

/**
 * Enum columns come through as plain strings. The values below are what this
 * code assumes; adjust the comparisons if your Postgres enums differ:
 *   user_role       guest | host | admin
 *   user_status     active | suspended
 *   booking_status  pending | confirmed | completed | cancelled
 *   payment_status  pending | paid (or success) | failed | refunded
 *   payout_status   owed | paid
 *   payout_method   mpesa | bank
 */
export type UserRole = string;
export type UserStatus = string;
export type BookingStatus = string;
export type PaymentStatus = string;
export type PayoutStatus = string;
export type PayoutMethod = string;

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  business_name: string | null;
  id_number: string | null;
  payout_method: PayoutMethod | null;
  payout_details: Record<string, string> | null;
  host_verified_at: string | null;
  host_bio: string | null;
  status: UserStatus;
  suspended_reason: string | null;
}

export interface BookingListing {
  id: string;
  title: string;
  slug: string;
  town: string;
  county: string;
  check_in_time: string;
  listing_images: { url: string; sort_order: number }[];
}

export interface BookingRow {
  id: string;
  listing_id: string;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  guests_count: number;
  children_count: number;
  rooms_count: number;
  status: BookingStatus;
  total_amount: number;
  special_requests: string | null;
  created_at: string;
  listing: BookingListing | null;
}

export interface BookingView extends BookingRow {
  /** cancelled also holds bookings that never got confirmed and whose dates have passed */
  phase: 'upcoming' | 'past' | 'cancelled';
  expired: boolean;
  reviewed: boolean;
}

export interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  payment_channel: string | null;
  provider: string;
  provider_reference: string | null;
  paid_at: string | null;
  created_at: string;
  authorization_url: string | null;
  booking: {
    id: string;
    check_in: string;
    check_out: string;
    listing: { title: string; slug: string } | null;
  } | null;
}

export interface PayoutRow {
  id: string;
  amount: number;
  status: PayoutStatus;
  paid_at: string | null;
  created_at: string;
  booking: {
    check_in: string;
    check_out: string;
    listing: { title: string } | null;
  } | null;
}

export interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  listing: { title: string; slug: string } | null;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };