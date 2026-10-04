'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { sendSupportCaseMessage } from '@/app/account/support/actions';

export function SupportCaseReplyForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim() || pending) return;
    setError(null);
    setSent(false);
    startTransition(async () => {
      try {
        await sendSupportCaseMessage(caseId, message);
        setMessage('');
        setSent(true);
        router.refresh();
      } catch (sendError) {
        setError(sendError instanceof Error ? sendError.message : 'Unable to send your reply.');
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t border-[#E9E6DD] pt-4">
      <label htmlFor={`support-reply-${caseId}`} className="block text-sm font-medium text-[#1B1A2E]">Reply to support</label>
      <textarea
        id={`support-reply-${caseId}`}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        maxLength={5000}
        rows={3}
        className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-[#E9E6DD] bg-white px-3 py-2.5 text-sm leading-6 text-[#1B1A2E] focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20"
        placeholder="Add information or answer the support team…"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" role={error ? 'alert' : 'status'} className={`text-sm ${error ? 'text-[#9C2454]' : 'text-neutral-600'}`}>
          {error ?? (sent ? 'Your reply was sent to support.' : '')}
        </p>
        <button type="submit" disabled={pending || !message.trim()} className="min-h-10 rounded-full bg-[#1B1A2E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85]">
          {pending ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </form>
  );
}