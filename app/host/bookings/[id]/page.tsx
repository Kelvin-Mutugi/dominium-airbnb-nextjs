import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/server';
import { requireHost } from '@/app/lib/host-auth';
import { formatDate } from '@/app/lib/format';
import { getCustomerSupportConversation } from '@/app/customer-support/actions';
import { CustomerSupportThreadView } from '@/components/account/CustomerSupportThread';
import { btnSecondary } from '@/components/account/ui';

export default async function HostBookingThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireHost();
  const supabase = await createClient();
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, booking_reference, guest_id, host_id, check_in, check_out, status, listing:listings(title)')
    .eq('id', id)
    .eq('host_id', user.id)
    .maybeSingle();
  if (bookingError) throw new Error('Unable to load this booking.');
  if (!booking) notFound();

  const conversation = await getCustomerSupportConversation(id);
  const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/host/bookings" className={`${btnSecondary} mb-6`}>Back to host bookings</Link>
      <header className="mb-8 border-b border-neutral-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E23E85]">Booking messages · {booking.booking_reference} · {booking.status}</p>
        <h1 className="mt-2 font-serif text-3xl text-neutral-900">{listing?.title ?? 'Your listing'}</h1>
        <p className="mt-2 text-sm text-neutral-600">Booking reference: {booking.booking_reference} · {formatDate(booking.check_in, 'noYear')} to {formatDate(booking.check_out, 'short')}</p>
      </header>
      <CustomerSupportThreadView thread={conversation.thread} messages={conversation.messages} />
    </div>
  );
}