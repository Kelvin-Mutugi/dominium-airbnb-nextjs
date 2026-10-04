import Link from 'next/link';
import { formatDate } from '@/app/lib/format';
import { getHostRefundsData } from '@/app/lib/host/actions';
import { RefundProgressPanel } from '@/components/refunds/RefundProgressPanel';

export default async function HostRefundsPage() {
  const refunds = await getHostRefundsData();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Guest Refunds</h1>
        <p className="mt-1 text-sm text-gray-600">Track refund review progress for bookings at your properties.</p>
      </header>
      {refunds.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-600">
          No refund requests are associated with your bookings.
        </p>
      ) : (
        <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
          {refunds.map((refund) => (
            <article key={refund.id} className="p-4 sm:p-5">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-[#1B1A2E]">{refund.listing_title ?? 'Your listing'}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Booking {refund.booking_reference} · Requested {formatDate(refund.created_at, 'long')}
                  </p>
                </div>
                <Link href={`/host/bookings?booking=${refund.booking_id}`} className="text-sm font-semibold text-[#9C2454] hover:underline">
                  View booking
                </Link>
              </header>
              <RefundProgressPanel requests={[refund]} audience="host" />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}