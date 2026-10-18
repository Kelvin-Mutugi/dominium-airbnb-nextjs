import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  LifeBuoy,
  Wallet,
} from 'lucide-react';
import { formatDate, humanize } from '@/app/lib/format';
import { requireHost } from '@/app/lib/host-auth';
import { createClient } from '@/app/lib/supabase/server';
import { SupportCaseReplyForm } from '@/components/account/SupportCaseReplyForm';
import { SupportSubmitButton } from '@/components/account/SupportSubmitButton';
import { focusRing, inputClass } from '@/components/account/ui';
import { submitHostSupportCase } from './actions';

type HostSupportCase = {
  id: string;
  booking_id: string | null;
  category: string;
  subject: string;
  message: string;
  status: string;
  public_reply: string | null;
  created_at: string;
};

type SupportCaseMessage = {
  id: string;
  case_id: string;
  sender_role: 'requester' | 'support';
  body: string;
  created_at: string;
};

type HostSupportBooking = {
  id: string;
  booking_reference: string;
  check_in: string;
  listing: { title: string } | Array<{ title: string }> | null;
};

const CATEGORIES = [
  ['booking_issue', 'Booking or stay'],
  ['payment_refund', 'Payout or payment'],
  ['host_guest_concern', 'Guest concern or safety'],
  ['listing_issue', 'Listing or calendar'],
  ['account', 'Host account'],
  ['other', 'Something else'],
];

const CASE_STATUSES: Record<string, string> = {
  new: 'bg-neutral-100 text-neutral-700',
  in_review: 'bg-[#FCE8F0] text-[#9C2454]',
  waiting_on_user: 'bg-amber-50 text-amber-900',
  resolved: 'bg-emerald-50 text-emerald-800',
  closed: 'bg-neutral-100 text-neutral-700',
};

const QUICK_LINKS = [
  {
    href: '/host/bookings',
    label: 'Bookings',
    description: 'Review a reservation or guest stay.',
    icon: CalendarDays,
  },
  {
    href: '/host/payouts',
    label: 'Payouts',
    description: 'Check payout timing and payment history.',
    icon: Wallet,
  },
  {
    href: '/host/listings',
    label: 'Listings',
    description: 'Manage your property information.',
    icon: Building2,
  },
];

