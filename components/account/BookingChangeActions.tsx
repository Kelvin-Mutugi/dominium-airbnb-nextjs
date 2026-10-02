// FILE LOCATION: components/account/BookingChangeActions.tsx

'use client';

import { useId, useRef, useState } from 'react';
import { formatMoney, todayISO } from '@/app/lib/format';
import {
  getCancellationPreview,
  previewBookingDateChange,
  requestBookingCancellation,
  requestBookingDateChange,
} from '@/app/account/bookings/change-actions';
import type { BookingChangeRequest } from '@/types/account';
import { inputClass } from './ui';
import { dialogShell, ghostBtn, inkBtn, menuHint, menuRow, outlineBtn } from './bookingStyles';

type CancellationPreview = Extract<Awaited<ReturnType<typeof getCancellationPreview>>, { ok: true }>;
type DateChangePreview = Extract<Awaited<ReturnType<typeof previewBookingDateChange>>, { ok: true }>;

export function BookingChangeActions({
  bookingId,
  checkIn,
  checkOut,
  request,
}: {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  request: BookingChangeRequest | null;
}) {
  const cancelDialog = useRef<HTMLDialogElement>(null);
  const dateDialog = useRef<HTMLDialogElement>(null);
  const cancelTitleId = useId();
  const dateTitleId = useId();
  const [cancellation, setCancellation] = useState<CancellationPreview | null>(null);
  const [datePreview, setDatePreview] = useState<DateChangePreview | null>(null);
  const [newCheckIn, setNewCheckIn] = useState(checkIn);
  const [newCheckOut, setNewCheckOut] = useState(checkOut);
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openCancellation() {
    setError(null);
    setMessage(null);
    setPending(true);
    const result = await getCancellationPreview(bookingId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCancellation(result);
    setAcknowledged(false);
    cancelDialog.current?.showModal();
  }

  async function reviewDateChange() {
    setError(null);
    setMessage(null);
    setPending(true);
    const result = await previewBookingDateChange({ bookingId, checkIn: newCheckIn, checkOut: newCheckOut });
    setPending(false);
    if (!result.ok) {
      setDatePreview(null);
      setError(result.error);
      return;
    }
    setDatePreview(result);
  }

  async function sendCancellationRequest() {
    setPending(true);
    setError(null);
    const result = await requestBookingCancellation(bookingId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(result.message);
    cancelDialog.current?.close();
  }

  async function sendDateChangeRequest() {
    setPending(true);
    setError(null);
    const result = await requestBookingDateChange({ bookingId, checkIn: newCheckIn, checkOut: newCheckOut, reason });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(result.message);
    dateDialog.current?.close();
  }

  if (request?.status === 'pending') return null;

  return (
    <>
      <button
        type="button"
        className={menuRow}
        onClick={() => {
          setError(null);
          setDatePreview(null);
          setNewCheckIn(checkIn);
          setNewCheckOut(checkOut);
          dateDialog.current?.showModal();
        }}
      >
        Change dates
        <span className={menuHint}>Ask the host to move your stay. Nothing changes until they agree.</span>
      </button>

      <button type="button" onClick={openCancellation} disabled={pending} className={menuRow}>
        {pending ? 'Loading…' : 'Cancel booking'}
        <span className={menuHint}>You’ll see any refund before you confirm.</span>
      </button>

      {message && (
        <p role="status" className="px-3 py-1 text-xs text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-[#FCE8F0] px-3 py-2 text-xs text-[#9C2454]">
          {error}
        </p>
      )}

      {/* Cancellation */}
      <dialog ref={cancelDialog} aria-labelledby={cancelTitleId} className={dialogShell}>
        <div className="p-6 sm:p-7">
          <h2 id={cancelTitleId} className="font-serif text-xl">
            Cancel this stay?
          </h2>
          {cancellation && (
            <>
              <p className="mt-2 text-sm text-neutral-600">
                Based on the cancellation schedule, you’d get back about{' '}
                <strong className="text-neutral-900">{formatMoney(cancellation.estimatedRefund)}</strong>.
              </p>

              <dl className="mt-4 space-y-2 rounded-2xl bg-neutral-50 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-600">Paid so far</dt>
                  <dd className="font-medium">{formatMoney(cancellation.paidAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-600">Estimated refund ({cancellation.refundPercent}%)</dt>
                  <dd className="font-semibold">{formatMoney(cancellation.estimatedRefund)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-600">When you’d receive it</dt>
                  <dd className="text-right">3–5 business days after approval</dd>
                </div>
              </dl>

              <p className="mt-3 text-xs leading-5 text-neutral-500">
                This is an estimate from the platform schedule and the payments on record. Property terms or processing
                fees may change the final amount. The admin team reviews the request, and refunds are processed by
                hand.
              </p>

              {cancellation.listingPolicy && (
                <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs font-semibold text-neutral-700">This property’s cancellation terms</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-neutral-600">
                    {cancellation.listingPolicy}
                  </p>
                </div>
              )}

              <label className="mt-4 flex items-start gap-2.5 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  className="mt-1 accent-[#E23E85]"
                />
                <span>I understand this sends a request to the admin team. The refund isn’t instant.</span>
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-[#FCE8F0] p-3 text-sm text-[#9C2454]">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => cancelDialog.current?.close()} className={ghostBtn}>
              Keep my booking
            </button>
            <button
              type="button"
              onClick={sendCancellationRequest}
              disabled={pending || !acknowledged}
              className={inkBtn}
            >
              {pending ? 'Sending…' : 'Send cancellation request'}
            </button>
          </div>
        </div>
      </dialog>

      {/* Date change */}
      <dialog ref={dateDialog} aria-labelledby={dateTitleId} className={dialogShell}>
        <div className="p-6 sm:p-7">
          <h2 id={dateTitleId} className="font-serif text-xl">
            Pick new dates
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Your current stay: {checkIn} to {checkOut}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-neutral-700">
              Check-in
              <input
                type="date"
                value={newCheckIn}
                min={todayISO()}
                onChange={(event) => {
                  setNewCheckIn(event.target.value);
                  setDatePreview(null);
                }}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Check-out
              <input
                type="date"
                value={newCheckOut}
                min={newCheckIn}
                onChange={(event) => {
                  setNewCheckOut(event.target.value);
                  setDatePreview(null);
                }}
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>

          <label className="mt-4 block text-sm font-medium text-neutral-700">
            A note for the host <span className="font-normal text-neutral-400">(optional)</span>
            <textarea
              value={reason}
              maxLength={1000}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className={`${inputClass} mt-1`}
            />
          </label>

          <button type="button" onClick={reviewDateChange} disabled={pending} className={`${outlineBtn} mt-4`}>
            {pending ? 'Checking…' : 'Check availability and price'}
          </button>

          {datePreview && (
            <div className="mt-4 rounded-2xl bg-neutral-50 p-4 text-sm">
              <p>
                New total: <strong>{formatMoney(datePreview.quotedTotal)}</strong>
              </p>
              <p className="mt-1 text-neutral-600">Difference from now: {formatMoney(datePreview.priceDifference)}</p>
              {datePreview.priceDifference !== 0 && (
                <p className="mt-2 text-xs text-amber-800">
                  The total changes with these dates. The host can’t approve a different price here, so please contact
                  support to arrange the adjustment before you confirm.
                </p>
              )}
              {datePreview.priceDifference === 0 && (
                <p className="mt-2 text-xs text-neutral-500">
                  The host still has to approve, and we’ll re-check availability first.
                </p>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-[#FCE8F0] p-3 text-sm text-[#9C2454]">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => dateDialog.current?.close()} className={ghostBtn}>
              Close
            </button>
            <button type="button" onClick={sendDateChangeRequest} disabled={pending || !datePreview} className={inkBtn}>
              {pending ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}