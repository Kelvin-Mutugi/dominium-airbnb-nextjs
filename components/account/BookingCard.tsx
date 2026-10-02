// FILE LOCATION: components/account/BookingCard.tsx
// Server component (no 'use client'). The "Manage booking" area uses a native <details>,
// so it opens and closes without any client JavaScript.

import Link from 'next/link';
import { BookOpenText, ChevronDown, MessageCircle } from 'lucide-react';
import { coverImage, formatDate, formatMoney, humanize, nightsBetween, todayISO } from '@/app/lib/format';
import { routes } from '@/app/lib/routes';
import type { BookingView } from '@/types/account';
import { CancelBookingButton, HostReviewButton, ReviewButton } from './BookingActions';
import { BookingChangeActions } from './BookingChangeActions';
import { StatusBadge, focusRing } from './ui';
import { inkBtn, menuRow } from './bookingStyles';

const menuItem = menuRow;
const quietPill = `inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 ${focusRing}`;

export function BookingCard({ booking: b }: { booking: BookingView }) {
  const listing = b.listing;
  const nights = nightsBetween(b.check_in, b.check_out);
  const image = coverImage(listing?.listing_images);
  const canCancel = b.phase === 'upcoming' && b.status === 'pending';
  const canChangeConfirmedBooking = b.phase === 'upcoming' && b.status === 'confirmed' && b.check_in > todayISO();
  const stayInProgress = b.status === 'confirmed' && b.check_in <= todayISO() && b.check_out > todayISO();
  const canReview = b.phase === 'past' && b.status === 'completed' && !b.reviewed;
  const canReviewHost = b.phase === 'past' && b.status === 'completed' && !b.hostReviewed;
  const hasArrivalGuide = b.status === 'confirmed' || b.status === 'completed';

  const guests = `${b.guests_count} ${b.guests_count === 1 ? 'guest' : 'guests'}`;
  const children = b.children_count > 0 ? `, ${b.children_count} ${b.children_count === 1 ? 'child' : 'children'}` : '';
  const pets = b.pets_count > 0 ? `, ${b.pets_count} ${b.pets_count === 1 ? 'pet' : 'pets'}` : '';
  const rooms = `, ${b.rooms_count} ${b.rooms_count === 1 ? 'room' : 'rooms'}`;

  const cr = b.changeRequest;
  const unread = b.unreadSupportReplyCount;

  return (
    <article className="account-neu-surface rounded-3xl p-4 sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:gap-5">
        <div className="h-48 w-full shrink-0 overflow-hidden rounded-2xl bg-neutral-100 md:h-36 md:w-48">
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

          <p className="mt-3 text-base font-medium text-neutral-900">
            {formatDate(b.check_in, 'noYear')} to {formatDate(b.check_out, 'short')}
          </p>
          <p className="mt-0.5 text-sm text-neutral-500">
            {nights} {nights === 1 ? 'night' : 'nights'}, {guests}
            {children}
            {pets}
            {rooms}
          </p>
          {stayInProgress && (
            <p className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              Stay in progress · changes close after check-in
            </p>
          )}
        </div>

        <p className="font-serif text-xl text-neutral-900 md:ml-auto md:text-right">{formatMoney(b.total_amount)}</p>
      </div>

      {/* Status of any change or cancellation request: always visible, because it's news */}
      {cr && (
        <div className="account-neu-inset mt-4 rounded-2xl px-4 py-3 text-sm text-neutral-600">
          <p className="font-medium text-neutral-800">
            {humanize(cr.request_type)} request {humanize(cr.status).toLowerCase()}
          </p>
          {cr.request_type === 'cancellation' && (
            <>
              <p className="mt-1">
                Estimated refund: {formatMoney(cr.estimated_refund_amount)} ({cr.refund_percent}% of{' '}
                {formatMoney(cr.amount_paid)} paid). This amount is an estimate and may change under the property cancellation terms.
              </p>
              <p className="mt-1">
                {cr.status === 'pending'
                  ? 'Next: the admin team reviews your cancellation request. Your booking remains confirmed until it is approved. If approved, the booking is cancelled and any eligible refund goes to a separate admin review; approving the cancellation alone does not send money.'
                  : cr.status === 'declined'
                    ? 'The admin team declined this request. Your booking remains confirmed, and no refund will be processed.'
                    : cr.refund_processing_status === 'awaiting_admin_review'
                      ? 'Your cancellation is approved and the booking is cancelled. The refund is now in a separate admin review; approval here does not send money. We will update this page after the refund decision.'
                      : cr.refund_processing_status === 'declined'
                        ? `Your booking is cancelled, but the refund request was declined. ${cr.refund_admin_response ?? 'No refund will be sent.'}`
                        : cr.refund_processing_status === 'processed'
                          ? `Refund sent: ${formatMoney(cr.actual_refund_amount ?? 0)}${cr.refund_processed_at ? ` on ${formatDate(cr.refund_processed_at, 'short')}` : ''}. Your bank or mobile-money provider may take additional time to post it.`
                    : cr.refund_processing_status === 'awaiting_manual_processing'
                      ? `Refund approved: your booking is cancelled, but the money has not been sent yet. The admin team must process it manually. Allow 3–5 business days after it is sent.`
                      : cr.refund_processing_status === 'not_eligible'
                        ? 'Approved: your booking is cancelled. The estimated policy calculation indicates no refund is due.'
                        : 'Your cancellation request has been reviewed.'}
              </p>
            </>
          )}
          {cr.request_type === 'date_change' && cr.requested_check_in && cr.requested_check_out && (
            <>
              <p className="mt-1">
                Requested dates: {formatDate(cr.requested_check_in, 'noYear')} to {formatDate(cr.requested_check_out, 'short')}
              </p>
              <p className="mt-1">
                {cr.status === 'pending'
                  ? 'Your current dates stay in place until the host reviews the request.'
                  : cr.status === 'approved'
                    ? 'Approved: your booking now uses the requested dates shown above.'
                    : 'The host declined this request, so your original booking dates remain unchanged.'}
              </p>
            </>
          )}
          {cr.host_response && <p className="mt-1">Host note: {cr.host_response}</p>}
        </div>
      )}

      {/* The few things most people actually want */}
      <div className="account-neu-inset mt-4 flex flex-wrap items-center gap-2 rounded-2xl p-3">
        {canReview ? (
          <ReviewButton bookingId={b.id} listingTitle={listing?.title ?? 'your stay'} />
        ) : (
          hasArrivalGuide && (
            <Link
              href={`/account/bookings/${b.id}/arrival-guide`}
              className={inkBtn}
            >
              <BookOpenText size={16} aria-hidden="true" />
              Arrival guide
            </Link>
          )
        )}

        <Link href={`/account/bookings/${b.id}`} className={quietPill}>
          <MessageCircle size={16} aria-hidden="true" />
          Message support
          {unread > 0 && (
            <span
              className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-[#9C2454]"
              aria-label={`${unread} new customer support ${unread === 1 ? 'reply' : 'replies'}`}
            >
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#E23E85]" />
              {unread === 1 ? 'New reply' : `${unread} new replies`}
            </span>
          )}
        </Link>

        {b.phase === 'past' && b.reviewed && (
          <span className="px-2 text-sm text-neutral-500">You reviewed this stay</span>
        )}
      </div>

      {/* Everything else, one tap away */}
      <details className="group mt-2">
        <summary
          className={`inline-flex cursor-pointer list-none items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 [&::-webkit-details-marker]:hidden ${focusRing}`}
        >
          Manage booking
          <ChevronDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" />
        </summary>

        <div className="account-neu-inset mt-2 rounded-2xl p-2">
          {(canChangeConfirmedBooking || canCancel || canReviewHost) && (
            <div className="flex flex-col">
              {canChangeConfirmedBooking && (
                <BookingChangeActions
                  bookingId={b.id}
                  checkIn={b.check_in}
                  checkOut={b.check_out}
                  request={b.changeRequest}
                />
              )}
              {canCancel && <CancelBookingButton bookingId={b.id} />}
              {canReviewHost && <HostReviewButton bookingId={b.id} />}
            </div>
          )}

          <Link href={`/account/support?booking=${b.id}&category=booking_issue`} className={menuItem}>
            Something’s wrong? Report a problem
          </Link>
          {listing && (
            <Link href={`/apartments/${listing.id}`} className={menuItem}>
              View listing
            </Link>
          )}

          {b.special_requests && (
            <p className="mt-1 px-3 py-2 text-sm text-neutral-500">Your note: {b.special_requests}</p>
          )}
          <p className="px-3 pb-2 pt-1 text-xs text-neutral-400">
            Booking {b.booking_reference}, made {formatDate(b.created_at, 'long')}
          </p>
        </div>
      </details>
    </article>
  );
}