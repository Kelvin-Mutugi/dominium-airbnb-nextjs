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
    checkInTime: listing.check_in_time,
    checkOutTime: listing.check_out_time,
    directions: arrivalGuide?.arrival_directions ?? null,
    checkInInstructions: arrivalGuide?.check_in_instructions ?? null,
    wifiName: arrivalGuide?.wifi_name ?? null,
    wifiPassword: arrivalGuide?.wifi_password ?? null,
    localTips: arrivalGuide?.local_tips ?? null,
  };
  const hasGuideDetails = [guide.address, guide.directions, guide.checkInInstructions, guide.wifiName, guide.wifiPassword, guide.localTips].some(Boolean);

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