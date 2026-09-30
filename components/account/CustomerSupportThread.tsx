'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { formatDateTime } from '@/app/lib/format';
import {
  sendCustomerSupportMessage,
  type CustomerSupportMessage,
  type CustomerSupportThread,
} from '@/app/customer-support/actions';

export function CustomerSupportThreadView({
  thread,
  messages,
}: {
  thread: CustomerSupportThread;
  messages: CustomerSupportMessage[];
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const isClosed = thread.status === 'closed';

  function submitMessage() {
    if (!body.trim() || pending || isClosed) return;
    setError(null);
    setSent(false);
    startTransition(async () => {
      try {
        await sendCustomerSupportMessage(thread.id, body);
        setBody('');
        setSent(true);
        router.refresh();
      } catch (sendError) {
        setError(sendError instanceof Error ? sendError.message : 'Unable to send your message.');
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section aria-labelledby="customer-support-conversation-heading" className="min-w-0">
        <header className="border-b border-neutral-200 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="customer-support-conversation-heading" className="font-serif text-xl text-neutral-900">Booking messages with support</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${thread.status === 'closed' || thread.status === 'resolved' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
              {thread.status.replaceAll('_', ' ')}
            </span>
          </div>
          <p className="mt-2 text-sm text-neutral-600">Use this private thread for quick booking questions or stay coordination. For refunds, payment problems, complaints, or disputes, submit a support case instead. The other booking participant cannot see these messages.</p>
        </header>

        <ol className="max-h-[34rem] space-y-4 overflow-y-auto py-5" aria-live="polite">
          {messages.length === 0 ? (
            <li className="py-8 text-center text-sm text-neutral-500">Ask a quick question or share a stay-related update with our support team.</li>
          ) : messages.map((message) => {
            const requesterMessage = message.sender_role === thread.requester_role;
            return (
              <li key={message.id} className={`flex ${requesterMessage ? 'justify-end' : 'justify-start'}`}>
                <article className={`max-w-[min(88%,38rem)] px-4 py-3 ${requesterMessage ? 'bg-[#1B1A2E] text-white' : 'border border-neutral-200 bg-white text-neutral-900'}`}>
                  <p className={`mb-1 text-[11px] font-semibold uppercase ${requesterMessage ? 'text-white/65' : 'text-[#9C2454]'}`}>{requesterMessage ? `You · ${thread.requester_role}` : 'Dominium Customer Support'}</p>
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                  <time dateTime={message.created_at} className={`mt-2 block text-right text-[11px] ${requesterMessage ? 'text-white/65' : 'text-neutral-500'}`}>
                    {formatDateTime(message.created_at)}
                  </time>
                </article>
              </li>
            );
          })}
        </ol>

        <div className="border-t border-neutral-200 pt-4">
          {isClosed && <p className="mb-3 border-l-4 border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">This conversation is closed. Sending a new message will reopen it with customer support.</p>}
          <label htmlFor="customer-support-message" className="block text-sm font-medium text-neutral-800">Message support about this booking</label>
          <textarea id="customer-support-message" value={body} maxLength={5000} rows={4} onChange={(event) => setBody(event.target.value)} className="mt-1.5 w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm leading-6 text-neutral-900 focus:border-[#9C2454] focus:outline-none focus:ring-2 focus:ring-[#9C2454]/20" placeholder="Describe what you need help with…" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" role={error ? 'alert' : 'status'} className="text-sm text-rose-700">{error ?? (sent ? 'Message sent to customer support.' : '')}</p>
            <button type="button" onClick={submitMessage} disabled={pending || !body.trim()} className="min-h-10 rounded-md bg-[#1B1A2E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? 'Sending…' : isClosed ? 'Reopen conversation' : 'Send message'}
            </button>
          </div>
        </div>
      </section>

      <aside className="h-fit border-t border-neutral-200 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <h2 className="font-serif text-lg text-neutral-900">About this conversation</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase text-neutral-500">Reference</dt>
            <dd className="mt-0.5 font-mono text-neutral-800">{thread.id.slice(0, 8).toUpperCase()}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-neutral-500">Opened</dt>
            <dd className="mt-0.5 text-neutral-800">{formatDateTime(thread.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-neutral-500">Last updated</dt>
            <dd className="mt-0.5 text-neutral-800">{formatDateTime(thread.updated_at)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}