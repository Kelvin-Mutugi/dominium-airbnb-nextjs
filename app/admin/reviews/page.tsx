import Link from 'next/link';
import { formatDate, humanize } from '@/app/lib/format';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';
import { moderateReview } from './actions';

type ListingReview = {
  id: string;
  listing_id: string;
  guest_id: string;
  booking_id: string;
  rating: number;
  comment: string | null;
  moderation_status: string;
  created_at: string;
};

type HostReview = {
  id: string;
  host_id: string;
  guest_id: string;
  booking_id: string;
  rating: number;
  comment: string | null;
  moderation_status: string;
  created_at: string;
};

type ReviewItem = {
  id: string;
  type: 'listing' | 'host';
  target: string;
  targetHref: string | null;
  guest: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
};

type Profile = { id: string; full_name: string | null };
type Listing = { id: string; title: string | null };
type Booking = { id: string; listing_id: string; guest_name: string | null; guest_id: string | null };

const FILTERS = ['pending', 'published', 'hidden', 'all'];
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800',
  published: 'bg-emerald-50 text-emerald-800',
  hidden: 'bg-gray-100 text-gray-700',
};

function hrefFor(status: string, query: string) {
  const params = new URLSearchParams();
  if (status !== 'pending') params.set('status', status);
  if (query) params.set('q', query);
  return `/admin/reviews${params.size ? `?${params.toString()}` : ''}`;
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = FILTERS.includes(params.status ?? 'pending') ? params.status ?? 'pending' : 'pending';
  const query = (params.q ?? '').trim().slice(0, 100).toLowerCase();
  const admin = getSupabaseAdmin();
  const [listingResult, hostResult] = await Promise.all([
    admin.from('reviews').select('id, listing_id, guest_id, booking_id, rating, comment, moderation_status, created_at').order('created_at', { ascending: false }).limit(250),
    admin.from('host_reviews').select('id, host_id, guest_id, booking_id, rating, comment, moderation_status, created_at').order('created_at', { ascending: false }).limit(250),
  ]);
  if (listingResult.error || hostResult.error) {
    throw new Error('Unable to load reviews. Apply the host reviews and moderation migration, then retry.');
  }

  const listingReviews = (listingResult.data ?? []) as ListingReview[];
  const hostReviews = (hostResult.data ?? []) as HostReview[];
  const profilesIds = [...new Set([...listingReviews.map((review) => review.guest_id), ...hostReviews.flatMap((review) => [review.guest_id, review.host_id])].filter(Boolean))];
  const listingIds = [...new Set(listingReviews.map((review) => review.listing_id).filter(Boolean))];
  const bookingIds = [...new Set([...listingReviews.map((review) => review.booking_id), ...hostReviews.map((review) => review.booking_id)].filter(Boolean))];
  const [{ data: profileData, error: profileError }, { data: listingData, error: listingError }, { data: bookingData, error: bookingError }] = await Promise.all([
    profilesIds.length ? admin.from('profiles').select('id, full_name').in('id', profilesIds) : Promise.resolve({ data: [], error: null }),
    listingIds.length ? admin.from('listings').select('id, title').in('id', listingIds) : Promise.resolve({ data: [], error: null }),
    bookingIds.length ? admin.from('bookings').select('id, listing_id, guest_name, guest_id').in('id', bookingIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profileError || listingError || bookingError) throw new Error('Unable to load review details.');

  const profileById = new Map(((profileData ?? []) as Profile[]).map((profile) => [profile.id, profile.full_name]));
  const listingById = new Map(((listingData ?? []) as Listing[]).map((listing) => [listing.id, listing.title]));
  const bookingById = new Map(((bookingData ?? []) as Booking[]).map((booking) => [booking.id, booking]));
  const items: ReviewItem[] = [
    ...listingReviews.map((review) => ({
      id: review.id,
      type: 'listing' as const,
      target: listingById.get(review.listing_id) ?? 'Listing unavailable',
      targetHref: `/admin/listings/${review.listing_id}`,
      guest: profileById.get(review.guest_id) ?? bookingById.get(review.booking_id)?.guest_name ?? 'Guest unavailable',
      bookingId: review.booking_id,
      rating: review.rating,
      comment: review.comment,
      status: review.moderation_status,
      createdAt: review.created_at,
    })),
    ...hostReviews.map((review) => ({
      id: review.id,
      type: 'host' as const,
      target: profileById.get(review.host_id) ?? 'Host unavailable',
      targetHref: null,
      guest: profileById.get(review.guest_id) ?? bookingById.get(review.booking_id)?.guest_name ?? 'Guest unavailable',
      bookingId: review.booking_id,
      rating: review.rating,
      comment: review.comment,
      status: review.moderation_status,
      createdAt: review.created_at,
    })),
  ];
  const visibleItems = items
    .filter((item) => status === 'all' || item.status === status)
    .filter((item) => !query || [item.target, item.guest, item.comment, item.bookingId, item.type].filter(Boolean).join(' ').toLowerCase().includes(query))
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Reviews Moderation</h1>
        <p className="mt-1 text-sm text-gray-600">Review guest feedback before it appears publicly on listings or host profiles.</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
        <nav aria-label="Review moderation status" className="flex flex-wrap gap-1">
          {FILTERS.map((filter) => (
            <Link key={filter} href={hrefFor(filter, query)} aria-current={status === filter ? 'page' : undefined} className={`rounded-md px-3 py-2 text-sm ${status === filter ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {humanize(filter)}
            </Link>
          ))}
        </nav>
        <form action="/admin/reviews" className="flex w-full max-w-md gap-2">
          {status !== 'pending' && <input type="hidden" name="status" value={status} />}
          <label htmlFor="reviews-search" className="sr-only">Search reviews</label>
          <input id="reviews-search" name="q" type="search" defaultValue={params.q ?? ''} maxLength={100} placeholder="Search guest, target, or booking" className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1B1A2E] focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
          <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">Search</button>
        </form>
      </div>

      <p className="text-xs text-gray-500">{visibleItems.length} reviews shown · latest 500</p>
      {visibleItems.length === 0 ? (
        <p className="border-y bg-white px-4 py-12 text-center text-sm text-gray-500">No reviews match this filter.</p>
      ) : (
        <ul className="divide-y border-y bg-white">
          {visibleItems.map((item) => (
            <li key={`${item.type}-${item.id}`} className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_14rem]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#FDF0F5] px-2.5 py-1 text-xs font-medium text-[#9C2454]">{item.type === 'host' ? 'Host review' : 'Listing review'}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[item.status] ?? STATUS_STYLES.pending}`}>{humanize(item.status)}</span>
                  <span className="text-sm font-semibold text-amber-700">{item.rating} / 5 stars</span>
                </div>
                <h2 className="mt-3 text-base font-semibold text-[#1B1A2E]">
                  {item.targetHref ? <Link href={item.targetHref} className="hover:text-[#E23E85]">{item.target}</Link> : item.target}
                </h2>
                <p className="mt-1 text-xs text-gray-500">By {item.guest} · {formatDate(item.createdAt, 'long')} · booking <Link href={`/admin/bookings/${item.bookingId}`} className="font-medium text-[#CF2F74] hover:underline">{item.bookingId.slice(0, 8)}</Link></p>
                {item.comment ? <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-gray-700">{item.comment}</p> : <p className="mt-4 text-sm italic text-gray-400">No written comment.</p>}
              </div>
              <div className="flex flex-wrap items-start gap-2 border-t pt-4 xl:flex-col xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                {item.status !== 'published' && (
                  <form action={moderateReview}>
                    <input type="hidden" name="review_id" value={item.id} />
                    <input type="hidden" name="review_type" value={item.type} />
                    <input type="hidden" name="moderation_status" value="published" />
                    <button type="submit" className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">Publish review</button>
                  </form>
                )}
                {item.status !== 'hidden' && (
                  <form action={moderateReview}>
                    <input type="hidden" name="review_id" value={item.id} />
                    <input type="hidden" name="review_type" value={item.type} />
                    <input type="hidden" name="moderation_status" value="hidden" />
                    <button type="submit" className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Hide review</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}