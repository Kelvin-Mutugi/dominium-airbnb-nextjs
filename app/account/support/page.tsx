import Link from 'next/link';
import { getAccountContext } from '@/app/lib/account';
import { formatDate, humanize } from '@/app/lib/format';
import { SupportSubmitButton } from '@/components/account/SupportSubmitButton';
import { focusRing, inputClass, PageHeader } from '@/components/account/ui';
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
  new: 'bg-neutral-100 text-neutral-700',
  in_review: 'bg-[#FCE8F0] text-[#9C2454]',
  waiting_on_user: 'bg-amber-50 text-amber-900',
  resolved: 'bg-neutral-100 text-neutral-700',
  closed: 'bg-neutral-100 text-neutral-700',
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
      .select('id, booking_reference, check_in, check_out, listing:listings ( title )')
      .or(`guest_id.eq.${user.id},host_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (caseError) throw new Error('Unable to load your support requests.');
  if (bookingError) throw new Error('Unable to load your bookings.');

  const bookingOptions = (bookings ?? []) as unknown as Array<{
    id: string;
    booking_reference: string;
    check_in: string;
    check_out: string;
    listing: { title: string } | Array<{ title: string }> | null;
  }>;
  const bookingReferenceById = new Map(bookingOptions.map((booking) => [booking.id, booking.booking_reference]));
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
      <PageHeader title="Support" description="Send a tracked request for payment or refund problems, complaints, safety concerns, or disputes. For a quick booking question, message support from the booking." />

      {params.submitted === '1' && (
        <p role="status" className="mb-5 rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-[#1B1A2E]">
          Your request has been sent. You can follow its status below.
        </p>
      )}
      {params.error && (
        <p role="alert" className="mb-5 rounded-2xl bg-[#FCE8F0] px-4 py-3 text-sm text-[#9C2454]">
          {params.error}
        </p>
      )}

      <section aria-labelledby="new-request-heading" className="account-neu-inset rounded-3xl p-4 sm:p-6">
        <h2 id="new-request-heading" className="text-lg font-semibold text-[#1B1A2E]">Submit a support case</h2>
        <form action={submitSupportCase} className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="support-category" className="block text-sm font-medium text-[#1B1A2E]">What do you need help with?</label>
            <select id="support-category" name="category" defaultValue={params.category && categories.some(([key]) => key === params.category) ? params.category : 'booking_issue'} className={`${inputClass} mt-1.5 ${focusRing}`}>
              {categories.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="support-booking" className="block text-sm font-medium text-[#1B1A2E]">Related booking <span className="font-normal text-gray-500">(optional)</span></label>
            <select id="support-booking" name="booking_id" defaultValue={requestedBookingExists ? params.booking : ''} className={`${inputClass} mt-1.5 ${focusRing}`}>
              <option value="">Not related to a booking</option>
              {bookingOptions.map((booking) => {
                const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;
                return <option key={booking.id} value={booking.id}>{listing?.title ?? 'Stay'} · {booking.check_in} · {booking.booking_reference}</option>;
              })}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="support-subject" className="block text-sm font-medium text-[#1B1A2E]">Subject</label>
            <input id="support-subject" name="subject" required minLength={5} maxLength={120} className={`${inputClass} mt-1.5`} placeholder="A short summary" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="support-message" className="block text-sm font-medium text-[#1B1A2E]">What happened?</label>
            <textarea id="support-message" name="message" required minLength={20} maxLength={5000} rows={6} className={`${inputClass} mt-1.5 resize-y leading-6`} placeholder="Share the details that will help us investigate." />
          </div>

          <div className="sm:col-span-2">
            <SupportSubmitButton />
          </div>
        </form>
      </section>

      <section aria-labelledby="request-history-heading" className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="request-history-heading" className="text-lg font-semibold text-[#1B1A2E]">Your requests</h2>
          <span className="text-xs text-gray-500">Latest 50</span>
        </div>
        {(cases ?? []).length === 0 ? (
          <p className="account-neu-surface mt-4 rounded-2xl px-4 py-6 text-sm text-neutral-600">You haven’t sent a support request yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {(cases as SupportCase[]).map((supportCase) => (
              <li key={supportCase.id} className="account-neu-surface rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#1B1A2E]">{supportCase.subject}</p>
                    <p className="mt-1 text-xs text-[#6B6A78]">{humanize(supportCase.category)} · {formatDate(supportCase.created_at, 'long')}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CASE_STATUSES[supportCase.status] ?? CASE_STATUSES.new}`}>{humanize(supportCase.status)}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4B4A5A]">{supportCase.message}</p>
                {supportCase.public_reply && (
                  <div className="mt-4 rounded-xl bg-[#FCE8F0] px-3 py-2.5">
                    <p className="text-xs font-semibold text-[#9C2454]">Response from support</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#4B2637]">{supportCase.public_reply}</p>
                  </div>
                )}
                {supportCase.booking_id && <Link href={`/account/bookings`} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[#9C2454] hover:underline">Booking {bookingReferenceById.get(supportCase.booking_id) ?? 'details'}</Link>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}