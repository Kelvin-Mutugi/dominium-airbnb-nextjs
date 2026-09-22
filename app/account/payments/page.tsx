// FILE LOCATION: app/account/payments/page.tsx
// Put this file at app/account/payments/page.tsx in your project root (or src/app/account/payments/page.tsx if your project has a src/ folder).

import Link from 'next/link';
import { getAccountContext } from '@/app/lib/account';
import { formatDate, formatMoney, humanize, isPaidStatus } from '@/app/lib/format';
import { routes } from '@/app/lib/routes';
import { EmptyState, PageHeader, StatStrip, StatusBadge, textLink } from '@/components/account/ui';
import type { PaymentRow } from '@/types/account';

export default async function PaymentsPage() {
  const { supabase, user } = await getAccountContext();

  const { data, error } = await supabase
    .from('payments')
    .select(
      `id, amount, currency, status, method, payment_channel, provider, provider_reference,
       paid_at, created_at, authorization_url,
       booking:bookings!inner ( id, check_in, check_out, guest_id, listing:listings ( title, slug ) )`,
    )
    .eq('booking.guest_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  const payments = (data ?? []) as unknown as PaymentRow[];

  const total = (match: (p: PaymentRow) => boolean) =>
    payments.filter(match).reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <>
      <PageHeader title="Payments" description="Every payment made for your bookings." />

      {payments.length === 0 ? (
        <EmptyState
          title="No payments yet"
          body="Payments appear here once you book a stay."
          href={routes.listings}
          cta="Browse stays"
        />
      ) : (
        <>
          <StatStrip
            items={[
              { label: 'Paid', value: formatMoney(total((p) => isPaidStatus(p.status))) },
              { label: 'Awaiting payment', value: formatMoney(total((p) => p.status === 'pending')) },
              { label: 'Refunded', value: formatMoney(total((p) => p.status === 'refunded')) },
            ]}
          />

          <ul className="mt-6 divide-y divide-neutral-200">
            {payments.map((p) => {
              const channel = humanize(p.payment_channel ?? p.method);
              const canResume =
                p.status === 'pending' && !!p.authorization_url && p.authorization_url.startsWith('https://');
              return (
                <li key={p.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">{p.booking?.listing?.title ?? 'Booking payment'}</p>
                    {p.booking && (
                      <p className="mt-0.5 text-sm text-neutral-500">
                        Stay {formatDate(p.booking.check_in, 'noYear')} to {formatDate(p.booking.check_out, 'short')}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-neutral-500">
                      {p.paid_at ? `Paid ${formatDate(p.paid_at, 'long')}` : `Started ${formatDate(p.created_at, 'long')}`}
                      {channel && `, ${channel.toLowerCase()}`}
                    </p>
                    {p.provider_reference && (
                      <p className="mt-1 text-xs text-neutral-400">
                        Reference <span className="font-mono">{p.provider_reference}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                    <p className="font-serif text-lg text-neutral-900">{formatMoney(p.amount, p.currency)}</p>
                    <StatusBadge status={p.status} />
                    {canResume && (
                      <a href={p.authorization_url!} className={textLink}>
                        Complete payment
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm text-neutral-500">
            Questions about a charge?{' '}
            <Link href="/account/bookings" className={textLink}>
              Check the booking it belongs to
            </Link>
            .
          </p>
        </>
      )}
    </>
  );
}