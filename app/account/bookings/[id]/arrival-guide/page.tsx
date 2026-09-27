import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAccountContext } from '@/app/lib/account';
import { formatDate } from '@/app/lib/format';
import { ArrivalGuideActions, type ArrivalGuideContent } from '@/components/account/ArrivalGuideActions';
import { btnSecondary } from '@/components/account/ui';

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-neutral-200 py-5 first:border-t-0 first:pt-0">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
      <div className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-neutral-800">{children}</div>
    </section>
  );
}

export default async function ArrivalGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getAccountContext();
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      id, guest_id, status, check_in, check_out,
      listing:listings (
        id, title, town, county, check_in_time, check_out_time
      )
    `)
    .eq('id', id)
    .eq('guest_id', user.id)
    .maybeSingle();

  if (error) throw new Error('Unable to load the arrival guide. Apply the listing arrival guide migration and try again.');
  if (!booking || !['confirmed', 'completed'].includes(booking.status)) notFound();

  const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;
  if (!listing) notFound();
  const { data: arrivalGuide, error: guideError } = await supabase
    .from('listing_arrival_guides')
    .select('arrival_address, arrival_directions, check_in_instructions, wifi_name, wifi_password, arrival_contact, local_tips')
    .eq('listing_id', listing.id)
    .maybeSingle();
  if (guideError) throw new Error('Unable to load the private arrival guide. Apply the listing arrival guide migration and try again.');
  const address = [arrivalGuide?.arrival_address, listing.town, listing.county].filter(Boolean).join(', ');
  const guide: ArrivalGuideContent = {
    listingTitle: listing.title,
    dates: `${formatDate(booking.check_in, 'long')} to ${formatDate(booking.check_out, 'long')}`,
    address: address || null,
    checkInTime: listing.check_in_time,
    checkOutTime: listing.check_out_time,
    directions: arrivalGuide?.arrival_directions ?? null,
    checkInInstructions: arrivalGuide?.check_in_instructions ?? null,
    wifiName: arrivalGuide?.wifi_name ?? null,
    wifiPassword: arrivalGuide?.wifi_password ?? null,
    arrivalContact: arrivalGuide?.arrival_contact ?? null,
    localTips: arrivalGuide?.local_tips ?? null,
  };
  const hasGuideDetails = [guide.address, guide.directions, guide.checkInInstructions, guide.wifiName, guide.wifiPassword, guide.arrivalContact, guide.localTips].some(Boolean);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 text-neutral-900 sm:px-8 print:max-w-none print:px-0 print:py-0">
      <Link href="/account/bookings" className={`${btnSecondary} mb-6 print:hidden`}>Back to bookings</Link>
      <header className="mb-7 border-b border-neutral-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9C2454]">Arrival guide · Booking {booking.id.slice(0, 8)}</p>
        <h1 className="mt-2 font-serif text-3xl">{listing.title}</h1>
        <p className="mt-2 text-sm text-neutral-600">{guide.dates}</p>
        <div className="mt-5"><ArrivalGuideActions guide={guide} /></div>
      </header>

      <div className="divide-y divide-neutral-200">
        <GuideSection title="Check-in and check-out">
          {`Check-in: ${guide.checkInTime || 'Contact your host for the check-in time'}\nCheck-out: ${guide.checkOutTime || 'Contact your host for the check-out time'}`}
        </GuideSection>
        {guide.address && <GuideSection title="Address">{guide.address}</GuideSection>}
        {guide.directions && <GuideSection title="Directions">{guide.directions}</GuideSection>}
        {guide.checkInInstructions && <GuideSection title="Check-in steps">{guide.checkInInstructions}</GuideSection>}
        {(guide.wifiName || guide.wifiPassword) && (
          <GuideSection title="Wi-Fi">{`Network: ${guide.wifiName || 'Not provided'}\nPassword: ${guide.wifiPassword || 'Not provided'}`}</GuideSection>
        )}
        {guide.arrivalContact && <GuideSection title="Arrival contact">{guide.arrivalContact}</GuideSection>}
        {guide.localTips && <GuideSection title="Local tips">{guide.localTips}</GuideSection>}
        {!hasGuideDetails && (
          <p className="py-6 text-sm leading-6 text-neutral-600">Your host hasn’t added detailed arrival instructions yet. Use the trip thread to ask for directions or check-in details.</p>
        )}
      </div>

      <footer className="mt-8 border-t border-neutral-200 pt-5 text-sm text-neutral-600 print:hidden">
        <p>Keep your offline copy private; it may contain access information.</p>
        <Link href={`/account/bookings/${booking.id}`} className="mt-2 inline-block font-semibold text-[#9C2454] underline underline-offset-2">Message your host in the trip thread</Link>
      </footer>
    </main>
  );
}