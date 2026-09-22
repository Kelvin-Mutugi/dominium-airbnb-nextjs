// FILE LOCATION: app/account/payouts/page.tsx
// Put this file at app/account/payouts/page.tsx in your project root (or src/app/account/payouts/page.tsx if your project has a src/ folder).

import { redirect } from 'next/navigation';
import { getAccountContext } from '@/app/lib/account';
import { formatDate, formatMoney } from '@/app/lib/format';
import { PayoutForm } from '@/components/account/PayoutForm';
import { EmptyState, PageHeader, Section, StatStrip, StatusBadge } from '@/components/account/ui';
import type { PayoutRow } from '@/types/account';

export default async function PayoutsPage() {
  const { supabase, user, profile } = await getAccountContext();
  if (profile.role !== 'host') redirect('/account');

  const { data, error } = await supabase
    .from('payouts')
    .select(
      'id, amount, status, paid_at, created_at, booking:bookings ( check_in, check_out, listing:listings ( title ) )',
    )
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  const payouts = (data ?? []) as unknown as PayoutRow[];

  const sum = (status: string) =>
    payouts.filter((p) => p.status === status).reduce((total, p) => total + Number(p.amount), 0);
  const owed = sum('owed');
  const paid = sum('paid');

  return (
    <>
      <PageHeader title="Payouts" description="Earnings from your bookings and where we send them." />

      <StatStrip
        items={[
          { label: 'Owed to you', value: formatMoney(owed) },
          { label: 'Paid out', value: formatMoney(paid) },
          { label: 'Total earned', value: formatMoney(owed + paid) },
        ]}
      />

      <div className="mt-8">
        <Section title="Payout method" description="Where we send your earnings.">
          <PayoutForm method={profile.payout_method} details={profile.payout_details} />
        </Section>

        <Section
          title="Verification"
          description="Guests see a verified badge on your listings once you’re approved."
        >
          <p className="text-sm text-neutral-700">
            {profile.host_verified_at
              ? `You’ve been a verified host since ${formatDate(profile.host_verified_at, 'long')}.`
              : 'Your verification is still pending. We’ll email you when it’s complete.'}
          </p>
        </Section>

        <Section title="History" description="One payout per booking.">
          {payouts.length === 0 ? (
            <EmptyState title="No payouts yet" body="Your earnings show up here after guests book your listings." />
          ) : (
            <ul className="divide-y divide-neutral-200">
              {payouts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">{p.booking?.listing?.title ?? 'Booking'}</p>
                    <p className="text-sm text-neutral-500">
                      {p.booking
                        ? `Stay ${formatDate(p.booking.check_in, 'noYear')} to ${formatDate(p.booking.check_out, 'short')}`
                        : formatDate(p.created_at, 'long')}
                      {p.paid_at && `, paid ${formatDate(p.paid_at, 'long')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-serif text-lg text-neutral-900">{formatMoney(p.amount)}</p>
                    <StatusBadge status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}