# Cancellation Refund Workflow

Refund handling is separate from cancellation approval. A cancellation decision changes the booking; it does not send money or approve the refund.

## States

1. A guest submits a cancellation request. The booking remains confirmed while the request awaits an admin cancellation decision.
2. If the admin declines cancellation, the booking remains confirmed and no refund case is opened.
3. If the admin approves cancellation, the booking becomes cancelled. When the estimate is greater than zero, the request moves to `awaiting_admin_review` and appears under Admin > Refunds. A zero estimate is recorded as `not_eligible`.
4. In Admin > Refunds, an admin can approve the estimated refund for manual processing or decline it with a required reason. Both decisions are recorded against the booking and administrator.
5. Approval does not transfer funds. After sending the refund through the payment provider or an approved manual channel, an admin records the actual amount and transaction reference. The request then becomes `processed`.
6. If the actual refund covers the full amount paid, the related paid payment rows are marked `refunded`. For a partial refund, payment rows retain their paid status while the refund request records the actual amount and reference.

The refund queue links each request to its guest, host, booking/listing, stay dates, cancellation terms, original payment records, estimate, decision notes, and processing reference. Use the payment/provider reference as evidence when recording a completed refund. The request history is shown to the guest on Account > Bookings.

## Database setup

Apply `supabase/migrations/20261002160000_refund_review_workflow.sql` after the cancellation-approval migration. It adds refund decision/processing fields, routes approved eligible cancellations into refund review, and provides an admin-authorized RPC for state changes. Existing approved cancellations awaiting manual processing are migrated into the review queue if they have no recorded processed refund.
