'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/app/lib/supabase/server';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';
import {
  calculateListingAdditionalCharges,
  normalizeListingAdditionalCharges,
} from '@/app/lib/listing-charges';
import { todayISO } from '@/app/lib/format';

type ActionError = { ok: false; error: string };
type CancellationPreview = {
  ok: true;
  paidAmount: number;
  refundPercent: number;
  estimatedRefund: number;
  daysUntilCheckIn: number;
  refundTiming: string;
  listingPolicy: string | null;
};

function isValidISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function cancellationDetails(bookingId: string, guestId: string) {
  const admin = getSupabaseAdmin();
  const { data: booking, error } = await admin
    .from('bookings')
    .select('id, guest_id, host_id, status, check_in, check_out, listing:listings(cancellation_policy, refund_policy)')
    .eq('id', bookingId)
    .eq('guest_id', guestId)
    .maybeSingle();

  if (error || !booking) return { error: 'We couldn’t find that booking.' } as const;
  if (booking.status !== 'confirmed' || booking.check_in <= todayISO()) {
    return { error: 'Only confirmed upcoming stays can be cancelled here.' } as const;
  }

  const { data: payments, error: paymentError } = await admin
    .from('payments')
    .select('amount, status')
    .eq('booking_id', booking.id)
    .in('status', ['paid', 'success']);
  if (paymentError) return { error: 'We couldn’t calculate the payment preview.' } as const;

  const paidAmount = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const daysUntilCheckIn = Math.floor((Date.parse(`${booking.check_in}T00:00:00Z`) - Date.parse(`${todayISO()}T00:00:00Z`)) / 86_400_000);
  const refundPercent = daysUntilCheckIn >= 14 ? 100 : daysUntilCheckIn >= 7 ? 50 : 0;
  const estimatedRefund = Math.round(paidAmount * (refundPercent / 100) * 100) / 100;
  const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;

  return {
    booking,
    paidAmount,
    refundPercent,
    estimatedRefund,
    daysUntilCheckIn,
    listingPolicy: listing?.cancellation_policy || listing?.refund_policy || null,
  } as const;
}

export async function getCancellationPreview(bookingId: string): Promise<CancellationPreview | ActionError> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Your session has expired. Sign in again to continue.' };

  const details = await cancellationDetails(bookingId, user.id);
  if ('error' in details) return { ok: false, error: details.error ?? 'Unable to load cancellation details.' };
  return {
    ok: true,
    paidAmount: details.paidAmount,
    refundPercent: details.refundPercent,
    estimatedRefund: details.estimatedRefund,
    daysUntilCheckIn: details.daysUntilCheckIn,
    refundTiming: 'If approved, allow 3–5 business days after management approval. Refunds are processed manually.',
    listingPolicy: details.listingPolicy,
  };
}

export async function requestBookingCancellation(bookingId: string): Promise<{ ok: true; message: string } | ActionError> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Your session has expired. Sign in again to continue.' };

  const details = await cancellationDetails(bookingId, user.id);
  if ('error' in details) return { ok: false, error: details.error ?? 'Unable to load cancellation details.' };

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('booking_change_requests').insert({
    booking_id: details.booking.id,
    guest_id: user.id,
    host_id: details.booking.host_id,
    request_type: 'cancellation',
    current_check_in: details.booking.check_in,
    current_check_out: details.booking.check_out,
    amount_paid: details.paidAmount,
    refund_percent: details.refundPercent,
    estimated_refund_amount: details.estimatedRefund,
  });

  if (error) {
    return { ok: false, error: error.code === '23505' ? 'There is already an open change or cancellation request for this booking.' : 'We couldn’t submit your cancellation request.' };
  }

  const { error: updateError } = await admin.from('booking_updates').insert({
    booking_id: details.booking.id,
    actor_id: user.id,
    event_type: 'cancellation_requested',
    summary: 'Guest requested cancellation',
    details: { estimated_refund_amount: details.estimatedRefund, refund_percent: details.refundPercent },
  });

  revalidatePath('/account/bookings');
  revalidatePath(`/account/bookings/${bookingId}`);
  revalidatePath('/host/bookings');
  revalidatePath(`/host/bookings/${bookingId}`);
  return { ok: true, message: updateError ? 'Cancellation request sent. The trip timeline could not be updated; contact support if you need help.' : 'Cancellation request sent to the host for approval.' };
}

