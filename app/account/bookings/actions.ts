// FILE LOCATION: app/account/bookings/actions.ts
// Put this file at app/account/bookings/actions.ts in your project root (or src/app/account/bookings/actions.ts if your project has a src/ folder).

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/app/lib/supabase/server';
import { todayISO } from '@/app/lib/format';
import type { ActionResult } from '@/types/account';

const SESSION_EXPIRED = 'Your session has expired. Sign in again to continue.';

export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };

  // Guests can only cancel their own bookings that are still unpaid.
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .eq('status', 'pending')
    .select('id');

  if (error) return { ok: false, error: 'We couldn’t cancel this booking. Try again in a moment.' };
  if (!data?.length) {
    return { ok: false, error: 'Only unpaid bookings can be cancelled here. Contact support for confirmed bookings.' };
  }

  revalidatePath('/account', 'layout');
  return { ok: true, message: 'Booking cancelled.' };
}

export async function submitReview(input: {
  bookingId: string;
  rating: number;
  comment: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };

  const rating = Math.round(Number(input.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Choose a rating from 1 to 5 stars.' };
  }
  const comment = (input.comment ?? '').trim().slice(0, 2000);

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, listing_id, status, check_out')
    .eq('id', input.bookingId)
    .eq('guest_id', user.id)
    .maybeSingle();

  if (!booking) return { ok: false, error: 'We couldn’t find that booking.' };
  if (booking.status === 'pending' || booking.status === 'cancelled' || booking.check_out > todayISO()) {
    return { ok: false, error: 'You can review a stay once you’ve checked out.' };
  }

  const { error } = await supabase.from('reviews').insert({
    listing_id: booking.listing_id,
    booking_id: booking.id,
    guest_id: user.id,
    rating,
    comment: comment || null,
  });

  if (error) {
    return {
      ok: false,
      error: error.code === '23505' ? 'You’ve already reviewed this stay.' : 'We couldn’t save your review. Try again.',
    };
  }

  revalidatePath('/account', 'layout');
  return { ok: true, message: 'Review posted.' };
}

export async function submitHostReview(input: {
  bookingId: string;
  rating: number;
  comment: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };

  const rating = Math.round(Number(input.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Choose a rating from 1 to 5 stars.' };
  }
  const comment = (input.comment ?? '').trim().slice(0, 2000);
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, host_id, status, check_out')
    .eq('id', input.bookingId)
    .eq('guest_id', user.id)
    .maybeSingle();

  if (!booking) return { ok: false, error: 'We couldn’t find that booking.' };
  if (booking.status === 'pending' || booking.status === 'cancelled' || booking.check_out > todayISO()) {
    return { ok: false, error: 'You can review the host once your stay is complete.' };
  }
  if (!booking.host_id || booking.host_id === user.id) {
    return { ok: false, error: 'This booking has no eligible host to review.' };
  }

  const { error } = await supabase.from('host_reviews').insert({
    booking_id: booking.id,
    guest_id: user.id,
    host_id: booking.host_id,
    rating,
    comment: comment || null,
    moderation_status: 'pending',
  });
  if (error) {
    return {
      ok: false,
      error: error.code === '23505' ? 'You’ve already reviewed this host for the stay.' : 'We couldn’t save your host review. Try again.',
    };
  }

  revalidatePath('/account', 'layout');
  revalidatePath('/host/reviews');
  revalidatePath('/admin/reviews');
  return { ok: true, message: 'Host review sent for moderation.' };
}