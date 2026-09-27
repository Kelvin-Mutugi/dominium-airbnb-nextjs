'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/app/lib/format';
import { markBookingThreadRead, sendBookingMessage } from '@/app/account/bookings/thread-actions';
import { btnPrimary, inputClass, textLink } from './ui';

type ThreadMessage = { id: string; sender_id: string; body: string; created_at: string };
type BookingUpdate = { id: string; event_type: string; summary: string; created_at: string };

export function BookingThread({
  bookingId,
  currentUserId,
  messages,
  updates,
}: {
  bookingId: string;
  currentUserId: string;
  messages: ThreadMessage[];
  updates: BookingUpdate[];
}) {
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    void markBookingThreadRead(bookingId);
  }, [bookingId]);

  async function send() {
    setPending(true);
    setError(null);
    setSent(null);
    const result = await sendBookingMessage(bookingId, body);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBody('');
    setSent(result.message ?? 'Message sent.');
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section aria-labelledby="trip-messages-heading" className="min-w-0">
        <div className="border-b border-neutral-200 pb-4">
          <h2 id="trip-messages-heading" className="font-serif text-xl text-neutral-900">Messages</h2>
          <p className="mt-1 text-sm text-neutral-500">Only you and the other booking participant can see this conversation.</p>
        </div>
        <ol className="max-h-[32rem] space-y-4 overflow-y-auto py-5" aria-live="polite">
          {messages.length === 0 ? (
            <li className="py-8 text-center text-sm text-neutral-500">No messages yet. Start the conversation below.</li>
          ) : messages.map((message) => {
            const ownMessage = message.sender_id === currentUserId;
            return (
              <li key={message.id} className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}>
                <article className={`max-w-[min(85%,38rem)] rounded-lg px-4 py-3 ${ownMessage ? 'bg-[#1B1A2E] text-white' : 'bg-neutral-100 text-neutral-900'}`}>
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                  <time dateTime={message.created_at} className={`mt-2 block text-right text-[11px] ${ownMessage ? 'text-white/65' : 'text-neutral-500'}`}>
                    {ownMessage ? 'You · ' : ''}{formatDate(message.created_at, 'long')}
                  </time>
                </article>
              </li>
            );
          })}
        </ol>
        <div className="border-t border-neutral-200 pt-4">
          <label htmlFor="trip-message" className="block text-sm font-medium text-neutral-800">Message the other participant</label>
          <textarea id="trip-message" value={body} maxLength={5000} rows={4} onChange={(event) => setBody(event.target.value)} className={`${inputClass} mt-1.5`} placeholder="Share arrival details or ask a question…" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-sm text-rose-700">{error ?? sent}</p>
            <button type="button" onClick={send} disabled={pending || !body.trim()} className={btnPrimary}>{pending ? 'Sending…' : 'Send message'}</button>
          </div>
        </div>
      </section>

      <aside className="space-y-8">
        <section aria-labelledby="trip-updates-heading">
          <h2 id="trip-updates-heading" className="border-b border-neutral-200 pb-3 font-serif text-lg text-neutral-900">Trip updates</h2>
          {updates.length === 0 ? (
            <p className="py-4 text-sm text-neutral-500">Important booking updates will appear here.</p>
          ) : (
            <ol className="mt-3 space-y-4 border-l border-neutral-200 pl-4">
              {updates.map((update) => (
                <li key={update.id} className="relative">
                  <span aria-hidden="true" className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#E23E85] ring-1 ring-[#E23E85]" />
                  <p className="text-sm font-medium text-neutral-800">{update.summary}</p>
                  <time dateTime={update.created_at} className="mt-1 block text-xs text-neutral-500">{formatDate(update.created_at, 'long')}</time>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="border-t border-neutral-200 pt-5">
          <h2 className="font-serif text-lg text-neutral-900">Need support?</h2>
          <p className="mt-1 text-sm leading-5 text-neutral-500">Contact the support team about payments, safety, or a booking issue.</p>
          <Link href={`/account/support?booking=${encodeURIComponent(bookingId)}&category=booking_issue`} className={`${textLink} mt-3 inline-block`}>Contact support about this booking</Link>
        </section>
      </aside>
    </div>
  );
}