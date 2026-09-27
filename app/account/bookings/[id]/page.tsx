import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAccountContext } from '@/app/lib/account';
import { formatDate, formatMoney } from '@/app/lib/format';
import { BookingThread } from '@/components/account/BookingThread';
import { btnSecondary } from '@/components/account/ui';

export default async function GuestBookingThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getAccountContext();
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, guest_id, check_in, check_out, total_amount, status, listing:listings(title)')
    .eq('id', id)
    .eq('guest_id', user.id)
    .maybeSingle();
  if (bookingError) throw new Error('Unable to load this booking.');
  if (!booking) notFound();

  const [{ data: messages, error: messageError }, { data: updates, error: updateError }] = await Promise.all([
    supabase.from('booking_messages').select('id, sender_id, body, created_at').eq('booking_id', id).order('created_at', { ascending: true }).limit(250),
    supabase.from('booking_updates').select('id, event_type, summary, created_at').eq('booking_id', id).order('created_at', { ascending: false }).limit(100),
  ]);
  if (messageError || updateError) throw new Error('Unable to load this trip thread. Apply the in-app trip support migration and try again.');
  const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/account/bookings" className={`${btnSecondary} mb-6`}>Back to bookings</Link>
      <header className="mb-8 border-b border-neutral-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E23E85]">Booking {booking.id.slice(0, 8)} · {booking.status}</p>
        <h1 className="mt-2 font-serif text-3xl text-neutral-900">{listing?.title ?? 'Your stay'}</h1>
        <p className="mt-2 text-sm text-neutral-600">{formatDate(booking.check_in, 'noYear')} to {formatDate(booking.check_out, 'short')} · {formatMoney(booking.total_amount)}</p>
      </header>
      <BookingThread bookingId={booking.id} currentUserId={user.id} messages={messages ?? []} updates={updates ?? []} />
    </div>
  );
}