# Booking / Payment / Payout Audit

Scope note: this is a repository audit only. No schema or application code was changed in this phase.

## 1) Current architecture summary

The booking and money flow is split between:

- Booking creation and hold validation in the Postgres layer (`create_booking_hold(...)` and related booking triggers / checks in the migration chain)
- Daraja STK payment initiation and callback processing in `app/lib/payments/daraja.ts` and `app/api/payments/daraja/callback/route.ts`
- Host payout initiation and settlement via Daraja B2C in `app/api/payments/daraja/b2c/*` and the SQL functions created in the Daraja migration set
- Reconciliation / fee corrections in admin RPCs and manual settlement flows
- Automatic stay completion in `app/api/cron/complete-stays/route.ts` and the RPC `complete_due_host_bookings`
- Host/admin authorization checks in `app/lib/host-auth.ts` and `app/lib/admin-auth.ts`

Current design intent is a “pending booking hold -> STK payment -> confirmed booking -> stay completion -> eligible payouts -> payout request -> B2C transfer -> paid” system. The money model is mostly a database-owned ledger with provider callbacks fed back into the same rows rather than a separate immutable ledger system.

Important architectural point: the repository and migrations are strongly pointing to a Daraja-only live flow, but the real live Supabase schema may differ from the repo. The migration files are the best available design source, but the authoritative environment is the actual database. The SQL at the end of this document must be run in the live Supabase SQL editor and pasted back before any production conclusion is finalized.

### Authorization and dashboard gates

The repo’s authorization model is straightforward:

- `requireAdmin()` checks `admin_roles.privilege` for the authenticated user and denies access by returning a not-found / unauthorized path when the row is absent or false.
- `requireHost()` checks `profiles.role = 'host'` and rejects suspended hosts.
- The host dashboard and admin payout screens rely on these gates before showing payment / payout / reconciliation state.

This is acceptable for route protection, but the overall security posture should still be checked route-by-route against the exact live Supabase schema and roles in production.

### Deployment config and scheduled jobs

Deployment and cron config is split across:

- `wrangler.jsonc` for Cloudflare/worker cron triggers and public app vars
- `vercel.json` for deployment-level config
- `app/api/cron/complete-stays/route.ts` for the daily stay-completion task

The cron route checks `CRON_SECRET` using a timing-safe comparison and then invokes `complete_due_host_bookings` with `p_grace_hours: 24`. This is the mechanism that moves bookings from in-progress to completed and releases eligible payouts for host withdrawal.

## 2) Lifecycle trace: booking -> payment -> payout

### Step 1: booking hold is created

- The booking is created in `public.create_booking_hold(...)`.
- It validates a `p_idempotency_key`, date bounds, guest details, listing availability and the pricing payload.
- It inserts a row into `public.bookings` with `status = 'pending'`, stores `hold_expires_at`, `guest_confirmation_token_hash`, and `pricing_snapshot`.
- It also inserts a `public.payments` row with `method = 'mpesa'` and `status = 'pending'`.

Key transaction-level safety:

- `pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 1))`
- `existing_row` lookup on `bookings.idempotency_key`
- re-use of the same hold if the same idempotency key arrives again

This makes the booking hold idempotent at the booking layer.

### Step 2: guest pays through STK

- The app calls `initiateDarajaStkPush({ amountKes, phone, bookingReference })` in `app/lib/payments/daraja.ts`.
- This requests a Daraja STK push using the business shortcode/passkey and the configured callback URL.
- The provider response returns `MerchantRequestID` and `CheckoutRequestID`.
- The app stores the attempt in the `daraja_payment_attempts` table and the callback is later matched by `checkout_request_id`.

At this point the database is still in a pending / initialized state. The guest has not yet had the payment confirmed by Safaricom.

### Step 3: Daraja callback arrives

- Route: `app/api/payments/daraja/callback/route.ts`
- The callback receives the STK result payload, hashes the raw body, creates a callback event row in `daraja_stk_callback_events`, and matches payloads to the relevant `daraja_payment_attempts` by `CheckoutRequestID`.
- If the callback’s `ResultCode` is `0` and `Amount`/phone/receipt are valid, it calls `settle_daraja_stk_attempt(...)` (database function). That function is the main settlement point.

