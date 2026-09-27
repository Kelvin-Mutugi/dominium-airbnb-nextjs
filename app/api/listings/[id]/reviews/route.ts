import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ reviews: [] }, { status: 200 });

  const admin = getSupabaseAdmin();
  const { data: reviews, error } = await admin
    .from('reviews')
    .select('id, guest_id, booking_id, rating, cleanliness_rating, accuracy_rating, location_rating, communication_rating, comment, created_at')
    .eq('listing_id', id)
    .eq('moderation_status', 'published')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: 'Unable to load listing reviews.' }, { status: 500 });

  const guestIds = [...new Set((reviews ?? []).map((review) => review.guest_id).filter(Boolean))];
  const bookingIds = [...new Set((reviews ?? []).map((review) => review.booking_id).filter(Boolean))];
  const [{ data: guests, error: guestError }, { data: bookings, error: bookingError }] = await Promise.all([
    guestIds.length ? admin.from('profiles').select('id, full_name').in('id', guestIds) : Promise.resolve({ data: [], error: null }),
    bookingIds.length ? admin.from('bookings').select('id, status, check_out').in('id', bookingIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (guestError || bookingError) return NextResponse.json({ error: 'Unable to load listing reviews.' }, { status: 500 });

  const names = new Map((guests ?? []).map((guest) => [guest.id, guest.full_name]));
  const today = new Date().toISOString().slice(0, 10);
  const completedBookingIds = new Set((bookings ?? [])
    .filter((booking) => booking.status === 'completed' && booking.check_out <= today)
    .map((booking) => booking.id));
  return NextResponse.json({
    reviews: (reviews ?? []).map((review) => ({
      id: review.id,
      guestName: names.get(review.guest_id) ?? 'Guest',
      rating: Number(review.rating),
      comment: review.comment ?? '',
      date: review.created_at,
      cleanlinessRating: Number(review.cleanliness_rating),
      accuracyRating: Number(review.accuracy_rating),
      locationRating: Number(review.location_rating),
      communicationRating: Number(review.communication_rating),
      verifiedStay: completedBookingIds.has(review.booking_id),
    })),
  }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } });
}