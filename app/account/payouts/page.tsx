// FILE LOCATION: app/account/payouts/page.tsx
// Put this file at app/account/payouts/page.tsx in your project root (or src/app/account/payouts/page.tsx if your project has a src/ folder).

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAccountContext } from '@/app/lib/account';
import { PayoutForm } from '@/components/account/PayoutForm';
import { PageHeader, Section, btnPrimary } from '@/components/account/ui';

export default async function PayoutsPage() {
  const { profile } = await getAccountContext();
  if (profile.role !== 'host') redirect('/account');

  return (
    <>
      <PageHeader title="Payout method" description="Choose where to receive your host earnings." />

      <Section title="Payment details" description="Your payout details are kept private and can be updated any time.">
        <PayoutForm method={profile.payout_method} details={profile.payout_details} />
      </Section>

      <aside className="account-neu-inset mt-4 rounded-2xl p-4 sm:p-5">
        <p className="text-sm leading-6 text-neutral-700">
          For payout amounts, payment status, and booking details, open your host panel.
        </p>
        <Link href="/host/payouts" className={`${btnPrimary} mt-4 w-full sm:w-auto`}>
          Open host payouts
        </Link>
      </aside>
    </>
  );
}