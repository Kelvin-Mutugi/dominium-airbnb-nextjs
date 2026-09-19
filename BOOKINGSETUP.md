# B&B Paystack payment block

## Files
- Replace the existing booking component with `replace-booking-component/BookingCard.tsx`.
- Replace `app/lib/paystack.ts`.
- Add `app/lib/paystack-payment.ts`.
- Replace/add `app/api/payments/paystack/initialize/route.ts`.
- Add `app/api/payments/paystack/verify/route.ts`.
- Add `app/api/payments/paystack/webhook/route.ts`.
- Add `app/booking/payment/callback/page.tsx`.

## Environment
Add these to `.env.local` and restart Next.js:
- `PAYSTACK_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Never expose `PAYSTACK_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix.

## Paystack dashboard
Production webhook URL:
`https://YOUR-DOMAIN/api/payments/paystack/webhook`

The checkout callback URL is supplied per transaction as:
`https://YOUR-DOMAIN/booking/payment/callback`

## Flow
1. Booking form calls `/api/bookings`.
2. Server creates a pending booking/payment and calculates the amount.
3. `/api/payments/paystack/initialize` creates the Paystack hosted checkout.
4. Browser redirects to Paystack.
5. Paystack redirects to `/booking/payment/callback`.
6. Callback calls `/api/payments/paystack/verify`.
7. Paystack webhook also calls the server verification flow.
8. Only a verified successful KES transaction matching the stored amount marks the payment `paid` and booking `confirmed`.

The callback is useful for the customer's immediate result. The webhook is the server-side source of truth and also handles cases where the customer's browser cannot complete the redirect.