This is the key decision point that turns the pending payment into a successful/failed/late-success/needs-reconciliation record. The database function is the “real” settlement authority, not the raw callback by itself.

### Step 4: payment settlement / booking confirmation

The SQL settlement flow in the Daraja STK migration checks all of the following before updating a booking as confirmed:

- attempt exists and is still eligible for settlement
- callback merchant request ID matches the original request
- callback result code is zero
- callback phone is valid
- amount matches the expected amount
- Safaricom receipt number is present
- a status query to Daraja confirms the transaction state

Then it updates:

- `public.payments.status` to a successful state
- `public.bookings.status` to `confirmed` or to a late-success variant if needed
- `public.bookings.total_amount`, `public.bookings.commission_amount`, and related payout fields
- result metadata on the payment attempt

The booking is confirmed only after the provider callback + status verification path is accepted.

### Step 5: stay completion and host payout eligibility

- The cron route `app/api/cron/complete-stays/route.ts` calls `complete_due_host_bookings`.
- It marks bookings complete after the grace period and releases `payouts` from `processing` to `owed` as eligible.
- This is not merely a UI state; it is a database state transition that chooses which payouts are eligible for withdrawal.

The SQL around `host_payout_requests` and `payouts` makes it clear that host payout eligibility is a derived business state, not a simple snapshot of raw nightly rates.

### Step 6: host payout request is created

- Host payout requests are prepared through the B2C admin functions and installed in `host_payout_requests`.
- Each request aggregates multiple `payouts` through `host_payout_request_items`.
- The request total is validated against request items and balances, and then submitted as a Daraja B2C transfer attempt.

At this stage, the “host payout request” row is not yet a cash transfer; it is a pending transfer request that still needs a successful B2C callback to be considered paid.

### Step 7: B2C transfer / callback results

- Route: `app/api/payments/daraja/b2c/result/route.ts`
- `settle_daraja_b2c_result(...)` validates the conversation + originator conversation IDs, the provider result code, and transaction ID.
- If the intent is a `host_payout`, it updates the `payouts` rows from `owed` to `paid`, updates the host payout request to `paid`, and debits or reconciles `profiles.host_fee_balance`.
- If the intent is a guest refund, it marks `payment_refund_requests` / `booking_change_requests` as processed and can mark the payment as refunded if the amount is sufficient.

This makes the provider result callback the final external confirmation of transfer success.

### Step 8: fee reconciliation and refund adjustments

The migrations define explicit admin-side reconciliation functions:

- `reconcile_daraja_b2c_fee(...)`
- `reconcile_daraja_collection_fee(...)`
- reversal and refund settlement functions

These are important because the real provider fee is often not known until Safaricom confirms it. The app therefore carries a mutable financial state and later “reconciles” the difference into `profiles.host_fee_balance`, `bookings.collection_fee_amount`, `payments.provider_fee_amount`, and related request rows.

### Step 9: final money state

The “final” money state is spread across multiple database rows, not a single ledger table:

- `bookings.total_amount` = guest total due
- `payments.amount` = paid amount
- `payments.provider_fee_amount` = collection fee
- `bookings.collection_fee_amount` = confirmed collection fee
- `bookings.host_gross_amount` = host gross expected payout before fee debt
- `payouts.amount` = what each host payout row is owed
- `host_payout_requests.amount` = request total
- `host_payout_requests.net_amount` = amount after transfer fee / outflow adjustments
- `profiles.host_fee_balance` = balancing / debt / fee ledger balance for hosts

This is not a single immutable accounting ledger; it is a set of derived rows that can be updated by later reconciliation.

## 3) Amount-by-amount: where it is calculated, stored, updated and transferred

### A. Guest total (`bookings.total_amount`)

