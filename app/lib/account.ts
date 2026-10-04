// FILE LOCATION: lib/account.ts
// Put this file at lib/account.ts in your project root (or src/lib/account.ts if your project has a src/ folder).

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/server';
import { todayISO } from '@/app/lib/format';
import { routes } from '@/app/lib/routes';
import { getRequesterSupportUnreadCounts } from '@/app/customer-support/actions';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';
import type { BookingRow, BookingView, Profile } from '@/types/account';
import type { RefundListItem, RefundProgress } from '@/types/refunds';

/** Auth + profile for the current request. Cached, so the layout and page share one lookup. */
export const getAccountContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`${routes.login}?next=/account`);

  // Explicit columns: never pull admin_permissions into the account area.
  const { data } = await supabase
    .from('profiles')
    .select(
      'id, full_name, phone, role, avatar_url, created_at, business_name, id_number, payout_method, payout_details, host_verified_at, kyc_status, kyc_rejection_reason, host_bio, status, suspended_reason',
    )
    .eq('id', user.id)
    .maybeSingle();

  const profile = data as Profile | null;
  if (!profile) redirect(`${routes.login}?error=no-profile`);

  return { supabase, user, profile };
});

const BOOKING_SELECT = `
  id, booking_reference, listing_id, check_in, check_out, guests_count, children_count, pets_count, rooms_count,
  status, total_amount, special_requests, created_at,
  listing:listings ( id, title, slug, town, county, check_in_time, listing_images ( url, sort_order ) )
`;

