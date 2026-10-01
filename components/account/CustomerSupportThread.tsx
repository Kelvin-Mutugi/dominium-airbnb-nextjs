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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
      <section aria-labelledby="customer-support-conversation-heading" className="min-w-0">
        <header className="account-neu-surface rounded-2xl p-4 sm:p-5">
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
                <article className={`max-w-[min(88%,38rem)] rounded-2xl px-4 py-3 ${requesterMessage ? 'bg-[#1B1A2E] text-white' : 'account-neu-surface text-neutral-900'}`}>
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

        <div className="account-neu-inset rounded-2xl p-4">
          {isClosed && <p className="mb-3 rounded-xl bg-white px-3 py-2 text-sm text-neutral-600">This conversation is closed. Sending a new message will reopen it with customer support.</p>}
          <label htmlFor="customer-support-message" className="block text-sm font-medium text-neutral-800">Message support about this booking</label>
          <textarea id="customer-support-message" value={body} maxLength={5000} rows={4} onChange={(event) => setBody(event.target.value)} className="mt-1.5 min-h-28 w-full resize-y rounded-xl bg-white px-3 py-2.5 text-sm leading-6 text-neutral-900 shadow-[inset_0_1px_2px_rgba(27,26,46,0.04)] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/30" placeholder="Describe what you need help with…" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" role={error ? 'alert' : 'status'} className={`text-sm ${error ? 'text-[#9C2454]' : 'text-neutral-600'}`}>{error ?? (sent ? 'Message sent to customer support.' : '')}</p>
            <button type="button" onClick={submitMessage} disabled={pending || !body.trim()} className="min-h-11 rounded-full bg-[#1B1A2E] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#302F43] active:bg-[#11101F] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85]">
              {pending ? 'Sending…' : isClosed ? 'Reopen conversation' : 'Send message'}
            </button>
          </div>
        </div>
      </section>

      <aside className="account-neu-surface h-fit rounded-2xl p-4 sm:p-5">
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