- Calculated during booking creation: total = subtotal + service fee + additional fees, then rounded to whole KES in `calculateBookingPrice()`.
- Stored in `public.bookings.total_amount` and `public.payments.amount`.
- Updated only weakly / indirectly after booking creation; the settlement code confirms or marks a payment and may change booking status, but the base total is not meant to be mutated as an accounting input.
- Transferred from guest to platform: actual collection is made via Daraja STK to the platform’s shortcode.
- Authoritative source: the booking row at creation time, validated against the callback amount and payment attempt.

### B. Platform / collection fee (`payments.provider_fee_amount`, `bookings.collection_fee_amount`)

- Calculated in the provider callback and admin reconciliation layer, not at booking creation.
- Stored in `payments.provider_fee_amount` and `bookings.collection_fee_amount`.
- Updated by `reconcile_daraja_collection_fee(...)` when the actual provider fee is known.
- The host balance is adjusted in `profiles.host_fee_balance`.
- Authoritative source: the actual Daraja fee returned via callback and reconciled by admin function, not the initial estimate.

### C. Host gross / host payout base (`bookings.host_gross_amount`, `payouts.amount`)

- Calculated from the booking’s pricing snapshot and listing nightly base (
  `host_base_amount`, `host_gross_amount`, `host_payout_amount`)
- Stored in `public.bookings.host_gross_amount` and `public.payouts.amount`.
- Updated when a booking is completed and when payout requests are prepared / marked paid.
- Transferred from platform to host as Daraja B2C payout.
- Authoritative source: the payout row plus the settled B2C callback; intermediate `host_gross_amount` is a derived business value and can be adjusted by debt / reconciliation.

### D. Host fee balance (`profiles.host_fee_balance`)

- Derived from fee debt / reconciliation / provider fee adjustments.
- Stored in `public.profiles.host_fee_balance`.
- Updated by reconciliation functions after actual fees or payout reversals.
- Used to determine `eligible_for_withdrawal` and allow/deny payout requests.
- Authoritative source: the profile row after reconciliation, because it is used as a running balance.

### E. Guest refund (`payment_refund_requests.actual_refund_amount`, `booking_change_requests.actual_refund_amount`)

- Calculated based on the amount to refund or the original guest payment.
- Stored in the refund request row and then ultimately on the payment row (`payments.status = 'refunded'`).
- Updated by the B2C transfer settlement result.
- Transferred from platform back to guest via Daraja B2C refund flow.
- Authoritative source: the provider callback / successful B2C refund settlement, with the DB request row updated after it.

### F. Host payout transfer (`host_payout_requests.net_amount`)

- Calculated in the payout preparation / reconciliation logic.
- Stored in `host_payout_requests.net_amount` and transferred by B2C.
- Updated when the payout result callback arrives and when admin reconciliation adjusts fee differences.
- Authoritative source: the B2C result callback + the settled `payouts` row.

## 4) Money representation in use and recommendation

The migration layer clearly uses PostgreSQL `numeric(12, 2)` for the main accounting columns. This is decimal fixed-point, not integer minor units.

This is the right default for a ledger if you want:

- human-readable accounting
- no rounding drift in month-end reports
- easy numeric matching to invoice / receipt totals

However, Daraja STK/B2C requests are integer-based in practice at the external API boundary. The app correctly converts to/from KES at the edge when building the provider request and serializing the response. In other words:

- DB: decimal / major-unit accounting (`numeric(12,2)`) is the right home for ledger rows
- Provider boundary: integer whole KES values are acceptable / expected
- do not store “minor units” as the primary internal financial truth unless the business explicitly wants integer-only accounting

Recommendation:

- Keep accounting in `numeric(12, 2)` or equivalent decimal values in the database.
- Only convert to integer minor units at the provider API boundary if you need exact external exchange constraints.
- Do not mix “major-unit accounting” and “minor-unit accounting” in business calculations without explicit conversion rules.

## 5) Daraja is the only live provider; Paystack is retired

Confirmed by the migration chain:

