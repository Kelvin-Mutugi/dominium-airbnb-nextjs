import { formatDate, formatMoney } from '@/app/lib/format';
import type { RefundProgress } from '@/types/refunds';

const STATUS_LABELS: Record<RefundProgress['status'], string> = {
  awaiting_admin_review: 'Under review',
  awaiting_manual_processing: 'Approved · not sent',
  declined: 'Declined',
  processed: 'Sent to guest',
  not_eligible: 'Not eligible',
  not_applicable: 'No refund due',
};

const STATUS_STYLES: Record<RefundProgress['status'], string> = {
  awaiting_admin_review: 'bg-amber-50 text-amber-900',
  awaiting_manual_processing: 'bg-sky-50 text-sky-900',
  declined: 'bg-neutral-100 text-neutral-700',
  processed: 'bg-emerald-50 text-emerald-800',
  not_eligible: 'bg-neutral-100 text-neutral-700',
  not_applicable: 'bg-neutral-100 text-neutral-700',
};

export function RefundProgressPanel({
  requests,
  audience,
}: {
  requests: RefundProgress[];
  audience: 'guest' | 'host';
}) {
  if (!requests.length) return null;

  return (
    <section aria-label={audience === 'guest' ? 'Refund progress' : 'Guest refund status'} className="mt-4 space-y-3">
      {requests.map((request) => {
        const isOpen = request.status === 'awaiting_admin_review' || request.status === 'awaiting_manual_processing';
        return (
          <article key={request.id} className="account-neu-inset rounded-2xl px-4 py-3 text-sm text-neutral-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-neutral-900">
                {audience === 'guest' ? 'Your refund' : request.source === 'cancellation' ? 'Cancellation refund' : 'Guest payment refund'}
              </p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[request.status]}`}>
                {STATUS_LABELS[request.status]}
              </span>
            </div>
            <p className="mt-2">
              {request.source === 'cancellation'
                ? `Estimated refund: ${formatMoney(request.estimated_refund_amount ?? 0)}`
                : `Payment amount: ${formatMoney(request.amount_paid)}`}
            </p>
            {request.status === 'awaiting_admin_review' && (
              <p className="mt-1">
                {audience === 'guest'
                  ? 'The support team is reviewing this request. No money has been sent yet.'
                  : 'Support is reviewing this refund. Booking completion and payout release are paused until it is decided.'}
              </p>
            )}
            {request.status === 'awaiting_manual_processing' && (
              <p className="mt-1">
                {audience === 'guest'
                  ? 'The refund was approved and is waiting for the Safaricom M-Pesa transfer. It has not been sent yet.'
                  : 'The refund was approved and is waiting for the Safaricom M-Pesa transfer. Booking completion and payout release remain paused.'}
              </p>
            )}
            {request.status === 'declined' && (
              <p className="mt-1">No refund will be sent for this request.</p>
            )}
            {(request.status === 'not_eligible' || request.status === 'not_applicable') && (
              <p className="mt-1">No refund is due for this cancellation under the applicable refund terms.</p>
            )}
            {request.status === 'processed' && (
              <p className="mt-1">
                Refund sent: {formatMoney(request.actual_refund_amount ?? 0)}
                {request.processed_at ? ` on ${formatDate(request.processed_at, 'short')}` : ''}.
                {audience === 'guest' ? ' Your bank or mobile-money provider may take additional time to post it.' : ''}
              </p>
            )}
            <p className="mt-2 text-xs text-neutral-500">Last update: {formatDate(request.processed_at ?? request.updated_at ?? request.created_at, 'long')}</p>
            {isOpen && <span className="sr-only">The refund is not yet final.</span>}
          </article>
        );
      })}
    </section>
  );
}