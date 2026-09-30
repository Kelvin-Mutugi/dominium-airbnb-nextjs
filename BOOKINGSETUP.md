# Booking and Paystack setup

## Database

Review and apply `supabase/migrations/20260930190000_booking_hold_expiry_and_minimum_stay.sql` before enabling checkout. It adds ten-minute holds, idempotent booking creation, payment-attempt storage, guest confirmation-token hashes, and atomic Paystack settlement. Do not deploy the checkout routes before applying this migration.

The migration preserves the booking statuses used by the admin and host portals: `pending`, `confirmed`, `completed`, and `cancelled`. It does not alter payout calculations.

## Environment

Copy the placeholders in `.env.example` into the deployment environment and provide:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `NEXT_PUBLIC_SITE_URL`
- `PAYSTACK_SECRET_KEY` (server only)
- `RESEND_API_KEY` (optional transactional confirmation email)
- `BOOKING_CONFIRMATION_FROM` (verified sender address for booking email)

The browser popup uses the Paystack access code returned by the server; it never receives the secret key or supplies the transaction amount.

## Paystack dashboard

Configure the webhook URL as:

`https://YOUR-DOMAIN/api/payments/paystack/webhook`

The server sets each transaction callback to:

`https://YOUR-DOMAIN/booking/{bookingId}/confirmation`

Webhook signing must use Paystack's `x-paystack-signature` header. The endpoint verifies HMAC SHA512 over the raw request body, re-verifies the transaction with Paystack, and settles it idempotently in the database.

## Flow

1. The listing page calculates the displayed total with the shared fixed per-night fee pricing function.
2. Checkout requests a pending booking; the server reads listing prices and creates a ten-minute hold.
3. The server initializes Paystack with KES, the selected channel, the booking ID metadata, and a safe reference.
4. The browser dynamically loads Paystack Inline JS and resumes the returned access code. It falls back to the hosted authorization URL if the popup is not loaded after ten seconds.
5. The confirmation page polls the authorized booking status every two seconds. Browser callbacks do not confirm bookings.
6. The signed `charge.success` webhook is the only payment-confirmation source of truth.
