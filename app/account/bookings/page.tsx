// FILE LOCATION: app/account/bookings/page.tsx
// Put this file at app/account/bookings/page.tsx in your project root (or src/app/account/bookings/page.tsx if your project has a src/ folder).

import Link from 'next/link';
import { getAccountContext, getGuestBookings } from '@/app/lib/account';
import { routes } from '@/app/lib/routes';
import { BookingsTabs } from '@/components/account/BookingsTabs';
import { EmptyState, PageHeader, btnSecondary } from '@/components/account/ui';

export default async function BookingsPage() {
  const { user } = await getAccountContext();
  const { all, upcoming, past, cancelled } = await getGuestBookings(user.id);

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Your stays, past and planned."
        action={
          <Link href={routes.listings} className={btnSecondary}>
            Find another stay
          </Link>
        }
      />
      {all.length === 0 ? (
        <EmptyState
          title="You haven’t booked a stay yet"
          body="Browse listings across Kenya and your bookings will be kept here."
          href={routes.listings}
          cta="Browse stays"
        />
      ) : (
        <BookingsTabs upcoming={upcoming} past={past} cancelled={cancelled} />
      )}
    </>
  );
}