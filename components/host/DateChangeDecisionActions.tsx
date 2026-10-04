'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { respondToBookingChangeRequest } from '@/app/lib/host/actions';

export function DateChangeDecisionActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  async function decide(approve: boolean) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await respondToBookingChangeRequest(requestId, approve, approve ? '' : declineReason);
      router.refresh();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Unable to update this date-change request.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={`date-change-decline-${requestId}`} className="block text-xs font-medium text-gray-600">
        Reason if declining <span className="font-normal">(required; visible to guest)</span>
        <textarea
          id={`date-change-decline-${requestId}`}
          value={declineReason}
          onChange={(event) => setDeclineReason(event.target.value)}
          minLength={5}
          maxLength={1000}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20"
          placeholder="Explain why these dates cannot be approved"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending || declineReason.trim().length < 5} onClick={() => void decide(false)} className="min-h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50">
          {pending ? 'Saving…' : 'Decline'}
        </button>
        <button type="button" disabled={pending} onClick={() => void decide(true)} className="min-h-10 rounded-md bg-[#12231d] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? 'Saving…' : 'Approve date change'}
        </button>
      </div>
      {error && <p role="alert" className="max-w-md text-sm text-rose-700">{error}</p>}
    </div>
  );
}