- `20261009160000_paystack_retirement.sql` drops legacy Paystack objects and comments that Daraja is the active provider.
- `app/lib/payments/daraja.ts` uses Safaricom/M-Pesa endpoints only.
- `app/api/payments/daraja/*` is the live provider integration surface.
- There are no active runtime Paystack initiation / verification / webhook routes in the current code tree.

Possible leftover references:

- legacy migration names or comments
- historical code folders / docs referencing Paystack
- some old function names or cleanup logic that is dropped in the final migration

But active runtime code is Daraja-only.

## 6) Mismatch risk: repo schema vs live Supabase schema

This audit is based on the repo migration history and runtime code. I am not assuming the repo exactly matches the live DB. The migration history shows a multi-step transition and some objects were dropped or replaced.

Examples of tables / columns referenced in runtime code that need live verification:

- `public.bookings`
- `public.payments`
- `public.payouts`
- `public.host_payout_requests`
- `public.host_payout_request_items`
- `public.payment_refund_requests`
- `public.booking_change_requests`
- `public.daraja_payment_attempts`
- `public.daraja_stk_callback_events`
- `public.daraja_b2c_attempts`
- `public.daraja_b2c_callback_events`
- `public.profiles`
- `public.admin_roles`
- `public.listings`
- `public.listing_arrival_guides`

Likely schema drift-sensitive fields to confirm live:

- `bookings.pricing_snapshot`
- `bookings.host_gross_amount`
- `bookings.collection_fee_amount`
- `bookings.commission_amount`
- `bookings.host_payout_amount`
- `payments.provider_fee_amount`
- `profiles.host_fee_balance`
- `host_payout_requests.transfer_fee`
- `host_payout_requests.net_amount`
- `daraja_payment_attempts.*` and `daraja_b2c_attempts.*`

I have not found a confirmed code-vs-migration mismatch in the main audited flow, but I would not treat the repo as the source of truth without the live validation queries below.

## 7) Pricing snapshot status

Yes: pricing is snapshotted per booking today.

Evidence:

- `create_booking_hold(...)` takes `p_pricing_snapshot` and stores it on `bookings.pricing_snapshot`
- the booking hold validation checks that the pricing snapshot is an object and compares it to prior values on idempotent re-requests
- `normalizeGuestPriceSnapshot()` reads the stored snapshot for confirmation emails and price display

However, the system does not treat the pricing snapshot as the final immutable payout calculation source.

Important nuance:

- the original snapshot is stored for booking history and guest billing transparency
- payout eligibility and final fee reconciliation can re-interpret or adjust amounts later via fee debt, payout requests, and the `reconcile_*` functions
- so the snapshot is present, but not every final financial amount is immutable after it is stored

## 8) Idempotency protections and their gaps

Confirmed protections:

- booking hold uses `idempotency_key` and compares the payload hash / snapshot on re-entry
- `pg_advisory_xact_lock(hashtextextended(...))` is used to serialize duplicate requests
- Daraja payment / B2C attempts store request IDs and callback identifiers and dedupe on the natural unique keys
- the callback tables record event fingerprints (`createHash("sha256").update(rawBody).digest("hex")`) and enforce some de-duplication

Gaps / risk areas:

- duplicate provider callback replay is only partially handled via event fingerprint + status checks; if the same callback arrives twice in different code paths, you still rely on row status transitions and lookup logic
- duplicate payout result callbacks can happen if provider retries the result or if the app is restarted mid-call; the app attempts to avoid double processing with `in("status", ...)` constraints but this is still a soft guarantee unless every callback is serialized at the database layer
- no single end-to-end immutable ledger means money can be “corrected” after initial success, which is acceptable only if reconciliation is strictly controlled
- manual admin steps and multi-step fee adjustments mean there is a meaningful human-in-the-loop “override” risk

## 9) Critical risks

### Duplicate payment risk

The system is designed to avoid duplicate booking holds and duplicate STK requests, but the real risk is provider callback replay or a race where the same checkout request is processed twice after a timeout or retry. If the callback result is duplicated, the settlement SQL must reject re-entry and ensure the payment stays in a single final state. The code tries to do this, but the real safety depends on the live database constraints and status transitions.

