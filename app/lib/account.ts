// FILE LOCATION: lib/account.ts
// Put this file at lib/account.ts in your project root (or src/lib/account.ts if your project has a src/ folder).

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/server';
import { todayISO } from '@/app/lib/format';
import { routes } from '@/app/lib/routes';
import type { BookingRow, BookingView, Profile } from '@/types/account';

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
  id, listing_id, check_in, check_out, guests_count, children_count, rooms_count,
  status, total_amount, special_requests, created_at,
  listing:listings ( id, title, slug, town, county, check_in_time, listing_images ( url, sort_order ) )
`;

export const getGuestBookings = cache(async (userId: string) => {
  const { supabase } = await getAccountContext();

  const [bookingsRes, reviewsRes, hostReviewsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('guest_id', userId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('reviews').select('booking_id').eq('guest_id', userId),
    supabase.from('host_reviews').select('booking_id').eq('guest_id', userId),
  ]);

  if (bookingsRes.error) throw new Error(bookingsRes.error.message);

  const reviewed = new Set((reviewsRes.data ?? []).map((r) => r.booking_id as string));
  const hostReviewed = new Set((hostReviewsRes.data ?? []).map((r) => r.booking_id as string));
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
    return { ...b, phase, expired, reviewed: reviewed.has(b.id), hostReviewed: hostReviewed.has(b.id) };
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