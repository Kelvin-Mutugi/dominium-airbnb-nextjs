import Link from 'next/link';
import { getAccountContext } from '@/app/lib/account';
import { formatDate, humanize } from '@/app/lib/format';
import { SupportSubmitButton } from '@/components/account/SupportSubmitButton';
import { submitSupportCase } from './actions';

type SupportCase = {
  id: string;
  booking_id: string | null;
  category: string;
  subject: string;
  message: string;
  status: string;
  public_reply: string | null;
  created_at: string;
};

const CASE_STATUSES: Record<string, string> = {
  new: 'bg-sky-50 text-sky-800',
  in_review: 'bg-amber-50 text-amber-800',
  waiting_on_user: 'bg-orange-50 text-orange-800',
  resolved: 'bg-emerald-50 text-emerald-800',
  closed: 'bg-gray-100 text-gray-700',
};

export default async function AccountSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; category?: string; submitted?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await getAccountContext();
  const [{ data: cases, error: caseError }, { data: bookings, error: bookingError }] = await Promise.all([
    supabase
      .from('support_cases')
      .select('id, booking_id, category, subject, message, status, public_reply, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('bookings')
      .select('id, check_in, check_out, listing:listings ( title )')
      .or(`guest_id.eq.${user.id},host_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (caseError) throw new Error('Unable to load your support requests.');
  if (bookingError) throw new Error('Unable to load your bookings.');

  const bookingOptions = (bookings ?? []) as unknown as Array<{
    id: string;
    check_in: string;
    check_out: string;
    listing: { title: string } | Array<{ title: string }> | null;
  }>;
  const requestedBookingExists = bookingOptions.some((booking) => booking.id === params.booking);
  const categories = [
    ['booking_issue', 'Booking problem'],
    ['payment_refund', 'Payment or refund'],
    ['host_guest_concern', 'Guest or host concern'],
    ['listing_issue', 'Listing issue'],
    ['account', 'Account access'],
    ['other', 'Something else'],
  ];

  return (
    <div className="max-w-4xl">
      <header className="mb-8 border-b border-[#E9E6DD] pb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#E23E85]">Help centre</p>
        <h1 className="font-serif text-3xl text-[#1B1A2E]">Support &amp; disputes</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B6A78]">
          Tell us what happened. Include the booking when it relates to a stay, charge, refund, or host-guest issue.
        </p>
      </header>

      {params.submitted === '1' && (
        <p role="status" className="mb-6 border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Your request has been sent. You can follow its status below.
        </p>
      )}
      {params.error && (
        <p role="alert" className="mb-6 border-l-4 border-rose-600 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {params.error}
        </p>
      )}

      <section aria-labelledby="new-request-heading" className="border-b border-[#E9E6DD] pb-8">
        <h2 id="new-request-heading" className="text-lg font-semibold text-[#1B1A2E]">Send a request</h2>
        <form action={submitSupportCase} className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="support-category" className="block text-sm font-medium text-[#1B1A2E]">What do you need help with?</label>
            <select id="support-category" name="category" defaultValue={params.category && categories.some(([key]) => key === params.category) ? params.category : 'booking_issue'} className="mt-1.5 w-full rounded-lg border border-[#D9D5CF] bg-white px-3 py-2.5 text-sm focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20">
              {categories.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="support-booking" className="block text-sm font-medium text-[#1B1A2E]">Related booking <span className="font-normal text-gray-500">(optional)</span></label>
            <select id="support-booking" name="booking_id" defaultValue={requestedBookingExists ? params.booking : ''} className="mt-1.5 w-full rounded-lg border border-[#D9D5CF] bg-white px-3 py-2.5 text-sm focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20">
              <option value="">Not related to a booking</option>
              {bookingOptions.map((booking) => {
                const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;
                return <option key={booking.id} value={booking.id}>{listing?.title ?? 'Stay'} · {booking.check_in} · {booking.id.slice(0, 8)}</option>;
              })}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="support-subject" className="block text-sm font-medium text-[#1B1A2E]">Subject</label>
            <input id="support-subject" name="subject" required minLength={5} maxLength={120} className="mt-1.5 w-full rounded-lg border border-[#D9D5CF] bg-white px-3 py-2.5 text-sm focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" placeholder="A short summary" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="support-message" className="block text-sm font-medium text-[#1B1A2E]">What happened?</label>
            <textarea id="support-message" name="message" required minLength={20} maxLength={5000} rows={6} className="mt-1.5 w-full resize-y rounded-lg border border-[#D9D5CF] bg-white px-3 py-2.5 text-sm leading-6 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" placeholder="Share the details that will help us investigate." />
          </div>

          <div className="sm:col-span-2">
            <SupportSubmitButton />
          </div>
        </form>
      </section>

      <section aria-labelledby="request-history-heading" className="pt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="request-history-heading" className="text-lg font-semibold text-[#1B1A2E]">Your requests</h2>
          <span className="text-xs text-gray-500">Latest 50</span>
        </div>
        {(cases ?? []).length === 0 ? (
          <p className="mt-4 border-t border-[#E9E6DD] py-6 text-sm text-[#6B6A78]">You haven’t sent a support request yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#E9E6DD]">
            {(cases as SupportCase[]).map((supportCase) => (
              <li key={supportCase.id} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#1B1A2E]">{supportCase.subject}</p>
                    <p className="mt-1 text-xs text-[#6B6A78]">{humanize(supportCase.category)} · {formatDate(supportCase.created_at, 'long')}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CASE_STATUSES[supportCase.status] ?? CASE_STATUSES.new}`}>{humanize(supportCase.status)}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4B4A5A]">{supportCase.message}</p>
                {supportCase.public_reply && (
                  <div className="mt-4 border-l-2 border-[#E23E85] bg-[#FDF0F5] px-3 py-2.5">
                    <p className="text-xs font-semibold text-[#9C2454]">Response from support</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#4B2637]">{supportCase.public_reply}</p>
                  </div>
                )}
                {supportCase.booking_id && <Link href={`/account/bookings`} className="mt-2 inline-block text-xs font-medium text-[#CF2F74] hover:underline">Booking {supportCase.booking_id.slice(0, 8)}</Link>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}