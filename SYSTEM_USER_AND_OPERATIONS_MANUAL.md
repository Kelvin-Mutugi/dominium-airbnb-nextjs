# Dominium Airbnb: Client and Team Guide

This guide explains how a booking moves through the system, what guests and hosts can do, and how the operations team handles cancellations, refunds, and payouts. It is written for independent reading and can be shared with clients and staff.

## Quick Overview

A typical stay follows this path:

1. The guest chooses a listing and dates, then submits their details and payment choice.
2. The system temporarily holds the dates while payment is completed.
3. Paystack confirms payment to the server; a verified payment changes the booking from **Pending** to **Confirmed**.
4. Before check-in, the guest can request a date change or cancellation. These are requests, not instant changes.
5. The host reviews date-change requests. An administrator reviews cancellation requests.
6. If a cancellation is approved, any refund is reviewed separately by an administrator and then sent manually.
7. After the scheduled check-out time, the host can mark the stay complete. If the host does not, the daily automatic process completes eligible stays after a 24-hour grace period.
8. A host payout may be held while the grace period or an unresolved case/request remains. When released, **Owed** means awaiting payment; it does not mean money has already been transferred.

## For Guests

### Booking and payment

At checkout, choose your dates, enter your contact details, select M-Pesa or card, and accept the displayed booking terms. The system creates a temporary date hold while Paystack processes the payment.

The hold lasts 10 minutes. A browser message from Paystack alone does not confirm the booking; the server verifies the transaction. After verified payment:

- **Confirmed** means the payment has been verified and the reservation is active.
- **Pending** means the payment has not yet been confirmed. The confirmation page checks for updates while payment is being processed.
- If payment is not completed before the hold expires, the booking hold can expire and the dates may become available again. A payment that succeeds after the hold expires is flagged for reconciliation; it is not automatically treated as a confirmed reservation. If Paystack charged you but the booking did not confirm, contact support and provide the booking reference and payment reference.

A guest account is not required for every booking. Guest checkout bookings use a private confirmation token, so keep the booking confirmation and reference available.
Booking confirmation email is sent only when the service's email settings are configured. If no confirmation email arrives, check the booking confirmation page or Account → Bookings, or contact support with the booking reference.

### Viewing a booking

Open **Account → Bookings** to see upcoming, past, and cancelled bookings. A booking can remain listed as upcoming while the stay is in progress. The card indicates when check-in has passed and date changes are no longer available.

### Requesting a date change

Before check-in, open **Manage booking → Change dates**. Choose new dates and check availability and the quoted total.

- Submitting a request does not change your existing reservation dates.
- The host reviews the request. The original dates remain active until the host approves it.
- The system checks availability again when the host decides.
- The current approval flow only permits a date change when the booking total is unchanged. If the total changes, contact support to arrange the price difference; do not assume the new dates are accepted.
- If approved, the booking updates to the new dates, and the old and new dates remain visible in the host and admin records.
- Changes close once check-in has started.

### Requesting a cancellation

Before check-in, open **Manage booking → Cancel booking**. The page shows an estimate based on payments recorded and the platform's current timing calculation.

- Sending a cancellation request does not cancel the reservation immediately. The booking remains confirmed while the admin team reviews it.
- An administrator decides whether to approve or decline the cancellation.
- If the cancellation is declined, the booking remains confirmed and no refund is initiated through this workflow.
- If cancellation is approved, the booking becomes cancelled. This is separate from refund approval.

### Understanding refund status

Cancellation approval and refund approval are two different decisions:

1. After an approved cancellation, an eligible refund enters a separate admin review.
2. If an administrator approves the refund, the refund is authorized for manual payment. **No money is transferred by the approval itself.**
3. A team member sends the refund through the approved payment method, then records the actual amount and transaction reference in the system.
4. The guest's booking page then shows the amount and recorded date. A bank or mobile-money provider may take additional time to post the funds.

An estimate is not a guaranteed final refund. Property terms, fees, and payment history may affect the final decision. Contact support if the displayed status or amount appears incorrect.

