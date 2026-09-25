// FILE LOCATION: app/account/reviews/page.tsx
// Put this file at app/account/reviews/page.tsx in your project root (or src/app/account/reviews/page.tsx if your project has a src/ folder).

import Link from 'next/link';
import { getAccountContext, getGuestBookings } from '@/app/lib/account';
import { formatDate, humanize } from '@/app/lib/format';
import { routes } from '@/app/lib/routes';
import { HostReviewButton, ReviewButton } from '@/components/account/BookingActions';
import { EmptyState, PageHeader, Section, Stars } from '@/components/account/ui';
import type { ReviewRow } from '@/types/account';

export default async function ReviewsPage() {
  const { supabase, user } = await getAccountContext();
  const { past } = await getGuestBookings(user.id);
  const awaiting = past.filter((b) => !b.reviewed || !b.hostReviewed);

  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, moderation_status, listing:listings ( title, slug )')
    .eq('guest_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const reviews = (data ?? []) as unknown as ReviewRow[];
  const { data: hostReviewData, error: hostReviewError } = await supabase
    .from('host_reviews')
    .select('id, rating, comment, created_at, moderation_status, host:profiles!host_reviews_host_id_fkey ( full_name )')
    .eq('guest_id', user.id)
    .order('created_at', { ascending: false });
  if (hostReviewError) throw new Error(hostReviewError.message);
  const hostReviews = (hostReviewData ?? []) as unknown as Array<{
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    moderation_status: string;
    host: { full_name: string } | Array<{ full_name: string }> | null;
  }>;

  return (
    <>
      <PageHeader title="Reviews" description="Help future guests by sharing how your stays went." />

      {awaiting.length > 0 && (
        <Section title="Waiting for your review" description="Stays you’ve checked out of.">
          <ul className="divide-y divide-neutral-200">
            {awaiting.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">{b.listing?.title ?? 'Your stay'}</p>
                  <p className="text-sm text-neutral-500">
                    {formatDate(b.check_in, 'noYear')} to {formatDate(b.check_out, 'short')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!b.reviewed && <ReviewButton bookingId={b.id} listingTitle={b.listing?.title ?? 'your stay'} />}
                  {!b.hostReviewed && <HostReviewButton bookingId={b.id} />}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Your listing reviews" description="Your feedback about the stay and listing.">
        {reviews.length === 0 ? (
          <EmptyState
            title="You haven’t reviewed a stay yet"
            body="After you check out, you’ll be able to leave a rating and a few words here."
            href={routes.listings}
            cta="Browse stays"
          />
        ) : (
          <ul className="divide-y divide-neutral-200">
            {reviews.map((r) => (
              <li key={r.id} className="py-5 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-medium text-neutral-900">
                    {r.listing ? (
                      <Link href={routes.listing(r.listing.slug)} className="hover:underline">
                        {r.listing.title}
                      </Link>
                    ) : (
                      'Listing unavailable'
                    )}
                  </p>
                  <Stars rating={r.rating} />
                </div>
                <p className="mt-0.5 text-xs text-neutral-400">{formatDate(r.created_at, 'long')}</p>
                <p className="mt-1 text-xs font-medium text-neutral-500">{r.moderation_status === 'published' ? 'Published' : humanize(r.moderation_status ?? 'pending moderation')}</p>
                {r.comment && <p className="mt-2 max-w-prose leading-relaxed text-neutral-700">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Your host reviews" description="Your feedback about hosts you’ve stayed with.">
        {hostReviews.length === 0 ? (
          <p className="text-sm text-neutral-500">You haven’t reviewed a host yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {hostReviews.map((review) => {
              const host = Array.isArray(review.host) ? review.host[0] : review.host;
              return (
                <li key={review.id} className="py-5 first:pt-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-medium text-neutral-900">{host?.full_name ?? 'Host'}</p>
                    <Stars rating={review.rating} />
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">{formatDate(review.created_at, 'long')} · {humanize(review.moderation_status)}</p>
                  {review.comment && <p className="mt-2 max-w-prose leading-relaxed text-neutral-700">{review.comment}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}