### Duplicate payout risk

`host_payout_requests` and `payouts` are interlocked, but the flow still depends on a successful result callback + state transitions. If two result callbacks or a retry hits the same transfer attempt, a duplicate payout is possible unless the database rows and callback IDs are strictly deduplicated. This risk is not theoretical given the multiple callbacks and the fact that some payout states remain “awaiting_manual_processing” until admin review.

### Unauthenticated callbacks

The callback routes parse JSON and do some matching, but there is no strong cryptographic verification described in the code reviewed here. The routes rely on the database matching of IDs and callback fingerprints; they do not appear to validate a Safaricom-origin HMAC or shared-secret verification mechanism. This is a key risk unless Safaricom’s provider contract or reverse-proxy layer enforces origin validation.

### Mutable financial state

This is the largest design risk: payment, payout and fee rows can move from initializing -> pending -> succeeded -> reconciliation_required -> paid / refunded / adjusted. This is workable, but only if the system keeps a strict audit trail and a small number of allowed state transitions. The migration set clearly allows fee differences and host balance adjustments after the fact, which is a legitimate accounting model only when reconciled tightly and backed by explicit admin review.

## 10) Open business decisions requiring input

The repo audit surfaced these decisions that need a business answer before I would treat the system as production-ready:

1. Should a host payout automatically release when a stay is marked complete, or should all payouts require a manual admin approval step?
2. When a provider fee differs from the estimate, should the system auto-adjust `host_fee_balance` or always require admin confirmation?
3. Is `host_fee_balance` meant to be a debt ledger only, or a general host wallet that can be netted against future payouts?
4. Should refund amounts be auto-processed only when the actual transfer amount is equal to or greater than the original payment amount?
5. Are duplicate provider callback deliveries considered impossible or should the app explicitly enforce a stronger “one successful settlement per request” guarantee at the DB and callback layer?
6. Do we want an immutable audit ledger beside the current mutable rows, or is the current row-based approach acceptable with reconciliation?
7. Should we keep the current `numeric(12,2)` accounting and only use minor units at external provider boundaries, or should the business adopt integer minor units globally?

## 11) Read-only live schema checks to run in Supabase SQL editor

Run the following in the Supabase SQL editor and paste the results back. They are read-only and designed to validate the real schema before any final design assertion is relied on.

### 11.1 Information schema for the affected tables and columns

```sql
select table_schema,
       table_name,
       column_name,
       data_type,
       is_nullable,
       column_default,
       udt_name
from information_schema.columns
where table_schema = 'public'
  and (
    table_name in (
      'bookings',
      'payments',
      'payouts',
      'host_payout_requests',
      'host_payout_request_items',
      'payment_refund_requests',
      'booking_change_requests',
      'daraja_payment_attempts',
      'daraja_stk_callback_events',
      'daraja_b2c_attempts',
      'daraja_b2c_callback_events',
      'profiles',
      'admin_roles',
      'listings',
      'listing_arrival_guides'
    )
  )
order by table_name, ordinal_position;
```

### 11.2 Check for tables referencing the booking / payment / payout domain

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and (
    lower(table_name) like '%booking%'
    or lower(table_name) like '%payment%'
    or lower(table_name) like '%payout%'
    or lower(table_name) like '%daraja%'
    or lower(table_name) like '%refund%'
    or lower(table_name) like '%host%'
  )
order by table_name;
```

### 11.3 Indexes on the core ledger tables

```sql
select schemaname,
       tablename,
       indexname,
       indexdef
from pg_indexes
where schemaname = 'public'
  and (
    tablename in (
      'bookings',
      'payments',
      'payouts',
      'host_payout_requests',
      'host_payout_request_items',
      'payment_refund_requests',
      'booking_change_requests',
      'daraja_payment_attempts',
      'daraja_stk_callback_events',
      'daraja_b2c_attempts',
      'daraja_b2c_callback_events'
    )
  )
