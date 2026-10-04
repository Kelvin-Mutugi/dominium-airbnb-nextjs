import Link from 'next/link';
import { formatDate, formatMoney } from '@/app/lib/format';
import { getHostDateChangeHistoryData } from '@/app/lib/host/actions';
import { DateChangeDecisionActions } from '@/components/host/DateChangeDecisionActions';

function statusStyle(status: string) {
  if (status === 'pending') return 'bg-amber-50 text-amber-900';
  if (status === 'approved') return 'bg-emerald-50 text-emerald-800';
  return 'bg-neutral-100 text-neutral-700';
}

export default async function HostDateChangesPage() {
  const requests = await getHostDateChangeHistoryData();
  const pendingRequests = requests.filter((request) => request.status === 'pending');
  const decidedRequests = requests.filter((request) => request.status !== 'pending');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Date-change requests</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
          Review guest requests to move their stay. Dates change only after you approve; approval rechecks availability and is allowed only when the booking total stays the same.
        </p>
      </header>

      <section aria-labelledby="pending-date-changes-heading" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="pending-date-changes-heading" className="text-lg font-semibold text-[#1B1A2E]">Awaiting your decision</h2>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">{pendingRequests.length}</span>
        </div>
        {pendingRequests.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">No date-change requests are waiting for your review.</p>
        ) : (
          <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
            {pendingRequests.map((request) => {
              const booking = Array.isArray(request.booking) ? request.booking[0] : request.booking;
              const listing = Array.isArray(booking?.listing) ? booking.listing[0] : booking?.listing;
              return (
                <article key={request.id} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[#1B1A2E]">{listing?.title ?? 'Your listing'}</h3>
                    <p className="mt-1 text-sm text-gray-600">Guest: {booking?.guest_name ?? 'Guest'} · Booking {booking?.booking_reference ?? request.booking_id.slice(0, 8)}</p>
                    <p className="mt-2 text-sm text-gray-600">Current: {formatDate(request.current_check_in, 'noYear')} to {formatDate(request.current_check_out, 'short')}</p>
                    <p className="mt-1 text-sm font-medium text-[#1B1A2E]">Requested: {formatDate(request.requested_check_in, 'noYear')} to {formatDate(request.requested_check_out, 'short')}</p>
                    {request.quoted_total_amount != null && <p className="mt-1 text-sm text-gray-600">Estimated booking total: {formatMoney(request.quoted_total_amount)}. Approval is only available when this matches the current total.</p>}
                    {request.reason && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-500">Guest note: {request.reason}</p>}
                    <p className="mt-2 text-xs text-gray-500">Sent {formatDate(request.created_at, 'long')}</p>
                    {request.auto_decision_at && <p className="mt-1 text-xs font-medium text-amber-800">If you do not decide by {formatDate(request.auto_decision_at, 'long')}, the system will approve if price and availability still pass; otherwise it will decline with an explanation.</p>}
                  </div>
                  <DateChangeDecisionActions requestId={request.id} />
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="date-change-history-heading" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 id="date-change-history-heading" className="text-lg font-semibold text-[#1B1A2E]">Request history</h2>
            <p className="mt-1 text-sm text-gray-600">Approved and declined requests for your bookings.</p>
          </div>
          <span className="text-xs text-gray-500">Latest {decidedRequests.length}</span>
        </div>
        {decidedRequests.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">Decided date-change requests will appear here.</p>
        ) : (
          <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
            {decidedRequests.map((request) => {
              const booking = Array.isArray(request.booking) ? request.booking[0] : request.booking;
              const listing = Array.isArray(booking?.listing) ? booking.listing[0] : booking?.listing;
              return (
                <article key={request.id} className="p-4 sm:p-5">
                  <header className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-[#1B1A2E]">{listing?.title ?? 'Your listing'}</h3>
                      <p className="mt-1 text-xs text-gray-500">Guest: {booking?.guest_name ?? 'Guest'} · Booking {booking?.booking_reference ?? request.booking_id.slice(0, 8)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(request.status)}`}>
                      {request.status === 'approved'
                        ? request.decision_source === 'system' ? 'Auto-approved by system' : 'Approved by host'
                        : request.decision_source === 'system' ? 'Auto-declined by system' : 'Declined by host'}
                    </span>
                  </header>
                  <p className="mt-2 text-sm text-gray-600">Previous dates: {formatDate(request.current_check_in, 'noYear')} to {formatDate(request.current_check_out, 'short')}</p>
                  <p className="mt-1 text-sm text-gray-700">Requested dates: {formatDate(request.requested_check_in, 'noYear')} to {formatDate(request.requested_check_out, 'short')}</p>
                  {request.status === 'approved' ? (
                    <p className="mt-1 text-sm font-medium text-emerald-800">Booking dates were updated after approval.</p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-600">The booking kept its previous dates.</p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">Decided {formatDate(request.responded_at ?? request.created_at, 'long')}</p>
                  {request.host_response && <p className="mt-2 text-sm text-gray-600">{request.decision_source === 'system' ? 'System update:' : 'Your note:'} {request.host_response}</p>}
                  <Link href={`/host/bookings?booking=${request.booking_id}`} className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-[#9C2454] hover:underline">Open booking</Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}