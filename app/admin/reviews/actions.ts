'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/app/lib/admin-auth';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';

export async function moderateReview(formData: FormData) {
  await requireAdmin();
  const reviewId = String(formData.get('review_id') ?? '');
  const reviewType = String(formData.get('review_type') ?? '');
  const moderationStatus = String(formData.get('moderation_status') ?? '');

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reviewId)) {
    throw new Error('Invalid review.');
  }
  if (!['listing', 'host'].includes(reviewType) || !['published', 'hidden'].includes(moderationStatus)) {
    throw new Error('Invalid moderation decision.');
  }

  const admin = getSupabaseAdmin();
  const table = reviewType === 'host' ? 'host_reviews' : 'reviews';
  const { error } = await admin
    .from(table)
    .update({ moderation_status: moderationStatus })
    .eq('id', reviewId);
  if (error) throw new Error('Unable to update review moderation status.');

  revalidatePath('/admin/reviews');
  revalidatePath('/host/reviews');
  revalidatePath('/account/reviews');
  revalidatePath('/apartments/[id]', 'page');
}