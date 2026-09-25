import Link from 'next/link';
import { formatDate, humanize } from '@/app/lib/format';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';
import { updateSupportCase } from './actions';

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

type RelatedBooking = {
  id: string;
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

function hrefFor(status: string, query: string) {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (query) params.set('q', query);
  const suffix = params.toString();
  return suffix ? `/admin/support?${suffix}` : '/admin/support';
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status ?? 'all') ? params.status ?? 'all' : 'all';
  const query = (params.q ?? '').trim().slice(0, 100).toLowerCase();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('support_cases')
    .select('id, user_id, booking_id, category, subject, message, status, public_reply, admin_notes, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error('Unable to load support cases. Apply the support_cases migration and try again.');

  const cases = (data ?? []) as CaseRow[];
  const userIds = [...new Set(cases.map((item) => item.user_id).filter(Boolean))];
  const bookingIds = [...new Set(cases.map((item) => item.booking_id).filter((id): id is string => Boolean(id)))];
  const [{ data: profiles, error: profileError }, { data: bookings, error: bookingError }] = await Promise.all([
    userIds.length
      ? admin.from('profiles').select('id, full_name, business_name').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    bookingIds.length
      ? admin.from('bookings').select('id, listing_id, guest_name, guest_email').in('id', bookingIds)
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
        <h1 className="text-2xl font-semibold text-[#E23E85]">Support &amp; disputes</h1>
        <p className="mt-1 text-sm text-gray-600">Review guest and host requests, record internal notes, and track resolution.</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
        <nav aria-label="Filter cases by status" className="flex flex-wrap gap-1">
          {STATUSES.map((item) => (
            <Link
              key={item}
              href={hrefFor(item, query)}
              aria-current={status === item ? 'page' : undefined}
              className={`rounded-md px-3 py-2 text-sm ${status === item ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {item === 'all' ? 'All' : humanize(item)}
            </Link>
          ))}
        </nav>
        <form action="/admin/support" className="flex w-full max-w-md gap-2">
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <label className="sr-only" htmlFor="support-search">Search cases</label>
          <input id="support-search" name="q" type="search" defaultValue={params.q ?? ''} maxLength={100} placeholder="Search person, booking, or request" className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
          <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">Search</button>
          {query && <Link href={hrefFor(status, '')} className="self-center text-sm text-gray-500 hover:text-gray-900">Clear</Link>}
        </form>
      </div>

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
                  <p className="mt-1 text-xs text-gray-500">{humanize(item.category)} · {formatDate(item.created_at, 'long')} · from {requester}</p>
                  {item.booking_id && (
                    <p className="mt-1 text-xs text-gray-500">
                      {booking ? listingById.get(booking.listing_id) ?? 'Listing unavailable' : 'Booking'} ·{' '}
                      <Link href={`/admin/bookings/${item.booking_id}`} className="font-medium text-[#CF2F74] hover:underline">{item.booking_id.slice(0, 8)}</Link>
                      {booking?.guest_email ? ` · ${booking.guest_email}` : ''}
                    </p>
                  )}
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">{item.message}</p>
                  {item.public_reply && (
                    <div className="mt-4 border-l-2 border-[#E23E85] bg-[#FDF0F5] px-3 py-2">
                      <p className="text-xs font-semibold text-[#9C2454]">Reply visible to requester</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[#4B2637]">{item.public_reply}</p>
                    </div>
                  )}
                  <p className="mt-4 text-[11px] text-gray-400">Case {item.id} · updated {formatDate(item.updated_at, 'long')}</p>
                </div>

                <form action={updateSupportCase} className="space-y-3 border-t pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                  <input type="hidden" name="case_id" value={item.id} />
                  <div>
                    <label htmlFor={`status-${item.id}`} className="block text-xs font-medium text-gray-600">Case status</label>
                    <select id={`status-${item.id}`} name="status" defaultValue={item.status} className="mt-1 w-full rounded-md border border-[#D9D5CF] bg-[#F7F5F2] px-2.5 py-2 text-sm text-[#1B1A2E] focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20">
                      {STATUSES.filter((candidate) => candidate !== 'all').map((candidate) => <option key={candidate} value={candidate}>{humanize(candidate)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`reply-${item.id}`} className="block text-xs font-medium text-gray-600">Reply to requester</label>
                    <textarea id={`reply-${item.id}`} name="public_reply" rows={3} maxLength={5000} defaultValue={item.public_reply ?? ''} placeholder="Visible in their support history" className="mt-1 w-full resize-y rounded-md border border-[#D9D5CF] bg-[#F7F5F2] px-2.5 py-2 text-sm text-[#1B1A2E] placeholder:text-[#8A8797] focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
                  </div>
                  <div>
                    <label htmlFor={`notes-${item.id}`} className="block text-xs font-medium text-gray-600">Internal notes</label>
                    <textarea id={`notes-${item.id}`} name="admin_notes" rows={3} maxLength={5000} defaultValue={item.admin_notes ?? ''} placeholder="Staff-only notes" className="mt-1 w-full resize-y rounded-md border border-[#D9D5CF] bg-[#F7F5F2] px-2.5 py-2 text-sm text-[#1B1A2E] placeholder:text-[#8A8797] focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
                  </div>
                  <button type="submit" className="rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-medium text-white hover:bg-[#302F43]">Save update</button>
                </form>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}