order by tablename, indexname;
```

### 11.4 Policies on the core financial tables

```sql
select schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual,
       with_check
from pg_policies
where schemaname = 'public'
  and (
    tablename in (
      'bookings',
      'payments',
      'payouts',
      'host_payout_requests',
      'host_payout_request_items',
      'payment_refund_requests',
      'booking_change_requests',
      'daraja_payment_attempts',
      'daraja_stk_callback_events',
      'daraja_b2c_attempts',
      'daraja_b2c_callback_events',
      'profiles',
      'admin_roles'
    )
  )
order by tablename, policyname;
```

### 11.5 Functions / RPCs relevant to the booking and money flow

```sql
select n.nspname as schema_name,
       p.proname as function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
       p.prorettype::regtype as return_type,
       p.prosecdef as is_security_definer,
       p.prolang::regnamespace::text as language,
       pg_catalog.obj_description(p.oid, 'pg_proc') as description
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    lower(p.proname) like '%booking%'
    or lower(p.proname) like '%daraja%'
    or lower(p.proname) like '%payout%'
    or lower(p.proname) like '%refund%'
    or lower(p.proname) like '%reconcile%'
    or lower(p.proname) like '%settle%'
    or lower(p.proname) like '%complete%'
  )
order by p.proname;
```

### 11.6 Check whether the app’s runtime object names exist in live schema

```sql
with expected_objects(name, type) as (
  values
    ('bookings', 'table'),
    ('payments', 'table'),
    ('payouts', 'table'),
    ('host_payout_requests', 'table'),
    ('host_payout_request_items', 'table'),
    ('payment_refund_requests', 'table'),
    ('booking_change_requests', 'table'),
    ('daraja_payment_attempts', 'table'),
    ('daraja_stk_callback_events', 'table'),
    ('daraja_b2c_attempts', 'table'),
    ('daraja_b2c_callback_events', 'table'),
    ('profiles', 'table'),
    ('admin_roles', 'table'),
    ('create_booking_hold', 'function'),
    ('settle_daraja_stk_attempt', 'function'),
    ('settle_daraja_b2c_result', 'function'),
    ('reconcile_daraja_collection_fee', 'function'),
    ('reconcile_daraja_b2c_fee', 'function'),
    ('complete_due_host_bookings', 'function')
)
select e.name,
       e.type,
       case
         when e.type = 'table' then to_char(exists (
           select 1 from information_schema.tables t
           where t.table_schema = 'public' and t.table_name = e.name
         ), 'true/false')
         when e.type = 'function' then to_char(exists (
           select 1 from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = e.name
         ), 'true/false')
       end as exists_in_live_schema
from expected_objects e
order by e.type, e.name;
```

## 12) Short verdict

The repo shows a coherent Daraja-first booking and payout architecture, with booking holds, Daraja STK payment settlement, batch host-payout flows, and reconciliation logic all designed around the database as the authoritative flow controller.

The biggest caveats are:

- live schema drift risk
- callback authenticity risk
- mutable accounting states that require careful reconciliation
- strong business logic around fees and payout eligibility

The design is plausible, but it should be treated as a real accounting and provider integration system that needs live schema validation and operational business controls before it is considered production-safe.

## 13) Admin finance navigation

The finance workspace uses the existing `/admin/financial` route convention and the shared admin sidebar:

- `/admin/financial` — database-backed ledger overview
- `/admin/financial/ledger` — paginated journal transactions
- `/admin/financial/payouts` — host settlement postings
- `/admin/financial/refunds` — refund and confirmed reversal postings
- `/admin/financial/reconciliation` — payment/payout source matching and journal balance checks
- `/admin/financial/reports` — paginated account activity with optional posting-date filters

Each finance data loader checks `requireAdmin()` before accessing the service-role client. The ledger tables are also protected by service-role-only row-level security and grants, and the ledger RPCs explicitly revoke execution from `PUBLIC`, `anon`, and `authenticated`; the browser does not receive direct database access or privileged finance APIs. Empty pages reflect an empty ledger; no demonstration financial figures or sample transactions are used.
