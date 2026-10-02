# Host Stay Completion

A host can mark a confirmed booking completed once its listing's configured check-out time has passed in Africa/Nairobi. The host action remains available as the immediate path and records `completed_at` and `completion_source = 'host'`.

If the host does not act, the daily Vercel cron calls `/api/cron/complete-stays` at 00:00 UTC. It completes confirmed stays after the configured check-out time plus 24 hours, recording `completion_source = 'system'`. It leaves stays confirmed while a booking has an unresolved support case or pending date-change/cancellation request. On Vercel Hobby, the invocation can occur any time during the scheduled hour, and daily polling means completion can be delayed by nearly another day after the 24-hour grace threshold.

Host completion creates a payout in `processing` until 24 hours after scheduled check-out and until unresolved booking support cases and change requests are cleared. The daily job then moves the payout to `owed`. Automatically completed stays become `owed` immediately because they have already passed the grace period and have no open case/request. `Owed` means awaiting payment; this workflow does not transfer funds.

## Deployment

1. Apply `supabase/migrations/20261002130000_checkout_completion_hybrid.sql` and `supabase/migrations/20261002150000_host_manual_booking_completion.sql`.
2. Configure a high-entropy `CRON_SECRET` environment variable in the deployment environment. Vercel sends it as a Bearer token to scheduled functions.
3. Deploy with `vercel.json` so the route runs daily. This schedule is compatible with Vercel Hobby; it does not require Pro.
4. Verify the scheduled route's logs and the returned `completedCount` and `payoutsReleased` after deployment.

Listing check-out times in `h:mm AM/PM` or 24-hour `HH:MM` format are honored. Missing or unrecognized values fall back to 11:00 AM EAT, matching the listing form default.
