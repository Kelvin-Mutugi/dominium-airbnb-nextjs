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
  let { data: reviews, error } = await admin
    .from('reviews')
    .select('id, guest_id, rating, comment, created_at')
    .eq('listing_id', id)
    .eq('moderation_status', 'published')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error?.code === '42703') {
    const legacyResult = await admin
      .from('reviews')
      .select('id, guest_id, rating, comment, created_at')
      .eq('listing_id', id)
      .order('created_at', { ascending: false })
      .limit(50);
    reviews = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) return NextResponse.json({ error: 'Unable to load listing reviews.' }, { status: 500 });

  const guestIds = [...new Set((reviews ?? []).map((review) => review.guest_id).filter(Boolean))];
  const { data: guests, error: guestError } = guestIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', guestIds)
    : { data: [], error: null };
  if (guestError) return NextResponse.json({ error: 'Unable to load listing reviews.' }, { status: 500 });

  const names = new Map((guests ?? []).map((guest) => [guest.id, guest.full_name]));
  return NextResponse.json({
    reviews: (reviews ?? []).map((review) => ({
      id: review.id,
      guestName: names.get(review.guest_id) ?? 'Guest',
      rating: Number(review.rating),
      comment: review.comment ?? '',
      date: review.created_at,
    })),
  }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } });
}