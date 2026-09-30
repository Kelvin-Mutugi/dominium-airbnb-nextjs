'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { formatDateTime, formatMoney } from '@/app/lib/format';
import {
  replyToCustomerSupportThread,
  updateCustomerSupportThreadStatus,
  type CustomerSupportMessage,
  type CustomerSupportThread,
  type CustomerSupportThreadStatus,
} from '@/app/customer-support/actions';

export type AdminCustomerSupportItem = {
  thread: CustomerSupportThread;
  messages: CustomerSupportMessage[];
  legacyMessages: { id: string; senderRole: string; senderName: string; body: string; createdAt: string }[];
  requesterName: string;
  requesterRoleLabel: string;
  requesterId: string;
  listingTitle: string;
  listingId: string;
  checkIn: string;
  checkOut: string;
  bookingStatus: string;
  bookingReference: string;
  totalAmount: number;
};

const STATUS_LABELS: Record<CustomerSupportThreadStatus, string> = {
  waiting_on_admin: 'Needs support reply',
  waiting_on_requester: 'Waiting on requester',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function CustomerSupportThreadCard({ item }: { item: AdminCustomerSupportItem }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { thread } = item;

  function sendReply() {
    if (!body.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        await replyToCustomerSupportThread(thread.id, body);
        setBody('');
        router.refresh();
      } catch (replyError) {
        setError(replyError instanceof Error ? replyError.message : 'Unable to send this reply.');
      }
    });
  }

  function changeStatus(status: CustomerSupportThreadStatus) {
    setError(null);
    startTransition(async () => {
      try {
        await updateCustomerSupportThreadStatus(thread.id, status);
        router.refresh();
      } catch (statusError) {
        setError(statusError instanceof Error ? statusError.message : 'Unable to update conversation status.');
      }
    });
  }

  return (
    <article className="border-y border-[#D9D5CF] bg-white">
      <header className="border-b border-[#E9E6DD] bg-[#FBFAF7] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase text-[#9C2454]">Booking messages</p>
            <h2 className="mt-1 text-base font-semibold text-[#1B1A2E]">{item.listingTitle}</h2>
            <p className="mt-1 text-sm text-[#5F5D69]">{item.bookingReference} · {item.checkIn} to {item.checkOut} · {formatMoney(item.totalAmount)}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${thread.status === 'waiting_on_admin' ? 'bg-amber-100 text-amber-900' : thread.status === 'waiting_on_requester' ? 'bg-sky-100 text-sky-900' : 'bg-gray-100 text-gray-700'}`}>
            {STATUS_LABELS[thread.status]}
          </span>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-[#E9E6DD] pt-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase text-[#797783]">Requester</dt>
            <dd className="mt-0.5 font-medium text-[#1B1A2E]">
              <Link href={`/admin/users/${item.requesterId}`} className="hover:text-[#9C2454] hover:underline">{item.requesterName}</Link>
              <span className="ml-1 text-xs font-normal text-[#797783]">({item.requesterRoleLabel})</span>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase text-[#797783]">Booking reference</dt>
            <dd className="mt-0.5">
              <Link href={`/admin/bookings/${thread.booking_id}`} title={thread.booking_id} className="break-all font-mono text-xs font-semibold text-[#9C2454] hover:underline">{thread.booking_id}</Link>
              <span className="ml-2 text-xs text-[#797783]">{item.bookingStatus}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase text-[#797783]">Listing</dt>
            <dd className="mt-0.5"><Link href={`/admin/listings/${item.listingId}`} className="font-medium text-[#1B1A2E] hover:text-[#9C2454] hover:underline">{item.listingTitle}</Link></dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-[#797783]">Conversation {thread.id.slice(0, 8).toUpperCase()} · opened {formatDateTime(thread.created_at)}</p>
      </header>

      <div className="grid gap-5 px-4 py-4 sm:px-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-label="Conversation messages" className="min-w-0">
          {item.legacyMessages.length > 0 && (
            <section className="mb-5 border border-amber-200 bg-amber-50/60 p-3 sm:p-4">
              <h3 className="text-xs font-semibold uppercase text-amber-900">Archived direct messages · admin-only context</h3>
              <p className="mt-1 text-xs leading-5 text-amber-900">These messages were sent before Customer Support replaced participant-to-participant messaging. They are visible only to admins and are not shown in either requester&apos;s private conversation.</p>
              <ol className="mt-3 max-h-64 space-y-3 overflow-y-auto border-t border-amber-200 pt-3">
                {item.legacyMessages.map((message) => (
                  <li key={message.id} className="border-l-2 border-amber-400 pl-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="text-xs font-semibold text-[#1B1A2E]">{message.senderRole} · {message.senderName}</p>
                      <time dateTime={message.createdAt} className="text-[10px] text-[#797783]">{formatDateTime(message.createdAt)}</time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#45434F]">{message.body}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {item.messages.length === 0 ? (
            <p className="py-5 text-sm text-[#797783]">No message has been sent in this private support conversation yet.</p>
          ) : (
            <ol className="max-h-96 space-y-3 overflow-y-auto">
              {item.messages.map((message) => (
                <li key={message.id} className={`max-w-3xl border-l-2 px-3 py-2 ${message.sender_role === 'admin' ? 'border-[#9C2454] bg-[#FDF5F8]' : 'border-[#7E9A87] bg-[#F6F8F5]'}`}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="text-xs font-semibold text-[#1B1A2E]">{message.sender_role === 'admin' ? 'Customer Support' : `${item.requesterRoleLabel} · ${item.requesterName}`}</p>
                    <time dateTime={message.created_at} className="text-[10px] text-[#797783]">{formatDateTime(message.created_at)}</time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#45434F]">{message.body}</p>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-4 border-t border-[#E9E6DD] pt-4">
            <label htmlFor={`support-reply-${thread.id}`} className="block text-xs font-semibold text-[#5F5D69]">Reply to requester</label>
            <textarea id={`support-reply-${thread.id}`} value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={3} disabled={thread.status === 'closed'} placeholder={thread.status === 'closed' ? 'Reopen this conversation before replying.' : 'Write a reply visible only to this requester…'} className="mt-1.5 w-full resize-y rounded-md border border-[#D9D5CF] bg-white px-3 py-2 text-sm text-[#1B1A2E] placeholder:text-[#8A8797] focus:border-[#9C2454] focus:outline-none focus:ring-2 focus:ring-[#9C2454]/20 disabled:bg-gray-50" />
            {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[#797783]">Private to this requester and the admin team.</p>
              <button type="button" onClick={sendReply} disabled={pending || thread.status === 'closed' || !body.trim()} className="min-h-9 rounded-md bg-[#1B1A2E] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-50">{pending ? 'Sending…' : 'Send reply'}</button>
            </div>
          </div>
        </section>

        <aside className="flex flex-wrap items-start gap-2 border-t border-[#E9E6DD] pt-4 xl:block xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
          <p className="w-full text-xs font-semibold uppercase text-[#797783]">Conversation status</p>
          {thread.status === 'closed' ? (
            <button type="button" disabled={pending} onClick={() => changeStatus('waiting_on_admin')} className="min-h-9 rounded-md border border-[#D9D5CF] px-3 py-2 text-sm font-medium text-[#1B1A2E] hover:bg-[#F7F5F2] disabled:opacity-50">Reopen conversation</button>
          ) : thread.status === 'resolved' ? (
            <button type="button" disabled={pending} onClick={() => changeStatus('waiting_on_admin')} className="min-h-9 rounded-md border border-[#D9D5CF] px-3 py-2 text-sm font-medium text-[#1B1A2E] hover:bg-[#F7F5F2] disabled:opacity-50">Reopen conversation</button>
          ) : (
            <button type="button" disabled={pending} onClick={() => changeStatus('resolved')} className="min-h-9 rounded-md border border-[#D9D5CF] px-3 py-2 text-sm font-medium text-[#1B1A2E] hover:bg-[#F7F5F2] disabled:opacity-50">Mark resolved</button>
          )}
          {thread.status !== 'closed' && (
            <button type="button" disabled={pending} onClick={() => changeStatus('closed')} className="min-h-9 rounded-md px-3 py-2 text-sm font-medium text-[#777581] hover:bg-gray-100 disabled:opacity-50">Close conversation</button>
          )}
        </aside>
      </div>
    </article>
  );
}