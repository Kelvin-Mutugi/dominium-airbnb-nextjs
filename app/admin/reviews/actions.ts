'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/app/lib/admin-auth';
import { recordAdminAuditEvent } from '@/app/lib/admin-audit';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';

export async function moderateReview(formData: FormData) {
  const actor = await requireAdmin();
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
  const { data: previous, error: lookupError } = await admin
    .from(table)
    .select('moderation_status')
    .eq('id', reviewId)
    .maybeSingle();
  if (lookupError || !previous) throw new Error('Review not found.');

  const { data: updatedReview, error } = await admin
    .from(table)
    .update({ moderation_status: moderationStatus })
    .eq('id', reviewId)
    .eq('moderation_status', previous.moderation_status)
    .select('id')
    .maybeSingle();
  if (error) throw new Error('Unable to update review moderation status.');
  if (!updatedReview) throw new Error('Review moderation changed. Refresh and try again.');

  await recordAdminAuditEvent({
    actorId: actor.id,
    action: 'review.moderated',
    entityType: 'review',
    entityId: reviewId,
    summary: `${reviewType === 'host' ? 'Host' : 'Listing'} review moderation updated.`,
    before: { moderation_status: previous.moderation_status },
    after: { moderation_status: moderationStatus },
  });

  revalidatePath('/admin/reviews');
  revalidatePath('/host/reviews');
  revalidatePath('/account/reviews');
  revalidatePath('/apartments/[id]', 'page');
}