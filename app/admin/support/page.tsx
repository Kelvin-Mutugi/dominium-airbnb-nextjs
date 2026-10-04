import Link from 'next/link';
import { formatDate, humanize } from '@/app/lib/format';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';
import { SupportCaseUpdateForm } from '@/components/admin/support/support-case-update-form';

type CaseRow = {
  id: string;
  user_id: string;
  booking_id: string | null;
  category: string;
  subject: string;
  message: string;
  status: string;
  public_reply: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

type CaseMessageRow = {
  id: string;
  case_id: string;
  sender_role: 'requester' | 'support';
  body: string;
  created_at: string;
};

type RelatedBooking = {
  id: string;
  booking_reference: string;
  listing_id: string;
  guest_name: string | null;
  guest_email: string | null;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
};

const STATUSES = ['all', 'new', 'in_review', 'waiting_on_user', 'resolved', 'closed'];
const CASE_STATUS_STYLES: Record<string, string> = {
  new: 'bg-sky-50 text-sky-800',
  in_review: 'bg-amber-50 text-amber-800',
  waiting_on_user: 'bg-orange-50 text-orange-800',
  resolved: 'bg-emerald-50 text-emerald-800',
  closed: 'bg-gray-100 text-gray-700',
};

function hrefFor(status: string, query: string, listingId: string | null) {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (query) params.set('q', query);
  if (listingId) params.set('listingId', listingId);
  const suffix = params.toString();
  return suffix ? `/admin/support?${suffix}` : '/admin/support';
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; listingId?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status ?? 'all') ? params.status ?? 'all' : 'all';
  const query = (params.q ?? '').trim().slice(0, 100).toLowerCase();
  const listingId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.listingId ?? '')
    ? params.listingId!
    : null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('support_cases')
    .select('id, user_id, booking_id, category, subject, message, status, public_reply, admin_notes, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) throw new Error('Unable to load support cases. Apply the support_cases migration and try again.');

  const cases = (data ?? []) as CaseRow[];
  const caseIds = cases.map((item) => item.id);
  const { data: caseMessages, error: messagesError } = caseIds.length
    ? await admin
      .from('support_case_messages')
      .select('id, case_id, sender_role, body, created_at')
      .in('case_id', caseIds)
      .order('created_at', { ascending: true })
    : { data: [], error: null };
  if (messagesError) throw new Error('Unable to load support case conversations. Apply the support case messages migration and try again.');
  const messagesByCase = new Map<string, CaseMessageRow[]>();
  for (const message of (caseMessages ?? []) as CaseMessageRow[]) {
    const messages = messagesByCase.get(message.case_id) ?? [];
    messages.push(message);
    messagesByCase.set(message.case_id, messages);
  }
  const userIds = [...new Set(cases.map((item) => item.user_id).filter(Boolean))];
  const bookingIds = [...new Set(cases.map((item) => item.booking_id).filter((id): id is string => Boolean(id)))];
  const [{ data: profiles, error: profileError }, { data: bookings, error: bookingError }] = await Promise.all([
    userIds.length
      ? admin.from('profiles').select('id, full_name, business_name').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    bookingIds.length
      ? admin.from('bookings').select('id, booking_reference, listing_id, guest_name, guest_email').in('id', bookingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profileError || bookingError) throw new Error('Unable to load support case details.');

  const relatedBookings = (bookings ?? []) as RelatedBooking[];
  const listingIds = [...new Set(relatedBookings.map((booking) => booking.listing_id).filter(Boolean))];
  const { data: listings, error: listingError } = listingIds.length
    ? await admin.from('listings').select('id, title').in('id', listingIds)
    : { data: [], error: null };
  if (listingError) throw new Error('Unable to load support listing names.');

  const profileById = new Map(((profiles ?? []) as UserProfile[]).map((profile) => [profile.id, profile]));
  const bookingById = new Map(relatedBookings.map((booking) => [booking.id, booking]));
  const listingById = new Map((listings ?? []).map((listing) => [listing.id, listing.title]));
  const visibleCases = cases.filter((item) => {
    if (status !== 'all' && item.status !== status) return false;
    const associatedListingId = item.booking_id ? bookingById.get(item.booking_id)?.listing_id : null;
    if (listingId && associatedListingId !== listingId) return false;
    if (!query) return true;
    const profile = profileById.get(item.user_id);
    const booking = item.booking_id ? bookingById.get(item.booking_id) : null;
    return [
      item.subject,
      item.message,
      item.category,
      item.id,
      profile?.full_name,
      profile?.business_name,
      booking?.guest_name,
      booking?.guest_email,
      booking ? listingById.get(booking.listing_id) : null,
      item.booking_id,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Support cases &amp; disputes</h1>
        <p className="mt-1 text-sm text-gray-600">Formal guest and host cases for payments, refunds, complaints, safety concerns, and disputes. Quick booking conversations are in Booking Messages.</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
        <nav aria-label="Filter cases by status" className="flex flex-wrap gap-1">
          {STATUSES.map((item) => (
            <Link
              key={item}
              href={hrefFor(item, query, listingId)}
              aria-current={status === item ? 'page' : undefined}
              className={`rounded-md px-3 py-2 text-sm ${status === item ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {item === 'all' ? 'All' : humanize(item)}
            </Link>
          ))}
        </nav>
        <form action="/admin/support" className="flex w-full max-w-md gap-2">
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          {listingId && <input type="hidden" name="listingId" value={listingId} />}
          <label className="sr-only" htmlFor="support-search">Search cases</label>
          <input id="support-search" name="q" type="search" defaultValue={params.q ?? ''} maxLength={100} placeholder="Search person, booking, or request" className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1B1A2E] placeholder:text-gray-400 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
          <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">Search</button>
          {(query || listingId) && <Link href={hrefFor(status, '', null)} className="self-center text-sm text-gray-500 hover:text-gray-900">Clear</Link>}
        </form>
      </div>

      {listingId && <p className="text-sm text-gray-600">Filtered to cases related to listing <span className="font-mono">{listingId.slice(0, 8)}</span>. <Link href={hrefFor(status, query, null)} className="font-medium text-[#CF2F74] hover:underline">Clear listing filter</Link></p>}

      <p className="text-xs text-gray-500">{visibleCases.length} {visibleCases.length === 1 ? 'case' : 'cases'} shown · latest 200</p>

      {visibleCases.length === 0 ? (
        <p className="border-y bg-white px-4 py-12 text-center text-sm text-gray-500">No support cases match this filter.</p>
      ) : (
        <div className="divide-y border-y bg-white">
          {visibleCases.map((item) => {
            const profile = profileById.get(item.user_id);
            const booking = item.booking_id ? bookingById.get(item.booking_id) : null;
            const person = profile?.business_name ?? profile?.full_name ?? 'Account unavailable';
            const requester = booking?.guest_name && booking.guest_name !== profile?.full_name
              ? `${person} · booking guest ${booking.guest_name}`
              : person;

            return (
              <article key={item.id} className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-[#1B1A2E]">{item.subject}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CASE_STATUS_STYLES[item.status] ?? 'bg-gray-100 text-gray-700'}`}>{humanize(item.status)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {humanize(item.category)} · {formatDate(item.created_at, 'long')} · from{" "}
                    <Link href={`/admin/users/${item.user_id}`} className="font-medium text-[#CF2F74] hover:underline">{requester}</Link>
                  </p>
                  {item.booking_id && (
                    <p className="mt-1 text-xs text-gray-500">
                      {booking ? (
                        <Link href={`/admin/listings/${booking.listing_id}`} className="font-medium text-[#CF2F74] hover:underline">
                          {listingById.get(booking.listing_id) ?? 'Listing unavailable'}
                        </Link>
                      ) : 'Booking'} ·{' '}
                      <Link href={`/admin/bookings/${item.booking_id}`} className="font-medium text-[#CF2F74] hover:underline">{booking?.booking_reference ?? 'Booking'}</Link>
                      {booking?.guest_email ? ` · ${booking.guest_email}` : ''}
                    </p>
                  )}
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">{item.message}</p>
                  <ol aria-label={`Conversation for ${item.subject}`} className="mt-4 space-y-3">
                    {(messagesByCase.get(item.id) ?? []).map((message) => (
                      <li key={message.id} className={`flex ${message.sender_role === 'requester' ? 'justify-end' : 'justify-start'}`}>
                        <article className={`max-w-[min(92%,38rem)] rounded-xl px-3 py-2.5 ${message.sender_role === 'requester' ? 'bg-[#1B1A2E] text-white' : 'border-l-2 border-[#E23E85] bg-[#FDF0F5] text-[#4B2637]'}`}>
                          <p className={`mb-1 text-[11px] font-semibold uppercase ${message.sender_role === 'requester' ? 'text-white/65' : 'text-[#9C2454]'}`}>{message.sender_role === 'requester' ? 'Requester' : 'Support'}</p>
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                          <time dateTime={message.created_at} className={`mt-2 block text-right text-[11px] ${message.sender_role === 'requester' ? 'text-white/65' : 'text-gray-500'}`}>
                            {formatDate(message.created_at, 'long')}
                          </time>
                        </article>
                      </li>
                    ))}
                    {(messagesByCase.get(item.id) ?? []).length === 0 && item.public_reply && (
                      <li className="flex justify-start">
                        <article className="max-w-[min(92%,38rem)] border-l-2 border-[#E23E85] bg-[#FDF0F5] px-3 py-2 text-[#4B2637]">
                          <p className="text-xs font-semibold text-[#9C2454]">Reply visible to requester</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm">{item.public_reply}</p>
                        </article>
                      </li>
                    )}
                  </ol>
                  <p className="mt-4 text-[11px] text-gray-400">Case {item.id} · updated {formatDate(item.updated_at, 'long')}</p>
                </div>

                <SupportCaseUpdateForm
                  caseId={item.id}
                  status={item.status}
                  publicReply={item.public_reply}
                  adminNotes={item.admin_notes}
                />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}