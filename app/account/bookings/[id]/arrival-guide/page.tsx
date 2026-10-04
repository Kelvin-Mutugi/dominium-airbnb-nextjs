import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAccountContext } from '@/app/lib/account';
import { formatDate } from '@/app/lib/format';
import { ArrivalGuideActions, type ArrivalGuideContent } from '@/components/account/ArrivalGuideActions';
import { btnSecondary } from '@/components/account/ui';

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="account-neu-surface rounded-2xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-neutral-600">{title}</h2>
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
      id, booking_reference, guest_id, status, check_in, check_out,
      listing:listings (
        id, title, town, county, latitude, longitude, check_in_time, check_out_time
      )
    `)
    .eq('id', id)
    .eq('guest_id', user.id)
    .maybeSingle();

  if (error) throw new Error('Unable to load the arrival guide. Apply the listing arrival guide migration and try again.');
  if (!booking || !['confirmed', 'completed'].includes(booking.status)) notFound();

  const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;
  if (!listing) notFound();
  const { data: arrivalGuides, error: guideError } = await supabase.rpc('get_guest_arrival_guide', {
    p_booking_id: id,
  });
  if (guideError) throw new Error('Unable to load the private arrival guide. Apply the listing arrival guide migration and try again.');
  const arrivalGuide = arrivalGuides?.[0] ?? null;
  const address = [arrivalGuide?.arrival_address, listing.town, listing.county].filter(Boolean).join(', ');
  const guide: ArrivalGuideContent = {
    listingTitle: listing.title,
    dates: `${formatDate(booking.check_in, 'long')} to ${formatDate(booking.check_out, 'long')}`,
    address: address || null,
    latitude: listing.latitude == null ? null : Number(listing.latitude),
    longitude: listing.longitude == null ? null : Number(listing.longitude),
    checkInTime: listing.check_in_time,
    checkOutTime: listing.check_out_time,
    directions: arrivalGuide?.arrival_directions ?? null,
    checkInInstructions: arrivalGuide?.check_in_instructions ?? null,
    wifiName: arrivalGuide?.wifi_name ?? null,
    wifiPassword: arrivalGuide?.wifi_password ?? null,
    localTips: arrivalGuide?.local_tips ?? null,
  };
  const hasGuideDetails = [guide.address, guide.directions, guide.checkInInstructions, guide.wifiName, guide.wifiPassword, guide.localTips].some(Boolean);
  const hasPinnedLocation = guide.latitude !== null && guide.longitude !== null;
  const mapDelta = 0.003;
  const mapBounds = hasPinnedLocation
    ? [guide.longitude! - mapDelta, guide.latitude! - mapDelta, guide.longitude! + mapDelta, guide.latitude! + mapDelta].join(',')
    : '';
  const mapEmbedUrl = hasPinnedLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapBounds}&layer=mapnik&marker=${guide.latitude},${guide.longitude}`
    : null;
  const directionsUrl = hasPinnedLocation
    ? `https://www.google.com/maps/dir/?api=1&destination=${guide.latitude},${guide.longitude}`
    : null;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 text-neutral-900 sm:px-8 print:max-w-none print:px-0 print:py-0">
      <Link href="/account/bookings" className={`${btnSecondary} mb-6 print:hidden`}>Back to bookings</Link>
      <header className="account-neu-surface mb-6 rounded-3xl p-4 sm:p-6">
        <p className="text-xs font-semibold text-[#9C2454]">Arrival guide · Booking {booking.booking_reference}</p>
        <h1 className="mt-2 font-serif text-2xl sm:text-3xl">{listing.title}</h1>
        <p className="mt-2 text-sm text-neutral-600">{guide.dates}</p>
        <div className="mt-5"><ArrivalGuideActions guide={guide} /></div>
      </header>

      <div className="grid gap-3">
        <GuideSection title="Check-in and check-out">
          {`Check-in: ${guide.checkInTime || 'Contact customer support for the check-in time'}\nCheck-out: ${guide.checkOutTime || 'Contact customer support for the check-out time'}`}
        </GuideSection>
        {guide.address && <GuideSection title="Address">{guide.address}</GuideSection>}
        {mapEmbedUrl && directionsUrl && (
          <section className="account-neu-surface rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-neutral-600">Pinned location</h2>
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-full bg-[#1B1A2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#302F43]">
                Open directions
              </a>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200">
              <iframe title={`Exact arrival location for ${listing.title}`} src={mapEmbedUrl} className="h-[320px] w-full" loading="lazy" />
            </div>
          </section>
        )}
        {guide.directions && <GuideSection title="Directions">{guide.directions}</GuideSection>}
        {guide.checkInInstructions && <GuideSection title="Check-in steps">{guide.checkInInstructions}</GuideSection>}
        {(guide.wifiName || guide.wifiPassword) && (
          <GuideSection title="Wi-Fi">{`Network: ${guide.wifiName || 'Not provided'}\nPassword: ${guide.wifiPassword || 'Not provided'}`}</GuideSection>
        )}
        {guide.localTips && <GuideSection title="Local tips">{guide.localTips}</GuideSection>}
        {!hasGuideDetails && (
          <p className="py-6 text-sm leading-6 text-neutral-600">Detailed arrival instructions haven’t been added yet. Contact customer support about this booking for help with arrival details.</p>
        )}
      </div>

      <footer className="account-neu-inset mt-6 rounded-2xl p-4 text-sm text-neutral-600 print:hidden">
        <p>Keep your offline copy private; it may contain access information.</p>
        <Link href={`/account/bookings/${booking.id}`} className="mt-2 inline-block font-semibold text-[#9C2454] underline underline-offset-2">Contact customer support about this booking</Link>
      </footer>
    </main>
  );
}