export const getGuestBookings = cache(async (userId: string) => {
  const { supabase, user } = await getAccountContext();

  const [bookingsRes, reviewsRes, hostReviewsRes, requestsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('guest_id', userId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('reviews').select('booking_id').eq('guest_id', userId),
    supabase.from('host_reviews').select('booking_id').eq('guest_id', userId),
    supabase
      .from('booking_change_requests')
      .select('id, booking_id, request_type, status, current_check_in, current_check_out, requested_check_in, requested_check_out, quoted_total_amount, amount_paid, refund_percent, estimated_refund_amount, refund_processing_status, refund_admin_response, actual_refund_amount, refund_processed_at, host_response, auto_decision_at, decision_source, created_at')
      .eq('guest_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  if (bookingsRes.error) throw new Error(bookingsRes.error.message);
  if (requestsRes.error) throw new Error(requestsRes.error.message);

  const reviewed = new Set((reviewsRes.data ?? []).map((r) => r.booking_id as string));
  const hostReviewed = new Set((hostReviewsRes.data ?? []).map((r) => r.booking_id as string));
  const bookingIds = (bookingsRes.data ?? []).map((booking) => booking.id);
  const admin = getSupabaseAdmin();
  const [unreadByBooking, refundRequestsResult] = await Promise.all([
    getRequesterSupportUnreadCounts(user.id, bookingIds),
    bookingIds.length
      ? admin
        .from('payment_refund_requests')
        .select('id, payment_id, booking_id, status, amount_paid, actual_refund_amount, created_at, updated_at, processed_at')
        .eq('guest_id', user.id)
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (refundRequestsResult.error) {
    console.error('Unable to load guest refund progress:', refundRequestsResult.error);
  }
  const refundRequestsByBooking = new Map<string, RefundProgress[]>();
  for (const refund of (refundRequestsResult.error ? [] : refundRequestsResult.data ?? []) as RefundProgress[]) {
    const requests = refundRequestsByBooking.get(refund.booking_id) ?? [];
    requests.push(refund);
    refundRequestsByBooking.set(refund.booking_id, requests);
  }
  const requestByBooking = new Map<string, (typeof requestsRes.data)[number]>();
  for (const request of requestsRes.data ?? []) {
    if (!requestByBooking.has(request.booking_id)) requestByBooking.set(request.booking_id, request);
  }
  const today = todayISO();
  const rows = (bookingsRes.data ?? []) as unknown as BookingRow[];

  const all: BookingView[] = rows.map((b) => {
    let phase: BookingView['phase'];
    let expired = false;
    if (b.status === 'cancelled') phase = 'cancelled';
    else if (b.check_out > today) phase = 'upcoming';
    else if (b.status === 'pending') {
      phase = 'cancelled';
      expired = true;
    } else phase = 'past';
    return {
      ...b,
      phase,
      expired,
      reviewed: reviewed.has(b.id),
      hostReviewed: hostReviewed.has(b.id),
      changeRequest: requestByBooking.get(b.id) ?? null,
      unreadSupportReplyCount: unreadByBooking[b.id] ?? 0,
      refundRequests: refundRequestsByBooking.get(b.id) ?? [],
    };
  });

  const newestStayFirst = (a: BookingView, b: BookingView) => b.check_in.localeCompare(a.check_in);

  return {
    all,
    upcoming: all.filter((b) => b.phase === 'upcoming').sort((a, b) => a.check_in.localeCompare(b.check_in)),
    past: all.filter((b) => b.phase === 'past').sort(newestStayFirst),
    cancelled: all.filter((b) => b.phase === 'cancelled').sort(newestStayFirst),
    reviewedCount: reviewed.size,
  };
});

export async function getGuestRefundsData(): Promise<RefundListItem[]> {
  const { user } = await getAccountContext();
  const admin = getSupabaseAdmin();
  const [paymentResult, cancellationResult] = await Promise.all([
    admin
      .from('payment_refund_requests')
      .select('id, payment_id, booking_id, status, amount_paid, actual_refund_amount, created_at, updated_at, processed_at')
      .eq('guest_id', user.id)
      .order('created_at', { ascending: false }),
    admin
      .from('booking_change_requests')
      .select('id, booking_id, amount_paid, estimated_refund_amount, refund_processing_status, actual_refund_amount, created_at, responded_at, refund_decided_at, refund_processed_at')
      .eq('guest_id', user.id)
      .eq('request_type', 'cancellation')
      .eq('status', 'approved')
      .in('refund_processing_status', ['awaiting_admin_review', 'awaiting_manual_processing', 'declined', 'processed', 'not_eligible'])
      .order('created_at', { ascending: false }),
  ]);
  if (paymentResult.error || cancellationResult.error) {
    console.error('Unable to load guest refund section:', paymentResult.error ?? cancellationResult.error);
    throw new Error('Unable to load your refunds. Please try again.');
  }

  const refunds: RefundProgress[] = [
    ...((paymentResult.data ?? []) as RefundProgress[]).map((refund) => ({ ...refund, source: 'payment' as const })),
    ...(cancellationResult.data ?? []).map((refund) => ({
      id: refund.id,
      booking_id: refund.booking_id,
      payment_id: null,
      source: 'cancellation' as const,
      status: refund.refund_processing_status as RefundProgress['status'],
      amount_paid: refund.amount_paid,
      estimated_refund_amount: refund.estimated_refund_amount,
      actual_refund_amount: refund.actual_refund_amount,
      created_at: refund.created_at,
      updated_at: refund.refund_processed_at ?? refund.refund_decided_at ?? refund.responded_at ?? refund.created_at,
      processed_at: refund.refund_processed_at,
    })),
  ];
  if (!refunds.length) return [];

  const bookingIds = [...new Set(refunds.map((refund) => refund.booking_id))];
  const { data: bookings, error: bookingError } = await admin
    .from('bookings')
    .select('id, booking_reference, listing:listings(title)')
    .eq('guest_id', user.id)
    .in('id', bookingIds);
  if (bookingError) throw new Error('Unable to load booking details for your refunds.');

  const bookingById = new Map((bookings ?? []).map((row) => {
    const booking = row as unknown as {
      id: string;
      booking_reference: string;
      listing: { title: string } | Array<{ title: string }> | null;
    };
    const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;
    return [booking.id, { booking_reference: booking.booking_reference, listing_title: listing?.title ?? null }];
  }));

  return refunds
    .map((refund) => ({ ...refund, ...bookingById.get(refund.booking_id) }))
    .filter((refund): refund is RefundListItem => Boolean(refund.booking_reference))
    .sort((first, second) => Date.parse(second.updated_at ?? second.created_at) - Date.parse(first.updated_at ?? first.created_at));
}