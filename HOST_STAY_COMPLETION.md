# Host Stay Completion

A host can mark a confirmed booking completed once its listing's configured check-out time has passed in Africa/Nairobi. The host action remains available as the immediate path and records `completed_at` and `completion_source = 'host'`.

If the host does not act, the Cloudflare Worker Cron Trigger at `0 0 * * *` runs the scheduled handler in `custom-worker.mjs` at 00:00 UTC. It calls `complete_due_host_bookings` and completes confirmed stays after the configured check-out time plus 24 hours, recording `completion_source = 'system'`. It leaves stays confirmed while a booking has an unresolved support case or pending date-change/cancellation request.

Host completion creates a payout in `processing` until 24 hours after scheduled check-out and until unresolved booking support cases and change requests are cleared. The daily job then moves the payout to `owed`. Automatically completed stays become `owed` immediately because they have already passed the grace period and have no open case/request. `Owed` means awaiting payment; this workflow does not transfer funds.

Hosts can request eligible `owed` payouts in Host → Payouts. A request reserves its linked payout rows and snapshots the host's M-Pesa destination. An admin verifies the destination and fee estimate, then initiates a Safaricom B2C payment in Admin → Payments & Payouts → Withdrawal requests. The request remains reserved until a matching Safaricom result callback confirms success; acceptance of the initiation request is not proof of payment. After success, an admin records the actual fee from the authoritative Safaricom fee source. The difference between estimated and actual fees, including whole-KES rounding, adjusts the host's signed fee balance and applies to future payouts. A paid B2C payout can be reversed from the same request screen; the ledger is restored only after Safaricom confirms reversal, and the reversal fee is reconciled separately. Failed transfers can be retried only after a definite failure result. Timeouts and uncertain payout or reversal submissions must be reconciled with Safaricom before retry or cancellation. Historical payouts without the new price/fee snapshot stay unavailable for withdrawal until manually reconciled.

## Deployment

1. Apply every migration in `supabase/migrations` in filename order through `20261017170000_grant_booking_hold_expiry_select.sql`. The latest migration grants authenticated hosts read access to the hold-expiry timestamp required by the host calendar and booking views.
2. Configure `SUPABASE_SERVICE_ROLE_KEY` as a Cloudflare Worker secret; the scheduled handler uses it to call the Supabase RPC. Keep it out of `wrangler.jsonc` and source control.
3. Keep both Cron Triggers in `wrangler.jsonc`: `0 0 * * *` completes eligible stays daily, and `*/5 * * * *` expires stale payment holds and processes due date-change decisions. Deploy the OpenNext Worker with `npm run deploy`.
4. Verify Cloudflare Worker logs show successful `checkout completion`, `pending payment hold expiry`, and `date-change decisions` runs. Inspect the returned RPC counts for checkout completion and date-change decisions. `vercel.json` does not schedule Cloudflare Workers.

Listing check-out times in `h:mm AM/PM` or 24-hour `HH:MM` format are honored. Missing or unrecognized values fall back to 11:00 AM EAT, matching the listing form default.
