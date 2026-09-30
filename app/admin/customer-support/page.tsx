import { getSupabaseAdmin } from '@/app/lib/supabase/admin';
import {
  CustomerSupportThreadPreview,
  type CustomerSupportPreviewItem,
} from '@/components/admin/customer-support/customer-support-thread-preview';
import type { CustomerSupportThreadStatus } from '@/app/customer-support/actions';

const STATUSES: { value: CustomerSupportThreadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'waiting_on_admin', label: 'Needs reply' },
  { value: 'waiting_on_requester', label: 'Waiting' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

function hrefFor(status: string, query: string) {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (query) params.set('q', query);
  const suffix = params.toString();
  return suffix ? `/admin/customer-support?${suffix}` : '/admin/customer-support';
}

export default async function AdminCustomerSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.some((item) => item.value === params.status) ? params.status ?? 'all' : 'all';
  const query = (params.q ?? '').trim().slice(0, 100).toLowerCase();
  const admin = getSupabaseAdmin();
  const { data: threadRows, error: threadsError } = await admin
    .from('customer_support_threads')
    .select('id, booking_id, requester_id, requester_role, status, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (threadsError) throw new Error('Unable to load customer support conversations. Apply the customer support migration and try again.');

  const threads = threadRows ?? [];
  const requesterIds = [...new Set(threads.map((thread) => thread.requester_id))];
  const bookingIds = [...new Set(threads.map((thread) => thread.booking_id))];
  const [{ data: profiles, error: profilesError }, { data: bookings, error: bookingsError }, { data: messageRows, error: messagesError }] = await Promise.all([
    requesterIds.length
      ? admin.from('profiles').select('id, full_name, business_name').in('id', requesterIds)
      : Promise.resolve({ data: [], error: null }),
    bookingIds.length
      ? admin.from('bookings').select('id, listing_id, check_in, check_out').in('id', bookingIds)
      : Promise.resolve({ data: [], error: null }),
    threads.length
      ? admin.from('customer_support_messages')
          .select('thread_id, sender_role, body, created_at')
          .in('thread_id', threads.map((thread) => thread.id))
          .order('created_at', { ascending: false })
          .limit(1000)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesError || bookingsError || messagesError) throw new Error('Unable to load customer support previews.');

  const bookingRows = bookings ?? [];
  const listingIds = [...new Set(bookingRows.map((booking) => booking.listing_id).filter(Boolean))];
  const { data: listings, error: listingsError } = listingIds.length
    ? await admin.from('listings').select('id, title').in('id', listingIds)
    : { data: [], error: null };
  if (listingsError) throw new Error('Unable to load listing names for customer support previews.');

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const bookingById = new Map(bookingRows.map((booking) => [booking.id, booking]));
  const listingById = new Map((listings ?? []).map((listing) => [listing.id, listing.title]));
  const latestMessageByThread = new Map<string, { sender_role: 'guest' | 'host' | 'admin'; body: string }>();
  for (const message of messageRows ?? []) {
    if (!latestMessageByThread.has(message.thread_id)) {
      latestMessageByThread.set(message.thread_id, { sender_role: message.sender_role, body: message.body });
    }
  }

  const previews: CustomerSupportPreviewItem[] = threads.flatMap((thread) => {
    const booking = bookingById.get(thread.booking_id);
    if (!booking) return [];
    const profile = profileById.get(thread.requester_id);
    const latestMessage = latestMessageByThread.get(thread.id);
    return [{
      id: thread.id,
      bookingId: thread.booking_id,
      status: thread.status as CustomerSupportThreadStatus,
      requesterName: profile?.business_name ?? profile?.full_name ?? `${thread.requester_role === 'guest' ? 'Guest' : 'Host'} account unavailable`,
      requesterRole: thread.requester_role as 'guest' | 'host',
      listingTitle: listingById.get(booking.listing_id) ?? 'Listing unavailable',
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      updatedAt: thread.updated_at,
      latestMessage: latestMessage?.body ?? null,
      latestSender: latestMessage?.sender_role ?? null,
    }];
  }).filter((item) => {
    if (status !== 'all' && item.status !== status) return false;
    if (!query) return true;
    return [item.id, item.bookingId, item.requesterName, item.requesterRole, item.listingTitle, item.latestMessage]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const needsReplyCount = threads.filter((thread) => thread.status === 'waiting_on_admin').length;
  const tabs = STATUSES.map((item) => ({
    ...item,
    count: item.value === 'all'
      ? threads.length
      : threads.filter((thread) => thread.status === item.value).length,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D9D5CF] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase text-[#9C2454]">Private booking conversations · Admin only</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#1B1A2E]">Booking Messages</h1>
          <p className="mt-1 text-sm text-[#5F5D69]">Quick booking questions and stay coordination. Formal payment, refund, complaint, and dispute cases are in Support Cases &amp; Disputes.</p>
        </div>
        <p className="text-sm font-medium text-[#5F5D69]"><span className="font-semibold text-[#9C2454]">{needsReplyCount}</span> need a reply</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D5CF] pb-3">
        <nav aria-label="Filter customer support conversations" className="flex flex-wrap gap-1">
          {tabs.map((item) => (
            <a key={item.value} href={hrefFor(item.value, query)} aria-current={status === item.value ? 'page' : undefined} className={`rounded-md px-3 py-2 text-sm ${status === item.value ? 'bg-[#1B1A2E] text-white' : 'text-[#5F5D69] hover:bg-[#F2F0EC]'}`}>
              {item.label} <span className={`ml-1 tabular-nums ${status === item.value ? 'text-white/70' : 'text-[#96939E]'}`}>{item.count}</span>
            </a>
          ))}
        </nav>
        <form action="/admin/customer-support" className="flex w-full max-w-md gap-2">
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <label htmlFor="customer-support-search" className="sr-only">Search booking, requester, listing, or latest message</label>
          <input id="customer-support-search" name="q" type="search" defaultValue={params.q ?? ''} maxLength={100} placeholder="Search booking, person, or listing" className="min-w-0 flex-1 rounded-md border border-[#D9D5CF] bg-white px-3 py-2 text-sm text-[#1B1A2E] placeholder:text-gray-400 focus:border-[#9C2454] focus:outline-none focus:ring-2 focus:ring-[#9C2454]/20" />
          <button type="submit" className="rounded-md bg-[#1B1A2E] px-4 py-2 text-sm font-medium text-white hover:bg-[#302F43]">Search</button>
        </form>
      </div>

      <p className="text-xs text-[#797783]">{previews.length} {previews.length === 1 ? 'conversation' : 'conversations'} shown · latest 200</p>
      {previews.length === 0 ? (
        <p className="border-y border-[#D9D5CF] bg-white px-4 py-12 text-center text-sm text-[#797783]">No customer support conversations match this view.</p>
      ) : (
        <section aria-label="Customer support conversations" className="border-t border-[#D9D5CF]">
          {previews.map((item) => <CustomerSupportThreadPreview key={item.id} item={item} />)}
        </section>
      )}
    </div>
  );
}