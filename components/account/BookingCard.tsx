// FILE LOCATION: components/account/BookingCard.tsx
// Put this file at components/account/BookingCard.tsx in your project root (or src/components/account/BookingCard.tsx if your project has a src/ folder).

import Link from 'next/link';
import { BookOpenText, MessageCircle } from 'lucide-react';
import { coverImage, formatDate, formatMoney, humanize, nightsBetween } from '@/app/lib/format';
import { routes } from '@/app/lib/routes';
import type { BookingView } from '@/types/account';
import { CancelBookingButton, HostReviewButton, ReviewButton } from './BookingActions';
import { BookingChangeActions } from './BookingChangeActions';
import { StatusBadge, textLink } from './ui';

export function BookingCard({ booking: b }: { booking: BookingView }) {
  const listing = b.listing;
  const nights = nightsBetween(b.check_in, b.check_out);
  const image = coverImage(listing?.listing_images);
  const canCancel = b.phase === 'upcoming' && b.status === 'pending';
  const canChangeConfirmedBooking = b.phase === 'upcoming' && b.status === 'confirmed';
  const canReview = b.phase === 'past' && b.status === 'completed' && !b.reviewed;
  const canReviewHost = b.phase === 'past' && b.status === 'completed' && !b.hostReviewed;

  const guests = `${b.guests_count} ${b.guests_count === 1 ? 'guest' : 'guests'}`;
  const children = b.children_count > 0 ? `, ${b.children_count} ${b.children_count === 1 ? 'child' : 'children'}` : '';
  const pets = b.pets_count > 0 ? `, ${b.pets_count} ${b.pets_count === 1 ? 'pet' : 'pets'}` : '';
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
          {pets}
          {rooms}
        </p>

        {b.special_requests && (
          <p className="mt-2 line-clamp-2 text-sm text-neutral-500">Your note: {b.special_requests}</p>
        )}
        <p className="mt-2 text-xs text-neutral-400">
          Booking {b.booking_reference}, made {formatDate(b.created_at, 'long')}
        </p>
        {b.changeRequest && (
          <div className="mt-3 max-w-prose border-l-2 border-neutral-300 pl-3 text-xs text-neutral-600">
            <p className="font-medium text-neutral-700">
              {humanize(b.changeRequest.request_type)} request {humanize(b.changeRequest.status).toLowerCase()}
            </p>
            {b.changeRequest.request_type === 'cancellation' && (
              <p className="mt-1">
                Estimated refund: {formatMoney(b.changeRequest.estimated_refund_amount)} ({b.changeRequest.refund_percent}% of {formatMoney(b.changeRequest.amount_paid)} paid).
                {b.changeRequest.refund_processing_status === 'awaiting_manual_processing'
                  ? ' Approved; manual processing is pending. Allow 3–5 business days after management approval.'
                  : b.changeRequest.refund_processing_status === 'not_eligible'
                    ? ' No refund is due under the estimated policy window.'
                        : b.changeRequest.status === 'declined'
                          ? ' The request was declined; no refund will be processed.'
                          : ' This is an estimate; the host has not approved the request yet.'}
              </p>
            )}
            {b.changeRequest.request_type === 'date_change' && b.changeRequest.requested_check_in && b.changeRequest.requested_check_out && (
              <p className="mt-1">Requested dates: {formatDate(b.changeRequest.requested_check_in, 'noYear')} to {formatDate(b.changeRequest.requested_check_out, 'short')}</p>
            )}
            {b.changeRequest.host_response && <p className="mt-1">Host note: {b.changeRequest.host_response}</p>}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-end justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
        <p className="font-serif text-xl text-neutral-900">{formatMoney(b.total_amount)}</p>
        <div className="flex flex-col items-end gap-2">
          {canCancel && <CancelBookingButton bookingId={b.id} />}
          <Link
            href={`/account/bookings/${b.id}`}
            className="inline-flex items-center gap-1.5 py-1 text-sm font-medium text-neutral-600 transition hover:text-[#1B1A2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85]"
          >
            <MessageCircle size={15} aria-hidden="true" />
            Chat with customer support
            {b.unreadSupportReplyCount > 0 && (
              <span className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-[#9C2454]" aria-label={`${b.unreadSupportReplyCount} new customer support ${b.unreadSupportReplyCount === 1 ? 'reply' : 'replies'}`}>
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#E23E85]" />
                {b.unreadSupportReplyCount === 1 ? 'New reply' : `${b.unreadSupportReplyCount} new replies`}
              </span>
            )}
          </Link>
          {(b.status === 'confirmed' || b.status === 'completed') && (
            <Link href={`/account/bookings/${b.id}/arrival-guide`} className="inline-flex items-center gap-1.5 py-1 text-sm font-medium text-neutral-600 transition hover:text-[#1B1A2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85]">
              <BookOpenText size={15} aria-hidden="true" />
              Arrival guide
            </Link>
          )}
          {canChangeConfirmedBooking && (
            <BookingChangeActions
              bookingId={b.id}
              checkIn={b.check_in}
              checkOut={b.check_out}
              request={b.changeRequest}
            />
          )}
          {canReview && <ReviewButton bookingId={b.id} listingTitle={listing?.title ?? 'your stay'} />}
          {canReviewHost && <HostReviewButton bookingId={b.id} />}
          <Link href={`/account/support?booking=${b.id}&category=booking_issue`} className={textLink}>
            Report a problem or dispute
          </Link>
          {b.phase === 'past' && b.reviewed && <span className="text-sm text-neutral-500">You reviewed this stay</span>}
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