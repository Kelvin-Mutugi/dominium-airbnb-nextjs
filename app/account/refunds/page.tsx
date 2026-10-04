import Link from 'next/link';
import { getGuestRefundsData } from '@/app/lib/account';
import { formatDate } from '@/app/lib/format';
import { RefundProgressPanel } from '@/components/refunds/RefundProgressPanel';
import { PageHeader } from '@/components/account/ui';

export default async function AccountRefundsPage() {
  const refunds = await getGuestRefundsData();

  return (
    <div className="space-y-5">
      <PageHeader title="Refunds" description="Track refund reviews and payments for your bookings." />
      {refunds.length === 0 ? (
        <p className="account-neu-surface rounded-2xl px-4 py-8 text-center text-sm text-neutral-600">
          You don’t have any refund requests yet.
        </p>
      ) : (
        <div className="space-y-4">
          {refunds.map((refund) => (
            <article key={refund.id} className="account-neu-surface rounded-2xl p-4 sm:p-5">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-neutral-900">{refund.listing_title ?? 'Your stay'}</h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    Booking {refund.booking_reference} · Requested {formatDate(refund.created_at, 'long')}
                  </p>
                </div>
                <Link href={`/account/bookings`} className="text-sm font-semibold text-[#9C2454] hover:underline">
                  View booking
                </Link>
              </header>
              <RefundProgressPanel requests={[refund]} audience="guest" />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}