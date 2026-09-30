import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';
import type { CustomerSupportMessage, CustomerSupportThread } from '@/app/customer-support/actions';
import { CustomerSupportThreadCard, type AdminCustomerSupportItem } from '@/components/admin/customer-support/customer-support-thread-card';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminCustomerSupportDetailPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  if (!UUID_PATTERN.test(threadId)) notFound();

  const admin = getSupabaseAdmin();
  const { data: threadRow, error: threadError } = await admin
    .from('customer_support_threads')
    .select('id, booking_id, requester_id, requester_role, status, created_at, updated_at, requester_last_read_at, admin_last_read_at')
    .eq('id', threadId)
    .maybeSingle();
  if (threadError) throw new Error('Unable to load this customer support conversation.');
  if (!threadRow) notFound();
  const thread = threadRow as CustomerSupportThread;

  const [{ data: booking, error: bookingError }, { data: requester, error: requesterError }, { data: messages, error: messagesError }] = await Promise.all([
    admin.from('bookings')
      .select('id, booking_reference, listing_id, guest_id, host_id, check_in, check_out, status, total_amount')
      .eq('id', thread.booking_id)
      .maybeSingle(),
    admin.from('profiles')
      .select('id, full_name, business_name')
      .eq('id', thread.requester_id)
      .maybeSingle(),
    admin.from('customer_support_messages')
      .select('id, thread_id, sender_id, sender_role, body, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })
      .limit(500),
  ]);
  if (bookingError || requesterError || messagesError) throw new Error('Unable to load customer support conversation details.');
  if (!booking) notFound();

  const participantIds = [booking.guest_id, booking.host_id].filter(Boolean);
  const [{ data: listing, error: listingError }, { data: legacyRows, error: legacyError }, { data: participantProfiles, error: participantProfilesError }] = await Promise.all([
    admin.from('listings').select('id, title').eq('id', booking.listing_id).maybeSingle(),
    admin.from('booking_messages')
      .select('id, sender_id, body, created_at')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: true })
      .limit(500),
    participantIds.length
      ? admin.from('profiles').select('id, full_name, business_name').in('id', participantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (listingError || legacyError || participantProfilesError) throw new Error('Unable to load booking history for this conversation.');

  const participantProfileById = new Map((participantProfiles ?? []).map((profile) => [profile.id, profile]));
  const legacyMessages = (legacyRows ?? []).map((message) => {
    const senderRole = message.sender_id === booking.guest_id ? 'Guest' : message.sender_id === booking.host_id ? 'Host' : 'Booking participant';
    const profile = participantProfileById.get(message.sender_id);
    return {
      id: message.id,
      senderRole,
      senderName: profile?.business_name ?? profile?.full_name ?? senderRole,
      body: message.body,
      createdAt: message.created_at,
    };
  });

  const item: AdminCustomerSupportItem = {
    thread,
    messages: (messages ?? []) as CustomerSupportMessage[],
    legacyMessages,
    requesterName: requester?.business_name ?? requester?.full_name ?? `${thread.requester_role === 'guest' ? 'Guest' : 'Host'} account unavailable`,
    requesterRoleLabel: thread.requester_role === 'guest' ? 'Guest' : 'Host',
    requesterId: thread.requester_id,
    listingTitle: listing?.title ?? 'Listing unavailable',
    listingId: booking.listing_id,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    bookingStatus: booking.status,
    bookingReference: booking.booking_reference,
    totalAmount: Number(booking.total_amount),
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D5CF] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase text-[#9C2454]">Booking Messages · Conversation detail</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#1B1A2E]">Booking {booking.booking_reference}</h1>
        </div>
        <Link href="/admin/customer-support" className="inline-flex min-h-10 items-center border border-[#D9D5CF] bg-white px-3.5 py-2 text-sm font-semibold text-[#1B1A2E] hover:bg-[#F7F5F2]">Back to inbox</Link>
      </header>
      <CustomerSupportThreadCard item={item} />
    </div>
  );
}