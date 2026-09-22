// FILE LOCATION: components/account/BookingActions.tsx
// Put this file at components/account/BookingActions.tsx in your project root (or src/components/account/BookingActions.tsx if your project has a src/ folder).

'use client';

import { useId, useRef, useState } from 'react';
import { cancelBooking, submitReview } from '@/app/account/bookings/actions';
import { useAction } from './useAction';
import { FormMessage, StarIcon, btnDanger, btnPrimary, btnSecondary, focusRing, inputClass } from './ui';

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [confirming, setConfirming] = useState(false);
  const { run, pending, result } = useAction(cancelBooking);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={`${btnSecondary} !py-1.5`}>
        Cancel booking
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2 text-right">
      <p className="text-sm text-neutral-700">Cancel this booking?</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setConfirming(false)} className={`${btnSecondary} !py-1.5`}>
          Keep it
        </button>
        <button type="button" disabled={pending} onClick={() => run(bookingId)} className={`${btnDanger} !py-1.5`}>
          {pending ? 'Cancelling…' : 'Yes, cancel'}
        </button>
      </div>
      <FormMessage result={result?.ok ? null : result} />
    </div>
  );
}

export function ReviewButton({ bookingId, listingTitle }: { bookingId: string; listingTitle: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { run, pending, result } = useAction(submitReview);

  async function submit() {
    if (rating < 1) {
      setLocalError('Choose a star rating first.');
      return;
    }
    setLocalError(null);
    const res = await run({ bookingId, rating, comment });
    if (res.ok) dialogRef.current?.close();
  }

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className={`${btnPrimary} !py-1.5`}>
        Write a review
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-neutral-900/50"
      >
        <div className="p-6">
          <h2 id={titleId} className="font-serif text-xl">
            How was {listingTitle}?
          </h2>

          <div role="radiogroup" aria-label="Rating" className="mt-4 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                onClick={() => setRating(n)}
                className={`rounded p-1 ${focusRing}`}
              >
                <StarIcon size={30} className={n <= rating ? 'text-amber-500' : 'text-neutral-300'} />
              </button>
            ))}
          </div>

          <label htmlFor={`${titleId}-comment`} className="mt-5 block text-sm font-medium text-neutral-800">
            Tell future guests about your stay
          </label>
          <textarea
            id={`${titleId}-comment`}
            rows={4}
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={`${inputClass} mt-1.5`}
            placeholder="The space, the neighbourhood, the host…"
          />

          <div className="mt-2 min-h-5">
            {localError ? (
              <p role="alert" className="text-sm text-rose-700">
                {localError}
              </p>
            ) : (
              <FormMessage result={result?.ok ? null : result} />
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => dialogRef.current?.close()} className={btnSecondary}>
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={pending} className={btnPrimary}>
              {pending ? 'Posting…' : 'Post review'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}