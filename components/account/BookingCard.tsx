// FILE LOCATION: components/account/BookingCard.tsx
// Put this file at components/account/BookingCard.tsx in your project root (or src/components/account/BookingCard.tsx if your project has a src/ folder).

import Link from 'next/link';
import { coverImage, formatDate, formatMoney, nightsBetween } from '@/app/lib/format';
import { routes } from '@/app/lib/routes';
import type { BookingView } from '@/types/account';
import { CancelBookingButton, HostReviewButton, ReviewButton } from './BookingActions';
import { StatusBadge, textLink } from './ui';

export function BookingCard({ booking: b }: { booking: BookingView }) {
  const listing = b.listing;
  const nights = nightsBetween(b.check_in, b.check_out);
  const image = coverImage(listing?.listing_images);
  const canCancel = b.phase === 'upcoming' && b.status === 'pending';
  const canReview = b.phase === 'past' && !b.reviewed;
  const canReviewHost = b.phase === 'past' && !b.hostReviewed;

  const guests = `${b.guests_count} ${b.guests_count === 1 ? 'guest' : 'guests'}`;
  const children = b.children_count > 0 ? `, ${b.children_count} ${b.children_count === 1 ? 'child' : 'children'}` : '';
  const rooms = `, ${b.rooms_count} ${b.rooms_count === 1 ? 'room' : 'rooms'}`;

  return (
    <article className="flex flex-col gap-4 py-6 sm:flex-row">
      <div className="h-44 w-full shrink-0 overflow-hidden rounded-xl bg-neutral-200 sm:h-32 sm:w-44">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-serif text-lg leading-snug text-neutral-900">
            {listing ? (
              <Link href={routes.listing(listing.slug)} className="hover:underline">
                {listing.title}
              </Link>
            ) : (
              'Listing unavailable'
            )}
          </h3>
          <StatusBadge status={b.expired ? 'expired' : b.status} label={b.expired ? 'Expired' : undefined} />
        </div>
        {listing && (
          <p className="mt-0.5 text-sm text-neutral-500">
            {listing.town}, {listing.county}
          </p>
        )}

        <p className="mt-3 text-sm font-medium text-neutral-800">
          {formatDate(b.check_in, 'noYear')} to {formatDate(b.check_out, 'short')}
        </p>
        <p className="text-sm text-neutral-500">
          {nights} {nights === 1 ? 'night' : 'nights'}, {guests}
          {children}
          {rooms}
        </p>

        {b.special_requests && (
          <p className="mt-2 line-clamp-2 text-sm text-neutral-500">Your note: {b.special_requests}</p>
        )}
        <p className="mt-2 text-xs text-neutral-400">
          Booking {b.id.slice(0, 8)}, made {formatDate(b.created_at, 'long')}
        </p>
      </div>

      <div className="flex shrink-0 items-end justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
        <p className="font-serif text-xl text-neutral-900">{formatMoney(b.total_amount)}</p>
        <div className="flex flex-col items-end gap-2">
          {canCancel && <CancelBookingButton bookingId={b.id} />}
          {canReview && <ReviewButton bookingId={b.id} listingTitle={listing?.title ?? 'your stay'} />}
          {canReviewHost && <HostReviewButton bookingId={b.id} />}
          <Link href={`/account/support?booking=${b.id}&category=booking_issue`} className={textLink}>
            Get help with this stay
          </Link>
          {b.phase === 'past' && b.reviewed && <span className="text-sm text-neutral-500">You reviewed this stay</span>}
          {b.phase === 'upcoming' && b.status === 'confirmed' && (
            <span className="max-w-[13rem] text-right text-xs text-neutral-500">
              To change or cancel a confirmed booking, contact support.
            </span>
          )}
          {listing && (
            <Link href={`/apartments/${listing.id}`} className={textLink}>
              View listing
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}