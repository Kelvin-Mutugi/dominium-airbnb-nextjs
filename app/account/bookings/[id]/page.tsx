import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAccountContext } from '@/app/lib/account';
import { formatDate, formatMoney } from '@/app/lib/format';
import { getCustomerSupportConversation } from '@/app/customer-support/actions';
import { CustomerSupportThreadView } from '@/components/account/CustomerSupportThread';
import { btnSecondary } from '@/components/account/ui';

export default async function GuestBookingThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getAccountContext();
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, booking_reference, guest_id, check_in, check_out, total_amount, status, listing:listings(title)')
    .eq('id', id)
    .eq('guest_id', user.id)
    .maybeSingle();
  if (bookingError) throw new Error('Unable to load this booking.');
  if (!booking) notFound();

  const conversation = await getCustomerSupportConversation(id);
  const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/account/bookings" className={`${btnSecondary} mb-6`}>Back to bookings</Link>
      <header className="mb-8 border-b border-neutral-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E23E85]">Booking messages · {booking.booking_reference} · {booking.status}</p>
        <h1 className="mt-2 font-serif text-3xl text-neutral-900">{listing?.title ?? 'Your stay'}</h1>
        <p className="mt-2 text-sm text-neutral-600">{formatDate(booking.check_in, 'noYear')} to {formatDate(booking.check_out, 'short')} · {formatMoney(booking.total_amount)}</p>
      </header>
      <CustomerSupportThreadView thread={conversation.thread} messages={conversation.messages} />
    </div>
  );
}