# Booking payment setup

## Database

Apply migrations in order through `20261009160000_paystack_retirement.sql` before enabling Daraja collection, host disbursements, refunds, or payout reversals. The final migration removes obsolete Paystack payment-attempts and fee columns/RPCs; it preserves `auth.users`, profiles, and user rows. Existing dummy payment-attempt data in the retired Paystack table is discarded when that migration is applied.

Guest checkout accepts M-Pesa only. The final booking total is rounded to the nearest whole KES and the adjustment is displayed as its own line. Safaricom collection fees are intended to reduce host earnings, but new Daraja bookings remain ineligible for host withdrawal until actual collection fees are reconciled. Host payouts use Safaricom B2C, with actual payout fees reconciled after the result callback.

### Resetting test bookings

For a deliberate test-data reset, `supabase/testing/reset_test_booking_data.sql` is a one-off script, not an automatically applied migration. Verify the active Supabase project is the intended test project before running it. It removes bookings and booking-linked payment, payout, refund, support, notification, and test audit/review records. It preserves `auth.users`, profile rows and personal fields, listings, storage objects, and unrelated support/contact/audit records; it sets `host_fee_balance` to zero only for hosts linked to the deleted bookings. It has not been applied to any database by this repository change.

Keep Daraja checkout in sandbox until the fee-reconciliation workflow is implemented. Do not switch production traffic to this flow while new host payouts are intentionally blocked awaiting actual collection-fee reconciliation.

## Environment

Configure the following in the Cloudflare Worker environment. Keep credentials in Worker secrets, not in `wrangler.jsonc`, source control, or browser-visible variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `NEXT_PUBLIC_SITE_URL`
- `DARAJA_ENVIRONMENT` (`sandbox` or `production`)
- `DARAJA_CONSUMER_KEY` (secret)
- `DARAJA_CONSUMER_SECRET` (secret)
- `DARAJA_SHORTCODE` (secret)
- `DARAJA_STK_PASSKEY` (secret)
- `DARAJA_STK_TRANSACTION_TYPE` (`CustomerPayBillOnline` or `CustomerBuyGoodsOnline`)
- `DARAJA_STK_CALLBACK_URL` (public HTTPS URL)
- `DARAJA_B2C_INITIATOR_NAME` (configuration)
- `DARAJA_B2C_SECURITY_CREDENTIAL` (secret)
- `DARAJA_B2C_RESULT_URL` (public HTTPS URL)
- `DARAJA_B2C_TIMEOUT_URL` (public HTTPS URL)
- `DARAJA_REVERSAL_RESULT_URL` (public HTTPS URL)
- `DARAJA_REVERSAL_TIMEOUT_URL` (public HTTPS URL)
- `DARAJA_REVERSAL_RECEIVER_IDENTIFIER_TYPE` (confirm the provisioned shortcode identifier type with Safaricom; defaults to `11`)
- `RESEND_API_KEY` (optional transactional confirmation email)
- `BOOKING_CONFIRMATION_FROM` (verified sender address for booking email)

Add secrets with `wrangler secret put SECRET_NAME` for each secret in the deployed Worker environment. Do not use sandbox credentials or sandbox callback URLs for production.

## Daraja callback

Configure Daraja Lipa na M-Pesa Online to call:

`https://YOUR-DOMAIN/api/payments/daraja/callback`

The server initiates STK Push using the booking amount and the guest phone stored on the booking. Callback request IDs, amount, phone, and receipt are checked against the attempt; successful callbacks are also checked using the STK status query before the database settlement RPC can confirm the booking. Browser redirects and callback payloads alone do not confirm a booking.

The callback URL must be public HTTPS and reachable by Safaricom. Test it with Daraja sandbox before switching `DARAJA_ENVIRONMENT` to production.

For host disbursements, configure the B2C result and queue-timeout URLs as:

`https://YOUR-DOMAIN/api/payments/daraja/b2c/result`

`https://YOUR-DOMAIN/api/payments/daraja/b2c/timeout`

For B2C reversals, configure:

`https://YOUR-DOMAIN/api/payments/daraja/b2c/reversal/result`

`https://YOUR-DOMAIN/api/payments/daraja/b2c/reversal/timeout`

The initiator name and encrypted security credential must match Safaricom's B2C setup for the selected environment. The admin provides a whole-KES fee estimate before payout initiation. Actual fees are reconciled after a successful result; the variance and whole-KES rounding difference adjust the host's signed fee balance. A timeout or ambiguous submission leaves the request reserved for manual Safaricom reconciliation. Reversal initiation is available only for a successful payout whose original fee was reconciled. The host payout is restored only after a successful reversal result callback; reversal fees are reconciled separately.

## Flow

1. The listing and checkout show one nightly rate with the admin markup already included; only mandatory host charges and selected optional host extras appear as separate lines.
2. The server calculates prices, rounds the guest total to whole KES, records the signed adjustment, and creates a ten-minute booking hold.
3. The server initializes one Daraja STK Push attempt using the saved Kenyan phone number. Duplicate attempts for the same booking are prevented while a request is active or needs reconciliation.
4. The guest approves the prompt on their phone. The confirmation page polls booking state; only the server callback and Daraja status check can settle the payment.
5. A callback received after the hold expires is recorded as a late success and does not automatically confirm the booking.
6. Collection fees remain unreconciled until their actual amount is confirmed, so the associated host payout cannot be withdrawn yet.
7. Host B2C payouts, approved guest refunds, and payout reversals require matching Safaricom result callbacks before their ledgers are changed. Admins reconcile actual collection, transfer, and reversal fees from the authoritative Safaricom fee source; these costs are carried against host earnings.
