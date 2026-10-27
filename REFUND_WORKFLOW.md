# Cancellation Refund Workflow

Refund handling is separate from cancellation approval. A cancellation decision
changes the booking; it does not send money.

## States

1. A guest submits a cancellation request. The booking remains confirmed while
   the request awaits an admin cancellation decision.
2. If the admin declines cancellation, the booking remains confirmed and no
   cancellation refund is opened.
3. If the admin approves cancellation, the booking becomes cancelled. Positive
   estimates move to `awaiting_admin_review`; a zero estimate is recorded as
   `not_eligible`. The Africa/Nairobi calendar date determines the policy
   window: 100% at least 14 days before check-in, 50% 7–13 days before, and no
   refund inside 7 days.
4. An admin-initiated cancellation of a confirmed booking cancels it and routes
   the remaining successful payments to full-refund review. Existing active
   payment refund requests count as covering that payment; previously processed
   refunds are deducted to avoid duplicate transfers. Pending date-change
   requests are closed when the booking is cancelled.
5. In Admin > Refunds, an admin can approve the cancellation refund for
   processing or decline it with a required reason. Both decisions are recorded
   against the booking and administrator. Exceptional circumstances can be
   considered case by case; record the reason and decision.
6. Approval does not transfer funds. For M-Pesa, after approval an admin
   initiates the Safaricom B2C transfer. Record the actual amount and
   transaction reference only after provider confirmation; then the request
   becomes `processed`.
7. If the actual refund covers the full amount paid, the related paid payment
   rows are marked `refunded`. For a partial refund, payment rows retain their
   paid status while the refund request records the actual amount and reference.
8. Approved refunds are returned through the original payment method (currently
   M-Pesa) and may take 5–14 business days to appear after processing.
   No-shows forfeit the booking amount; early departures and unused nights are
   not refundable.

The refund queue links each request to its guest, host, booking/listing, stay
dates, cancellation terms, original payment records, estimate, decision notes,
and processing reference. Use the payment/provider reference as evidence when
recording a completed refund. The request history is shown to the guest on
Account > Bookings.

## Database setup

Apply `supabase/migrations/20261002160000_refund_review_workflow.sql` after the
cancellation-approval migration. It adds refund decision/processing fields,
routes approved eligible cancellations into refund review, and provides an
admin-authorized RPC for state changes. Apply
`supabase/migrations/20261027100000_admin_platform_cancellation_full_refund.sql`
afterward to ensure admin-initiated cancellations create a full-refund review.