export async function previewBookingDateChange(input: {
  bookingId: string;
  checkIn: string;
  checkOut: string;
}): Promise<{
  ok: true;
  currentTotal: number;
  quotedTotal: number;
  priceDifference: number;
  minNights: number;
} | ActionError> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Your session has expired. Sign in again to continue.' };
  if (!isValidISODate(input.checkIn) || !isValidISODate(input.checkOut) || input.checkOut <= input.checkIn || input.checkIn <= todayISO()) {
    return { ok: false, error: 'Choose valid future dates, with check-out after check-in.' };
  }

  const admin = getSupabaseAdmin();
  const { data: booking, error } = await admin
    .from('bookings')
    .select('id, guest_id, listing_id, status, check_in, check_out, total_amount, listing:listings(price_per_night, service_fee_percent, platform_fee_per_night, additional_charges, min_nights)')
    .eq('id', input.bookingId)
    .eq('guest_id', user.id)
    .maybeSingle();
  if (error || !booking) return { ok: false, error: 'We couldn’t find that booking.' };
  if (booking.status !== 'confirmed' || booking.check_in <= todayISO()) return { ok: false, error: 'Only confirmed upcoming stays can be changed.' };
  if (input.checkIn === booking.check_in && input.checkOut === booking.check_out) return { ok: false, error: 'Choose dates that are different from your current stay.' };

  const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;
  if (!listing) return { ok: false, error: 'The listing is no longer available.' };
  const nights = Math.floor((Date.parse(`${input.checkOut}T00:00:00Z`) - Date.parse(`${input.checkIn}T00:00:00Z`)) / 86_400_000);
  if (nights < Number(listing.min_nights ?? 1)) return { ok: false, error: `This listing requires at least ${listing.min_nights ?? 1} nights.` };

  const [{ data: overlaps, error: overlapError }, { data: calendarEvents, error: calendarError }, { data: pendingRequests, error: requestError }] = await Promise.all([
    admin.from('bookings').select('id').eq('listing_id', booking.listing_id).in('status', ['pending', 'confirmed']).neq('id', booking.id).lt('check_in', input.checkOut).gt('check_out', input.checkIn).limit(1),
    admin.from('host_external_calendar_events').select('id').eq('listing_id', booking.listing_id).lt('start_date', input.checkOut).gt('end_date', input.checkIn).limit(1),
    admin.from('booking_change_requests').select('id').eq('booking_id', booking.id).eq('status', 'pending').limit(1),
  ]);
  if (overlapError || calendarError || requestError) return { ok: false, error: 'We couldn’t verify the requested dates. Try again.' };
  if (overlaps?.length || calendarEvents?.length) return { ok: false, error: 'Those dates are not available.' };
  if (pendingRequests?.length) return { ok: false, error: 'There is already an open change or cancellation request for this booking.' };

  const hostSubtotal = Number(listing.price_per_night) * nights;
  const serviceFee = listing.platform_fee_per_night == null
    ? hostSubtotal * Number(listing.service_fee_percent ?? 0)
    : Number(listing.platform_fee_per_night) * nights;
  const additionalCharges = calculateListingAdditionalCharges(
    normalizeListingAdditionalCharges(listing.additional_charges),
    nights,
  );
  const quotedTotal = Math.round((hostSubtotal + serviceFee + additionalCharges.total) * 100) / 100;
  return {
    ok: true,
    currentTotal: Number(booking.total_amount),
    quotedTotal,
    priceDifference: Math.round((quotedTotal - Number(booking.total_amount)) * 100) / 100,
    minNights: Number(listing.min_nights ?? 1),
  };
}

export async function requestBookingDateChange(input: {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  reason: string;
}): Promise<{ ok: true; message: string } | ActionError> {
  const preview = await previewBookingDateChange(input);
  if (!preview.ok) return preview;
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Your session has expired. Sign in again to continue.' };

  const admin = getSupabaseAdmin();
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('id, guest_id, host_id, check_in, check_out')
    .eq('id', input.bookingId)
    .eq('guest_id', user.id)
    .maybeSingle();
  if (bookingError || !booking) return { ok: false, error: 'We couldn’t find that booking.' };

  const { error } = await admin.from('booking_change_requests').insert({
    booking_id: booking.id,
    guest_id: user.id,
    host_id: booking.host_id,
    request_type: 'date_change',
    current_check_in: booking.check_in,
    current_check_out: booking.check_out,
    requested_check_in: input.checkIn,
    requested_check_out: input.checkOut,
    quoted_total_amount: preview.quotedTotal,
    reason: input.reason.trim().slice(0, 1000) || null,
  });
  if (error) {
    return { ok: false, error: error.code === '23505' ? 'There is already an open change or cancellation request for this booking.' : 'We couldn’t submit your date-change request.' };
  }

  const { error: updateError } = await admin.from('booking_updates').insert({
    booking_id: booking.id,
    actor_id: user.id,
    event_type: 'date_change_requested',
    summary: 'Guest requested new stay dates',
    details: { check_in: input.checkIn, check_out: input.checkOut, quoted_total_amount: preview.quotedTotal },
  });

  revalidatePath('/account/bookings');
  revalidatePath(`/account/bookings/${booking.id}`);
  revalidatePath('/host/bookings');
  revalidatePath(`/host/bookings/${booking.id}`);
  return { ok: true, message: updateError ? 'Date-change request sent. The trip timeline could not be updated; contact support if you need help.' : 'Date-change request sent to the host for approval.' };
}