export default async function HostSupportPage({
  searchParams,
}: {
  searchParams: Promise<{
    submitted?: string;
    error?: string;
    booking?: string;
    category?: string;
  }>;
}) {
  const params = await searchParams;
  const { user } = await requireHost();
  const supabase = await createClient();
  const [
    { data: cases, error: caseError },
    { data: bookings, error: bookingError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase
      .from('support_cases')
      .select('id, booking_id, category, subject, message, status, public_reply, created_at')
      .eq('user_id', user.id)
      .eq('support_context', 'host')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('bookings')
      .select('id, booking_reference, check_in, listing:listings(title)')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  if (caseError) throw new Error('Unable to load your host support requests.');
  if (bookingError) throw new Error('Unable to load your host bookings.');
  if (profileError) throw new Error('Unable to load your host profile.');

  const supportCases = (cases ?? []) as HostSupportCase[];
  const caseIds = supportCases.map((supportCase) => supportCase.id);
  const { data: caseMessages, error: messageError } = caseIds.length
    ? await supabase
        .from('support_case_messages')
        .select('id, case_id, sender_role, body, created_at')
        .in('case_id', caseIds)
        .order('created_at', { ascending: true })
    : { data: [], error: null };
  if (messageError) {
    throw new Error(
      'Unable to load support replies. Apply the support case messages migration and try again.',
    );
  }

  const messagesByCase = new Map<string, SupportCaseMessage[]>();
  for (const message of (caseMessages ?? []) as SupportCaseMessage[]) {
    const messages = messagesByCase.get(message.case_id) ?? [];
    messages.push(message);
    messagesByCase.set(message.case_id, messages);
  }

  const bookingOptions = (bookings ?? []) as unknown as HostSupportBooking[];
  const bookingById = new Map(bookingOptions.map((booking) => [booking.id, booking]));
  const validBookingId = bookingOptions.some(
    (booking) => booking.id === params.booking,
  )
    ? params.booking
    : '';
  const validCategory = CATEGORIES.some(([key]) => key === params.category)
    ? params.category
    : 'booking_issue';
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="rounded-3xl bg-[#1B1A2E] px-5 py-6 text-white sm:px-8 sm:py-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <LifeBuoy className="h-6 w-6 text-[#F5A6C2]" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#F5A6C2]">HOST SUPPORT</p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              We&apos;re here to help you{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Get help with bookings, guest concerns, listings, and payouts.
              Send a tracked request and continue the conversation here.
            </p>
          </div>
        </div>
      </header>

      {params.submitted === '1' && (
        <p
          role="status"
          className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          Your request has been sent. You can follow its progress below.
        </p>
      )}
      {params.error && (
        <p
          role="alert"
          className="rounded-2xl bg-[#FCE8F0] px-4 py-3 text-sm text-[#9C2454]"
        >
          {params.error}
        </p>
      )}

      <section aria-labelledby="host-support-links">
        <h2 id="host-support-links" className="text-lg font-semibold text-[#1B1A2E]">
          Quick links
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-24 items-center gap-3 rounded-2xl border border-[#E9E6DD] bg-white p-4 transition hover:border-[#E23E85]/40 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85]"
            >
              <Icon className="h-5 w-5 shrink-0 text-[#9C2454]" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[#1B1A2E]">{label}</span>
                <span className="mt-1 block text-sm leading-5 text-gray-600">
                  {description}
                </span>
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-[#9C2454]"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="new-host-request-heading"
        className="rounded-3xl border border-[#E9E6DD] bg-white p-4 sm:p-6"
      >
        <h2
          id="new-host-request-heading"
          className="text-lg font-semibold text-[#1B1A2E]"
        >
          Start a support request
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Include the relevant booking when possible so our team can help faster.
        </p>
        <form action={submitHostSupportCase} className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="host-support-category"
              className="block text-sm font-medium text-[#1B1A2E]"
            >
              What do you need help with?
            </label>
            <select
              id="host-support-category"
              name="category"
              defaultValue={validCategory}
              className={`${inputClass} mt-1.5 ${focusRing}`}
            >
              {CATEGORIES.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="host-support-booking"
              className="block text-sm font-medium text-[#1B1A2E]"
            >
              Related booking <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <select
              id="host-support-booking"
              name="booking_id"
              defaultValue={validBookingId}
              className={`${inputClass} mt-1.5 ${focusRing}`}
            >
              <option value="">Not related to a booking</option>
              {bookingOptions.map((booking) => {
                const listing = Array.isArray(booking.listing)
                  ? booking.listing[0]
                  : booking.listing;
                return (
                  <option key={booking.id} value={booking.id}>
                    {listing?.title ?? 'Stay'} · {booking.check_in} ·{' '}
                    {booking.booking_reference}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="host-support-subject"
              className="block text-sm font-medium text-[#1B1A2E]"
            >
              Subject
            </label>
            <input
              id="host-support-subject"
              name="subject"
              required
              minLength={5}
              maxLength={120}
              className={`${inputClass} mt-1.5`}
              placeholder="A short summary"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="host-support-message"
              className="block text-sm font-medium text-[#1B1A2E]"
            >
              Tell us what happened
            </label>
            <textarea
              id="host-support-message"
              name="message"
              required
              minLength={20}
              maxLength={5000}
              rows={5}
              className={`${inputClass} mt-1.5 resize-y leading-6`}
              placeholder="Share the details that will help us investigate."
            />
          </div>
          <div className="sm:col-span-2">
            <SupportSubmitButton />
          </div>
        </form>
      </section>

      <section aria-labelledby="host-support-history">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 id="host-support-history" className="text-lg font-semibold text-[#1B1A2E]">
              Your support requests
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              View replies and continue any open conversation.
            </p>
          </div>
          <span className="text-xs text-gray-500">Latest 50</span>
        </div>
        {supportCases.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-[#E9E6DD] bg-white px-4 py-6 text-sm text-gray-600">
            You haven&apos;t sent a host support request yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {supportCases.map((supportCase) => {
              const relatedBooking = supportCase.booking_id
                ? bookingById.get(supportCase.booking_id)
                : null;
              const messages = messagesByCase.get(supportCase.id) ?? [];
              return (
                <li
                  key={supportCase.id}
                  className="rounded-2xl border border-[#E9E6DD] bg-white p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#1B1A2E]">
                        {supportCase.subject}
                      </h3>
                      <p className="mt-1 text-xs text-gray-600">
                        {humanize(supportCase.category)} ·{' '}
                        {formatDate(supportCase.created_at, 'long')}
                      </p>
                      {relatedBooking && (
                        <Link
                          href={`/host/bookings?booking=${relatedBooking.id}`}
                          className="mt-1 inline-flex min-h-10 items-center text-sm font-semibold text-[#9C2454] hover:underline"
                        >
                          {Array.isArray(relatedBooking.listing)
                            ? relatedBooking.listing[0]?.title
                            : relatedBooking.listing?.title ?? 'Related booking'}{' '}
                          · {relatedBooking.booking_reference}
                        </Link>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${CASE_STATUSES[supportCase.status] ?? CASE_STATUSES.new}`}
                    >
                      {humanize(supportCase.status)}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {supportCase.message}
                  </p>
                  <ol
                    aria-label={`Conversation for ${supportCase.subject}`}
                    className="mt-4 space-y-3"
                  >
                    {messages.map((message) => {
                      const requesterMessage = message.sender_role === 'requester';
                      return (
                        <li
                          key={message.id}
                          className={`flex ${requesterMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <article
                            className={`max-w-[min(92%,38rem)] rounded-2xl px-3.5 py-3 ${requesterMessage ? 'bg-[#1B1A2E] text-white' : 'bg-[#FCE8F0] text-[#4B2637]'}`}
                          >
                            <p
                              className={`mb-1 text-[11px] font-semibold uppercase ${requesterMessage ? 'text-white/65' : 'text-[#9C2454]'}`}
                            >
                              {requesterMessage ? 'You' : 'Support'}
                            </p>
                            <p className="whitespace-pre-wrap text-sm leading-6">
                              {message.body}
                            </p>
                            <time
                              dateTime={message.created_at}
                              className={`mt-2 block text-right text-[11px] ${requesterMessage ? 'text-white/65' : 'text-[#795A66]'}`}
                            >
                              {formatDate(message.created_at, 'long')}
                            </time>
                          </article>
                        </li>
                      );
                    })}
                    {messages.length === 0 && supportCase.public_reply && (
                      <li className="flex justify-start">
                        <article className="max-w-[min(92%,38rem)] rounded-2xl bg-[#FCE8F0] px-3.5 py-3 text-[#4B2637]">
                          <p className="mb-1 text-[11px] font-semibold uppercase text-[#9C2454]">
                            Support
                          </p>
                          <p className="whitespace-pre-wrap text-sm leading-6">
                            {supportCase.public_reply}
                          </p>
                        </article>
                      </li>
                    )}
                  </ol>
                  <SupportCaseReplyForm caseId={supportCase.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
