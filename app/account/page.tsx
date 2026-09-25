import Link from 'next/link';
import { getAccountContext, getGuestBookings } from '@/app/lib/account';
import {
  coverImage,
  dayOfMonth,
  daysUntil,
  formatDate,
  formatMoney,
  nightsBetween,
} from '@/app/lib/format';
import { routes } from '@/app/lib/routes';
import { EmptyState, StatStrip, StatusBadge, btnPrimary, btnSecondary, textLink } from '@/components/account/ui';
import type { BookingView } from '@/types/account';

export default async function AccountOverviewPage() {
  const { supabase, user, profile } = await getAccountContext();
  const { all, upcoming, past, reviewedCount } = await getGuestBookings(user.id);

  const isHost = profile.role === 'host';
  const firstName = profile.full_name.trim().split(/\s+/)[0];
  const next = upcoming[0];
  const awaitingReview = past.filter((b) => !b.reviewed).length;
  const spent = all
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + Number(b.total_amount), 0);

  let owed = 0;
  if (isHost) {
    const { data } = await supabase.from('payouts').select('amount, status').eq('host_id', user.id);
    owed = (data ?? []).filter((p) => p.status === 'owed').reduce((sum, p) => sum + Number(p.amount), 0);
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-3xl text-neutral-900">Welcome back, {firstName}</h1>
        {awaitingReview > 0 && (
          <p className="mt-2 text-neutral-600">
            {awaitingReview === 1 ? 'One stay is' : `${awaitingReview} stays are`} waiting for your review.{' '}
            <Link href="/account/reviews" className={textLink}>
              Write {awaitingReview === 1 ? 'it' : 'them'} now
            </Link>
          </p>
        )}
      </header>

      {next ? (
        <NextStay booking={next} />
      ) : (
        <EmptyState
          title="No trips planned"
          body="When you book a stay, your next check-in will show up here."
          href={routes.listings}
          cta="Browse stays"
        />
      )}

      <StatStrip
        items={[
          { label: 'Upcoming stays', value: upcoming.length },
          { label: 'Past stays', value: past.length },
          { label: 'Spent with us', value: formatMoney(spent) },
          { label: 'Reviews written', value: reviewedCount },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="recent-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="recent-heading" className="font-serif text-xl">
              Recent bookings
            </h2>
            {all.length > 0 && (
              <Link href="/account/bookings" className={textLink}>
                See all bookings
              </Link>
            )}
          </div>

          {all.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">Nothing here yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-200">
              {all.slice(0, 4).map((b) => {
                const image = coverImage(b.listing?.listing_images);
                return (
                  <li key={b.id} className="flex items-center gap-4 py-4">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                      {image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-neutral-900">{b.listing?.title ?? 'Listing unavailable'}</p>
                      <p className="text-sm text-neutral-500">
                        {formatDate(b.check_in, 'noYear')} to {formatDate(b.check_out, 'noYear')}
                      </p>
                    </div>
                    <StatusBadge status={b.expired ? 'expired' : b.status} label={b.expired ? 'Expired' : undefined} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl bg-white p-5 ring-1 ring-neutral-200" aria-labelledby="details-heading">
            <h2 id="details-heading" className="font-serif text-lg">
              Your details
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-neutral-500">Email</dt>
                <dd className="break-all text-neutral-900">{user.email}</dd>
                {!user.email_confirmed_at && <p className="mt-0.5 text-xs text-amber-700">Not verified yet</p>}
              </div>
              <div>
                <dt className="text-neutral-500">Phone</dt>
                <dd className="text-neutral-900">{profile.phone}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Member since</dt>
                <dd className="text-neutral-900">{formatDate(profile.created_at, 'monthYear')}</dd>
              </div>
            </dl>
            <Link href="/account/profile" className={`${textLink} mt-4 inline-block`}>
              Edit profile
            </Link>
          </section>

          {isHost ? (
            <section className="rounded-2xl bg-[#FDF0F5] p-5 ring-1 ring-[#E23E85]/15" aria-labelledby="host-heading">
              <h2 id="host-heading" className="font-serif text-lg text-[#1B1A2E]">
                Hosting
              </h2>
              <p className="mt-2 text-sm text-[#4B4A5A]">
                {profile.host_verified_at
                  ? `Verified host since ${formatDate(profile.host_verified_at, 'monthYear')}.`
                  : profile.kyc_status === 'rejected'
                    ? 'Your host application needs changes before it can be approved.'
                    : profile.kyc_status === 'pending'
                      ? 'Your host application is being reviewed.'
                      : 'Complete host verification to activate your hosting account.'}
              </p>
              {profile.kyc_status === 'rejected' && profile.kyc_rejection_reason && (
                <p className="mt-2 text-sm text-rose-800">{profile.kyc_rejection_reason}</p>
              )}
              {!profile.host_verified_at && (
                <Link href={profile.kyc_status === 'rejected' ? '/host/onboarding' : '/host/pending-review'} className={`${textLink} mt-2 inline-block`}>
                  {profile.kyc_status === 'rejected' ? 'Update application' : 'View verification status'}
                </Link>
              )}
              <p className="mt-3 font-serif text-2xl text-[#1B1A2E]">{formatMoney(owed)}</p>
              <p className="text-sm text-[#4B4A5A]">owed to you</p>
              <Link href="/account/payouts" className={`${btnSecondary} mt-4 w-full`}>
                View payouts
              </Link>
            </section>
          ) : profile.role === 'guest' ? (
            <section className="rounded-2xl bg-[#FDF0F5] p-5 ring-1 ring-[#E23E85]/15" aria-labelledby="become-host-heading">
              <h2 id="become-host-heading" className="font-serif text-lg text-[#1B1A2E]">
                Have a space to share?
              </h2>
              <p className="mt-2 text-sm text-[#4B4A5A]">List your place on Dominium BnB and start welcoming guests.</p>
              <Link href={routes.becomeHost} className={`${btnPrimary} mt-4 w-full`}>
                Become a host
              </Link>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function NextStay({ booking: b }: { booking: BookingView }) {
  const away = daysUntil(b.check_in);
  const nights = nightsBetween(b.check_in, b.check_out);
  const checkInImage = coverImage(b.listing?.listing_images);
  const when =
    away > 1
      ? `Check-in is in ${away} days`
      : away === 1
        ? 'Check-in is tomorrow'
        : away === 0
          ? 'Check-in is today'
          : 'You’re staying here now';

  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200 sm:flex-row">
      {/* Date stub */}
      <div className="relative flex shrink-0 items-center gap-4 overflow-hidden bg-[#1B1A2E] px-6 py-5 text-white sm:w-48 sm:flex-col sm:justify-center sm:gap-1 sm:py-8 sm:text-center">
        {checkInImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={checkInImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-black/45" />
        <div className="relative z-10">
          <p className="font-serif text-6xl leading-none">{dayOfMonth(b.check_in)}</p>
          <div>
            <p className="text-sm text-white/85">{formatDate(b.check_in, 'monthYear')}</p>
            <p className="text-xs text-[#F3A7C5]">Check-in day</p>
          </div>
        </div>
      </div>

      {/* Perforation */}
      <div aria-hidden="true" className="border-t-2 border-dashed border-neutral-300 sm:hidden" />
      <div aria-hidden="true" className="relative hidden w-0 border-l-2 border-dashed border-neutral-300 sm:block">
        <span className="absolute -left-[13px] -top-3 h-6 w-6 rounded-full bg-neutral-50" />
        <span className="absolute -bottom-3 -left-[13px] h-6 w-6 rounded-full bg-neutral-50" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-5 p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#E23E85]">{when}</p>
            {b.status === 'pending' && <StatusBadge status="pending" label="Awaiting payment" />}
          </div>
          <h2 className="mt-1 font-serif text-2xl leading-snug text-neutral-900">{b.listing?.title ?? 'Your stay'}</h2>
          {b.listing && (
            <p className="mt-1 text-sm text-neutral-500">
              {b.listing.town}, {b.listing.county}
            </p>
          )}
        </div>

        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-neutral-500">Check-out</dt>
            <dd className="mt-0.5 font-medium text-neutral-900">{formatDate(b.check_out, 'noYear')}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Length</dt>
            <dd className="mt-0.5 font-medium text-neutral-900">
              {nights} {nights === 1 ? 'night' : 'nights'}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Guests</dt>
            <dd className="mt-0.5 font-medium text-neutral-900">{b.guests_count}</dd>
          </div>
        </dl>

        {b.listing?.check_in_time && (
          <p className="text-sm text-neutral-500">Check-in from {b.listing.check_in_time}.</p>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/account/bookings" className={btnPrimary}>
            Manage booking
          </Link>
          {b.listing && (
            <Link href={`/apartments/${b.listing.id}`} className={btnSecondary}>
              View listing
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}