### After the stay

Guests do not need to press a check-out button. The host records completion, or the system does it automatically after the configured check-out time plus the grace period. Once completed, eligible guests can leave a review in their account.

## For Hosts

### Bookings panel

In **Host → Bookings**, use the Confirmed, Completed, and Cancelled filters. Each card separates the booking reference, property, stay dates, guest/party details, payout amount, and support links.

- The **Dates updated** notice highlights approved changes and shows the previous and new date ranges.
- **Booking support** opens the conversation associated with that booking.
- **Report an issue** opens a tracked support case for a booking concern or dispute.
- Cancellation requests are not decided in the host panel; they go to the admin team.
- Hosts review and decide date-change requests. The booking only changes after approval.

### Completing a stay

On the check-out date, the booking card shows the property's configured check-out time in East Africa Time (EAT). The page refreshes its local clock check every 30 seconds while open; this is not a server request. Once that time has passed, the host can choose **Mark completed**.

The system will reject completion if:

- The booking is not confirmed.
- The property's check-out time has not passed in Nairobi time.
- A guest date-change or cancellation request is still pending.

Marking a stay complete records that the stay ended; it does not send the host money immediately. The payout may remain in **Processing** during the post-check-out grace period or while a relevant support case/request remains unresolved.

### Host payouts

The host payout page uses these meanings:

- **Processing**: temporary hold. It is not a payment currently being transferred. The system waits until 24 hours after the scheduled check-out time and checks for unresolved support cases or guest requests.
- **Owed**: the hold has cleared and the amount is recorded as payable to the host. It is still awaiting an actual transfer.
- **Paid**: an administrator has recorded that the payout was paid.

Hosts should report a booking issue promptly. An unresolved case can keep a payout on hold while the team reviews it.

## For Administrators and Operations

### 1. Confirm a pending booking

Open **Admin → Bookings** and review the guest, host, property, dates, party size, and payment record. A pending booking should only be confirmed when the payment/booking evidence supports it. Paystack's verified webhook normally confirms successful payments automatically; do not treat a browser redirect alone as proof of payment.

### 2. Review a cancellation request

Open **Admin → Cancellation Requests**. Confirm the booking reference, guest, property, stay dates, guest note, amount paid, refund estimate, and relevant property policy.

- Approve only if cancellation is appropriate. Approval changes the booking to cancelled.
- Decline with a clear reason. The booking remains confirmed.
- If an eligible estimate exists, approval routes the refund case to **Admin → Refunds**. This does not approve or send the refund.
- If the request is stale because the booking dates/status changed or check-in has started, do not override the guard; investigate the booking and contact the guest.

The Admin → Bookings detail also has a direct cancel control for pending or confirmed bookings. That is an admin-initiated booking cancellation, not a guest cancellation request, and it does not automatically create a refund case in Admin → Refunds. For a guest-requested cancellation, use the Cancellation Requests workflow. For an admin-initiated cancellation, document the reason and separately coordinate any refund through the approved finance process; do not assume a refund queue item was created.

### 3. Decide a refund

Open **Admin → Refunds**. The queue separates cases into **Needs decision**, **Approved, not sent**, and **Decided**.

Each case links to the relevant booking and shows the guest, host, property, dates, original payment records/references, amount paid, estimate, cancellation terms, and guest note. Check these details before deciding.

- **Approve refund**: authorizes manual processing up to the approved estimate. It does not call Paystack or transfer money.
- **Decline refund**: requires a written reason. The cancellation remains in effect if it was already approved.
- **Record refund sent**: use only after verifying the real transfer. Enter the actual amount and bank/M-Pesa/provider reference. Do not enter a planned transfer as completed.
- A partial refund is recorded on the refund case and does not mark the entire original payment refunded. A full refund marks related paid payment records refunded.

Use decision notes that are factual, concise, and suitable for the guest to read. Escalate discrepancies between the estimate, payment records, and published terms instead of guessing.

### 4. Review date changes

