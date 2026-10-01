// FILE LOCATION: components/account/BookingActions.tsx

'use client';

import { useId, useRef, useState } from 'react';
import { cancelBooking, submitHostReview, submitReview } from '@/app/account/bookings/actions';
import { useAction } from './useAction';
import { FormMessage, StarIcon, focusRing, inputClass } from './ui';
import { dialogShell, ghostBtn, inkBtn, menuHint, menuRow } from './bookingStyles';

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [confirming, setConfirming] = useState(false);
  const { run, pending, result } = useAction(cancelBooking);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={menuRow}>
        Cancel booking
        <span className={menuHint}>Stop this request before the host confirms it.</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white px-3 py-3">
      <p className="text-sm font-medium text-neutral-800">Cancel this booking?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setConfirming(false)} className={ghostBtn}>
          Keep it
        </button>
        <button type="button" disabled={pending} onClick={() => run(bookingId)} className={inkBtn}>
          {pending ? 'Cancelling…' : 'Yes, cancel'}
        </button>
      </div>
      <div className="mt-2">
        <FormMessage result={result?.ok ? null : result} />
      </div>
    </div>
  );
}

export function ReviewButton({ bookingId, listingTitle }: { bookingId: string; listingTitle: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [ratings, setRatings] = useState({ cleanlinessRating: 0, accuracyRating: 0, locationRating: 0, communicationRating: 0 });
  const [comment, setComment] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { run, pending, result } = useAction(submitReview);

  async function submit() {
    if (Object.values(ratings).some((rating) => rating < 1)) {
      setLocalError('Tap a star for each line before posting.');
      return;
    }
    setLocalError(null);
    const res = await run({ bookingId, ...ratings, comment });
    if (res.ok) dialogRef.current?.close();
  }

  const ratingCategories = [
    ['cleanlinessRating', 'Cleanliness'],
    ['accuracyRating', 'Matched the listing'],
    ['locationRating', 'Location'],
    ['communicationRating', 'Host communication'],
  ] as const;

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className={inkBtn}>
        Write a review
      </button>

      <dialog ref={dialogRef} aria-labelledby={titleId} className={dialogShell}>
        <div className="p-6 sm:p-7">
          <h2 id={titleId} className="font-serif text-xl">
            How was {listingTitle}?
          </h2>
          <p className="mt-1 text-sm text-neutral-500">It takes under a minute and helps future guests.</p>

          <div className="mt-5 space-y-3">
            {ratingCategories.map(([key, label]) => (
              <div key={key} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-neutral-700">{label}</span>
                <div role="radiogroup" aria-label={label} className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={ratings[key] === value}
                      aria-label={`${value} ${value === 1 ? 'star' : 'stars'} for ${label.toLowerCase()}`}
                      onClick={() => setRatings((current) => ({ ...current, [key]: value }))}
                      className={`rounded-full p-1 ${focusRing}`}
                    >
                      <StarIcon size={24} className={value <= ratings[key] ? 'text-amber-500' : 'text-neutral-300'} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <label htmlFor={`${titleId}-comment`} className="mt-6 block text-sm font-medium text-neutral-800">
            Anything you’d like to add? <span className="font-normal text-neutral-400">(optional)</span>
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
              <p role="alert" className="rounded-xl bg-[#FCE8F0] p-3 text-sm text-[#9C2454]">
                {localError}
              </p>
            ) : (
              <FormMessage result={result?.ok ? null : result} />
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => dialogRef.current?.close()} className={ghostBtn}>
              Not now
            </button>
            <button type="button" onClick={submit} disabled={pending} className={inkBtn}>
              {pending ? 'Posting…' : 'Post review'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

export function HostReviewButton({ bookingId, hostName = 'your host' }: { bookingId: string; hostName?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { run, pending, result } = useAction(submitHostReview);

  async function submit() {
    if (rating < 1) {
      setLocalError('Tap a star to rate first.');
      return;
    }
    setLocalError(null);
    const response = await run({ bookingId, rating, comment });
    if (response.ok) dialogRef.current?.close();
  }

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className={menuRow}>
        Review your host
        <span className={menuHint}>Tell us how check-in and communication went.</span>
      </button>

      <dialog ref={dialogRef} aria-labelledby={titleId} className={dialogShell}>
        <div className="p-6 sm:p-7">
          <h2 id={titleId} className="font-serif text-xl">
            How was {hostName}?
          </h2>
          <p className="mt-1 text-sm text-neutral-500">Your review is checked before it appears publicly.</p>

          <div role="radiogroup" aria-label="Host rating" className="mt-5 flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                onClick={() => setRating(value)}
                className={`rounded-full p-1 ${focusRing}`}
              >
                <StarIcon size={32} className={value <= rating ? 'text-amber-500' : 'text-neutral-300'} />
              </button>
            ))}
          </div>

          <label htmlFor={`${titleId}-comment`} className="mt-6 block text-sm font-medium text-neutral-800">
            Anything you’d like to add? <span className="font-normal text-neutral-400">(optional)</span>
          </label>
          <textarea
            id={`${titleId}-comment`}
            rows={4}
            maxLength={2000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className={`${inputClass} mt-1.5`}
            placeholder="Communication, check-in, and hospitality…"
          />

          <div className="mt-2 min-h-5">
            {localError ? (
              <p role="alert" className="rounded-xl bg-[#FCE8F0] p-3 text-sm text-[#9C2454]">
                {localError}
              </p>
            ) : (
              <FormMessage result={result?.ok ? null : result} />
            )}
            {result?.ok && (
              <p role="status" className="text-sm text-emerald-700">
                {result.message}
              </p>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => dialogRef.current?.close()} className={ghostBtn}>
              Not now
            </button>
            <button type="button" onClick={submit} disabled={pending} className={inkBtn}>
              {pending ? 'Sending…' : 'Send review'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}