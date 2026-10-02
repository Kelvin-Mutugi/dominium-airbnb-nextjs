# Cancellation and Refund Guide

## Client Message

### How cancellation and refunds work

When you submit a cancellation request, your booking stays confirmed while our admin team reviews it. You will see an estimated refund before sending the request. This estimate is not a final promise of the amount.

The admin team first decides whether to cancel the booking. If cancellation is approved, the booking is cancelled. Any eligible refund then goes through a separate review, so approval of the cancellation does not mean the refund has also been approved or sent.

If the refund is approved, our team sends it manually to the original payment method or another agreed payment channel. We then record the amount and payment reference in your booking. Please allow 3–5 business days after the refund is sent for your bank or mobile-money provider to make it available. We will show you if the refund is still being reviewed, approved but not yet sent, declined, or completed.

If the refund request is declined, we will show the decision and the reason. Your booking may still be cancelled if the cancellation itself was approved.

For help with a cancellation or refund, reply to your booking support conversation and include your booking reference.

## Team Workflow

1. **Guest submits a cancellation request.** Confirm the correct booking, guest, stay dates, payments received, guest explanation, and the property's published cancellation terms. The booking remains confirmed while cancellation is under review.
2. **Admin decides the cancellation.** Approving cancellation changes the booking to cancelled. Declining it leaves the booking confirmed. This decision is not a refund decision.
3. **Eligible refund enters the Refunds queue.** Requests with a positive estimate appear in Admin → Refunds. A zero estimate is recorded as not eligible and does not require a refund decision.
4. **Admin reviews the refund separately.** The queue provides the guest and host, booking and listing, dates, payment records and references, amount paid, estimate, cancellation terms, and the guest's reason. Approve the refund for manual payment or decline it with a written reason.
5. **Approval authorizes payment; it does not send money.** The request remains awaiting manual processing until a team member actually sends the approved amount through the original payment method or an approved alternative.
6. **Record the completed transfer.** Enter the actual amount sent and the provider/bank transaction reference. Do this only after verifying the transfer. The request then shows as processed. A full refund marks the original payment records refunded; a partial refund remains documented against the refund request.
7. **Guest sees the outcome.** The guest's booking page shows whether cancellation is awaiting decision, whether an approved cancellation's refund is awaiting its separate decision, whether a refund was declined, or the amount and date recorded as sent.

Keep decision notes factual and concise. Do not promise a payment date until the transfer has actually been submitted. If the payment record, amount, policy, or booking details do not agree, pause the decision and escalate to the finance/admin lead.

## Policy Alignment Required

Before using estimates as binding decisions, reconcile the calculation with the published policy in `components/policies/RefundPolicy.tsx`. The current app estimate uses 100% of payments received at least 14 days before check-in, 50% at 7–13 days, and 0% inside 7 days. The published policy describes a possible administrative fee on full refunds and a travel-credit alternative for the 50% window. Confirm which terms are authoritative, whether travel credit is offered, how fees are applied, and whether the estimate calculation should change. Until aligned, staff should treat the app amount as an estimate and review the published terms before deciding.