Hosts decide date-change requests in **Host → Bookings**. Administrators can review the complete history from **Admin → Bookings → Booking details**. The current workflow only approves requests when the total is unchanged. A price-changing request requires support/finance coordination before dates or money are changed.

### 5. Record a host payout

Use **Admin → Payments & Payouts** to review payment and payout records. **Owed** means due to the host but not transferred. This page currently has no control to send or mark a host payout paid; the system does not initiate host payout transfers. Operations must use the separately approved finance process and retain transfer evidence. Do not describe an **Owed** record as paid.

## Status Glossary

| Status | Meaning |
|---|---|
| Pending booking | Booking/payment is not yet confirmed; a short payment hold may be active. |
| Confirmed | Reservation is active. |
| Completed | Stay has been recorded as ended. |
| Cancelled | Reservation is cancelled; check its linked refund request separately. |
| Cancellation request pending | Guest asked to cancel; booking remains confirmed until admin decision. |
| Refund awaiting admin review | Cancellation is approved, and a second admin decision is required for the refund. |
| Refund awaiting manual processing | Refund approved, but funds have not yet been sent/recorded. |
| Refund declined | Admin declined the refund; see the decision reason. |
| Refund processed | Admin recorded the actual amount and transaction reference after sending funds. |
| Payout processing | Host payout is temporarily held. |
| Payout owed | Hold cleared; host payout is awaiting transfer. |
| Payout paid | Admin recorded the verified host transfer. |

## Policy and Operational Notes

- **Cancellation estimate alignment:** the current application calculation is 100% at least 14 days before check-in, 50% 7–13 days before check-in, and 0% inside 7 days, based on payments recorded. The published policy also mentions an administrative fee and a travel-credit alternative. Management must confirm which terms are authoritative and align the application calculation and guest wording before treating estimates as binding.
- **Refunds are manual:** the app records decisions and references; it does not itself initiate a refund transfer.
- **Host payouts are manual:** the app records Processing/Owed/Paid states; it does not itself transfer money to the host.
- **Recording host payouts:** Admin → Payments & Payouts is currently a read-only ledger; it has no control for sending a payout or changing its status to Paid. Operations must follow the separately approved finance process. Do not claim a payout is paid based only on an Owed record.
- **Booking confirmation email:** email delivery requires `RESEND_API_KEY` and `BOOKING_CONFIRMATION_FROM`. Without those settings, the confirmation page is the status source of truth.
- **Automatic stay completion:** a daily Vercel job is configured for 00:00 UTC. It completes eligible confirmed stays after the configured check-out time plus 24 hours, unless an unresolved support case or guest change/cancellation request exists. On Vercel Hobby it may execute during the scheduled hour; daily polling may add nearly another day of delay.
- **Deployment prerequisites:** Supabase must have the applicable migrations applied; the Vercel job also needs a secure `CRON_SECRET`. If deployment moves to Cloudflare, the cron must be configured as a Cloudflare Worker Cron Trigger with the corresponding scheduled handler; `vercel.json` will not schedule it there.
- **Support-case hold:** unresolved booking support cases and pending guest requests pause automatic completion/payout release. Resolve or document the case before expecting the status to advance.

## Deployment Readiness Checklist

Before relying on these flows in production, confirm the production Supabase project has all pending migrations applied. The recent workflow migrations include `20261002120000_admin_cancellation_approval.sql`, `20261002130000_checkout_completion_hybrid.sql`, `20261002140000_host_booking_display_grants.sql`, `20261002150000_host_manual_booking_completion.sql`, and `20261002160000_refund_review_workflow.sql`, in addition to the earlier booking/payment/privacy migrations. Configure the Paystack webhook and secret. Configure `CRON_SECRET` before relying on automatic stay completion; Vercel invokes the daily job at 00:00 UTC, and Hobby timing may be delayed within the scheduled hour. Configure email settings if confirmation emails are required. Test payment confirmation, cancellation, refund decisions, host completion, open-case holds, and payout status in a non-production project before launch.
