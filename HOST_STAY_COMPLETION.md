# Host Stay Completion

A host can mark a confirmed booking completed once its listing's configured check-out time has passed in Africa/Nairobi. The host action remains available as the immediate path and records `completed_at` and `completion_source = 'host'`.

If the host does not act, the daily Vercel cron calls `/api/cron/complete-stays` at 00:00 UTC. It completes confirmed stays after the configured check-out time plus 24 hours, recording `completion_source = 'system'`. It leaves stays confirmed while a booking has an unresolved support case or pending date-change/cancellation request. On Vercel Hobby, the invocation can occur any time during the scheduled hour, and daily polling means completion can be delayed by nearly another day after the 24-hour grace threshold.

Host completion creates a payout in `processing` until 24 hours after scheduled check-out and until unresolved booking support cases and change requests are cleared. The daily job then moves the payout to `owed`. Automatically completed stays become `owed` immediately because they have already passed the grace period and have no open case/request. `Owed` means awaiting payment; this workflow does not transfer funds.

Hosts can request eligible `owed` payouts in Host → Payouts. A request reserves its linked payout rows and snapshots the host's M-Pesa destination. An admin verifies the destination and fee estimate, then initiates a Safaricom B2C payment in Admin → Payments & Payouts → Withdrawal requests. The request remains reserved until a matching Safaricom result callback confirms success; acceptance of the initiation request is not proof of payment. After success, an admin records the actual fee from the authoritative Safaricom fee source. The difference between estimated and actual fees, including whole-KES rounding, adjusts the host's signed fee balance and applies to future payouts. A paid B2C payout can be reversed from the same request screen; the ledger is restored only after Safaricom confirms reversal, and the reversal fee is reconciled separately. Failed transfers can be retried only after a definite failure result. Timeouts and uncertain payout or reversal submissions must be reconciled with Safaricom before retry or cancellation. Historical payouts without the new price/fee snapshot stay unavailable for withdrawal until manually reconciled.

## Deployment

1. Apply all migrations in order, including `supabase/migrations/20261006100000_host_payout_platform_charge_split.sql`, `supabase/migrations/20261006110000_host_requested_payouts_and_fee_ledger.sql`, `supabase/migrations/20261009120000_daraja_stk_collection.sql`, `supabase/migrations/20261009130000_daraja_b2c_disbursements.sql`, `supabase/migrations/20261009140000_daraja_fee_and_refund_reconciliation.sql`, `supabase/migrations/20261009150000_daraja_b2c_reversals.sql`, and `supabase/migrations/20261009160000_paystack_retirement.sql`.
2. Configure a high-entropy `CRON_SECRET` environment variable in the deployment environment. Vercel sends it as a Bearer token to scheduled functions.
3. Deploy with `vercel.json` so the route runs daily. This schedule is compatible with Vercel Hobby; it does not require Pro.
4. Verify the scheduled route's logs and the returned `completedCount` and `payoutsReleased` after deployment.

Listing check-out times in `h:mm AM/PM` or 24-hour `HH:MM` format are honored. Missing or unrecognized values fall back to 11:00 AM EAT, matching the listing form default.
