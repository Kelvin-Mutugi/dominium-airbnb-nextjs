import { createClient } from '@/app/lib/supabase/server';
import { requireHost } from '@/app/lib/host-auth';
import { formatDate, humanize } from '@/app/lib/format';
import { Stars } from '@/components/account/ui';

type HostReview = {
  id: string;
  booking_id: string;
  rating: number;
  comment: string | null;
  moderation_status: string;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800',
  published: 'bg-emerald-50 text-emerald-800',
  hidden: 'bg-gray-100 text-gray-700',
};

export default async function HostReviewsPage() {
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('host_reviews')
    .select('id, booking_id, rating, comment, moderation_status, created_at')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error('Unable to load host reviews.');

  const reviews = (data ?? []) as HostReview[];
  const visibleReviews = reviews.filter((review) => review.moderation_status === 'published');
  const average = visibleReviews.length
    ? visibleReviews.reduce((total, review) => total + review.rating, 0) / visibleReviews.length
    : null;

  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ec1561]">Guest feedback</p>
        <h1 className="mt-1 text-2xl font-bold text-[#12231d]">Reviews about you</h1>
          <p className="mt-1 text-sm text-gray-500">Reviews are tied to completed stays and checked before they appear publicly. Showing the latest 100.</p>
      </header>

      <div className="flex flex-wrap items-center gap-5 border-y py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Published reviews</p>
          <p className="mt-1 text-2xl font-semibold text-[#12231d]">{visibleReviews.length}</p>
        </div>
        <div className="h-10 w-px bg-gray-200" />
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Average host rating</p>
          <p className="mt-1 text-2xl font-semibold text-[#12231d]">{average === null ? '—' : average.toFixed(1)}</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="border-b py-10 text-center text-sm text-gray-500">Guests can review you after their stay is complete. Reviews will appear here.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {reviews.map((review) => (
            <li key={review.id} className="py-5">
              <div className="flex flex-wrap items-center gap-3">
                <Stars rating={review.rating} />
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[review.moderation_status] ?? STATUS_STYLES.pending}`}>
                  {humanize(review.moderation_status)}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">{formatDate(review.created_at, 'long')} · stay {review.booking_id.slice(0, 8)}</p>
              {review.comment ? (
                <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-gray-700">{review.comment}</p>
              ) : (
                <p className="mt-3 text-sm italic text-gray-400">No written comment.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}