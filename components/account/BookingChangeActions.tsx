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
import { btnDanger, btnPrimary, btnSecondary, inputClass } from './ui';

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
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => { setError(null); setDatePreview(null); setNewCheckIn(checkIn); setNewCheckOut(checkOut); dateDialog.current?.showModal(); }} className={`${btnSecondary} !py-1.5`}>
          Request date change
        </button>
        <button type="button" onClick={openCancellation} disabled={pending} className={`${btnDanger} !py-1.5`}>
          {pending ? 'Loading…' : 'Request cancellation'}
        </button>
      </div>
      {message && <p role="status" className="max-w-xs text-right text-xs text-emerald-700">{message}</p>}
      {error && <p role="alert" className="max-w-xs text-right text-xs text-rose-700">{error}</p>}

      <dialog ref={cancelDialog} aria-labelledby={cancelTitleId} className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-neutral-900/50">
        <div className="p-6">
          <h2 id={cancelTitleId} className="font-serif text-xl">Review cancellation</h2>
          {cancellation && (
            <>
              <dl className="mt-4 space-y-2 border-y border-neutral-200 py-4 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-neutral-600">Paid to date</dt><dd className="font-medium">{formatMoney(cancellation.paidAmount)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-neutral-600">Policy refund estimate ({cancellation.refundPercent}%)</dt><dd className="font-semibold">{formatMoney(cancellation.estimatedRefund)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-neutral-600">Timing if approved</dt><dd className="text-right">3–5 business days after management approval</dd></div>
              </dl>
              <p className="mt-3 text-xs leading-5 text-neutral-500">This is an estimate based on the platform schedule and successful payments on record. Any property-specific terms or processing fees may affect the final amount. The host must approve the request; refunds are processed manually.</p>
              {cancellation.listingPolicy && (
                <div className="mt-4 rounded-lg bg-neutral-50 p-3">
                  <p className="text-xs font-semibold text-neutral-700">Property cancellation terms</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-neutral-600">{cancellation.listingPolicy}</p>
                </div>
              )}
              <label className="mt-4 flex items-start gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 accent-rose-700" />
                <span>I understand this submits a cancellation request and does not immediately issue a refund.</span>
              </label>
            </>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => cancelDialog.current?.close()} className={btnSecondary}>Keep booking</button>
            <button type="button" onClick={sendCancellationRequest} disabled={pending || !acknowledged} className={btnDanger}>{pending ? 'Sending…' : 'Submit cancellation request'}</button>
          </div>
        </div>
      </dialog>

      <dialog ref={dateDialog} aria-labelledby={dateTitleId} className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-neutral-900/50">
        <div className="p-6">
          <h2 id={dateTitleId} className="font-serif text-xl">Request new dates</h2>
          <p className="mt-1 text-sm text-neutral-500">Current stay: {checkIn} to {checkOut}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-neutral-700">Check-in<input type="date" value={newCheckIn} min={todayISO()} onChange={(event) => { setNewCheckIn(event.target.value); setDatePreview(null); }} className={`${inputClass} mt-1`} /></label>
            <label className="text-sm font-medium text-neutral-700">Check-out<input type="date" value={newCheckOut} min={newCheckIn} onChange={(event) => { setNewCheckOut(event.target.value); setDatePreview(null); }} className={`${inputClass} mt-1`} /></label>
          </div>
          <label className="mt-3 block text-sm font-medium text-neutral-700">Note for the host (optional)<textarea value={reason} maxLength={1000} onChange={(event) => setReason(event.target.value)} rows={3} className={`${inputClass} mt-1`} /></label>
          <button type="button" onClick={reviewDateChange} disabled={pending} className={`${btnSecondary} mt-4`}>{pending ? 'Checking…' : 'Check availability and price'}</button>
          {datePreview && (
            <div className="mt-4 rounded-lg border border-neutral-200 p-3 text-sm">
              <p>Estimated new total: <strong>{formatMoney(datePreview.quotedTotal)}</strong></p>
              <p className="mt-1 text-neutral-600">Change from current total: {formatMoney(datePreview.priceDifference)}</p>
              {datePreview.priceDifference !== 0 && <p className="mt-2 text-xs text-amber-800">The total changes. The host cannot approve a different total in this flow; contact support to arrange a price adjustment before confirming.</p>}
              {datePreview.priceDifference === 0 && <p className="mt-2 text-xs text-neutral-500">Final dates are subject to host approval and a fresh availability check.</p>}
            </div>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => dateDialog.current?.close()} className={btnSecondary}>Close</button>
            <button type="button" onClick={sendDateChangeRequest} disabled={pending || !datePreview} className={btnPrimary}>{pending ? 'Sending…' : 'Send date-change request'}</button>
          </div>
        </div>
      </dialog>
    </>
  );
}