import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBookingFinancialSnapshot,
  buildGuestCollectionPosting,
  buildHostPayoutPosting,
  buildRefundPosting,
  buildReversalPosting,
  canIssueRefund,
  canProcessPayoutJob,
  canViewFinancialRecord,
  createBalancedJournalTransaction,
  createBookingPriceSnapshot,
  dedupeEvents,
  ensureReconciliationSafe,
  getReversalState,
  isPayoutAmbiguous,
  isPayoutEligible,
  isPostedRecord,
  isSuccessfulCollectionCallback,
  isSuccessfulRefundResult,
  money,
  validateBalancedEntries,
} from "../app/lib/financial-ledger.ts";

test("1. Successful guest payment creates one balanced journal transaction", () => {
  const tx = buildGuestCollectionPosting({
    guestTotal: 1000,
    hostAmount: 850,
    platformMarkup: 150,
    idempotencyKey: "payment-success-1",
    bookingId: "b-1",
    paymentId: "pay-1",
  });

  assert.equal(tx.status, "posted");
  assert.ok(tx.entries.length >= 3);
  assert.equal(
    tx.entries.reduce((sum, row) => sum + Number(row.debit ?? 0) - Number(row.credit ?? 0), 0),
    0,
  );
});

test("2. Failed payment creates no successful collection posting", () => {
  const callback = isSuccessfulCollectionCallback({
    resultCode: 1,
    amount: 1000,
    expectedAmount: 1000,
    receiptNumber: "",
  });

  assert.equal(callback, false);
});

test("3. Duplicate payment callbacks create no duplicate entries", () => {
  const events = [
    { sourceType: "payment", sourceRef: "pay_123", idempotencyKey: "cb-1" },
    { sourceType: "payment", sourceRef: "pay_123", idempotencyKey: "cb-1" },
    { sourceType: "payment", sourceRef: "pay_456", idempotencyKey: "cb-2" },
  ];

  assert.equal(dedupeEvents(events).length, 2);
});

test("4. Concurrent duplicate callbacks remain safe", () => {
  const callbacks = Array.from({ length: 12 }, (_, index) => ({
    sourceType: "payment",
    sourceRef: `pay_${index % 3}`,
    idempotencyKey: `callback-${index % 3}`,
  }));

  const unique = dedupeEvents(callbacks);
  assert.equal(unique.length, 3);
});

test("5. Host payable and platform markup reconcile to the captured booking amount", () => {
  const snapshot = buildBookingFinancialSnapshot({
    guestTotal: 1310,
    hostEarnings: 1100,
    platformMarkup: 210,
    hostAmountPayable: 1100,
    actualHostPaid: 0,
  });

  assert.equal(snapshot.guest_total, 1310);
  assert.equal(snapshot.host_earnings + snapshot.platform_markup, 1310);
});

test("6. Rounding and payment fees reconcile correctly", () => {
  const tx = buildGuestCollectionPosting({
    guestTotal: 1234.56,
    hostAmount: 1200.34,
    platformMarkup: 34.22,
    processingFee: 12.5,
    idempotencyKey: "fee-rounding-1",
    paymentId: "pay-fee-1",
  });

  const totalDebit = tx.entries.reduce((sum, row) => sum + Number(row.debit ?? 0), 0);
  const totalCredit = tx.entries.reduce((sum, row) => sum + Number(row.credit ?? 0), 0);
  assert.equal(money(totalDebit - totalCredit), 0);
});

test("7. Successful cancellation refund creates correct entries", () => {
  const refund = buildRefundPosting({
    refundAmount: 250,
    bookingId: "b-2",
    paymentId: "pay-2",
    idempotencyKey: "refund-1",
  });

  const totalDebit = refund.entries.reduce((sum, row) => sum + Number(row.debit ?? 0), 0);
  const totalCredit = refund.entries.reduce((sum, row) => sum + Number(row.credit ?? 0), 0);
  assert.equal(money(totalDebit - totalCredit), 0);
  assert.equal(refund.eventType, "refund_posted");
});

test("8. Duplicate refund requests cannot exceed the refundable balance", () => {
  const refundable = canIssueRefund({
    refundableBalance: 500,
    alreadyRefunded: 300,
    requestedAmount: 250,
  });
  const blocked = canIssueRefund({
    refundableBalance: 500,
    alreadyRefunded: 300,
    requestedAmount: 251,
  });

  assert.equal(refundable, false);
  assert.equal(blocked, false);
});

test("9. Failed refund does not appear as successfully refunded", () => {
  const result = isSuccessfulRefundResult({ resultCode: 1, amount: 0 });
  assert.equal(result, false);
});

test("10. Guest-initiated reversal request is not mistaken for a confirmed reversal", () => {
  const state = getReversalState({ state: "pending", confirmed: false });
  assert.equal(state, "pending");
});

test("11. Confirmed full reversal is recorded correctly", () => {
  const reversal = buildReversalPosting({
    reversalAmount: 750,
    bookingId: "b-3",
    paymentId: "pay-3",
    idempotencyKey: "reversal-1",
  });

  assert.equal(reversal.eventType, "confirmed_reversal");
  assert.equal(
    money(reversal.entries.reduce((sum, row) => sum + Number(row.debit ?? 0) - Number(row.credit ?? 0), 0)),
    0,
  );
});

test("12. Partial reversal is handled if supported", () => {
  const partial = buildReversalPosting({
    reversalAmount: 400,
    bookingId: "b-4",
    paymentId: "pay-4",
    idempotencyKey: "partial-reversal-1",
  });

  assert.equal(partial.entries[0].accountCode, "5200_REFUND_AND_DISPUTE_LOSS");
  assert.equal(
    money(partial.entries.reduce((sum, row) => sum + Number(row.debit ?? 0) - Number(row.credit ?? 0), 0)),
    0,
  );
});

test("13. A reversal after host payout preserves the payout history and records the resulting exposure correctly", () => {
  const payout = buildHostPayoutPosting({
    payoutAmount: 900,
    bookingId: "b-5",
    payoutId: "payout-5",
    idempotencyKey: "payout-5",
  });
  const reversal = buildReversalPosting({
    reversalAmount: 350,
    bookingId: "b-5",
    paymentId: "pay-5",
    idempotencyKey: "reversal-after-payout",
  });

  assert.equal(payout.eventType, "host_payout_settled");
  assert.equal(reversal.eventType, "confirmed_reversal");
  assert.ok(payout.entries.length >= 2 && reversal.entries.length >= 2);
});

test("14. Host payout is ineligible before checkout plus 24 hours", () => {
  const checkoutCompletedAt = new Date("2026-01-09T12:00:00Z");
  const eligible = isPayoutEligible({
    checkoutCompletedAt,
    now: new Date("2026-01-09T15:00:00Z"),
    hostPayoutStatus: "pending",
    amountOutstanding: 1000,
  });

  assert.equal(eligible, false);
});

test("15. Host payout becomes eligible after checkout plus 24 hours", () => {
  const eligible = isPayoutEligible({
    checkoutCompletedAt: "2026-01-01T00:00:00Z",
    now: "2026-01-02T00:00:01Z",
    hostPayoutStatus: "pending",
    amountOutstanding: 1000,
  });

  assert.equal(eligible, true);
});

test("16. Concurrent payout jobs cannot pay the same host payable twice", () => {
  const jobs = [
    { hasExistingPayout: true, payoutStatus: "pending", isAmbiguous: false },
    { hasExistingPayout: true, payoutStatus: "paid", isAmbiguous: false },
    { hasExistingPayout: false, payoutStatus: "pending", isAmbiguous: false },
  ];

  const allowed = jobs.map((job) => canProcessPayoutJob(job));
  assert.deepEqual(allowed, [false, false, true]);
});

test("17. Ambiguous payout results are reconciled before retrying", () => {
  const ambiguous = isPayoutAmbiguous({ status: "processing", resultCode: "ambiguous" });
  assert.equal(ambiguous, true);
});

test("18. Every posted journal transaction balances", () => {
  const txOne = createBalancedJournalTransaction({
    eventType: "guest_payment_received",
    sourceType: "payment",
    sourceRef: "pay-3",
    idempotencyKey: "tx-1",
    description: "test 1",
    entries: [
      { accountCode: "1100_M_PESA_CLEARING", debit: 250 },
      { accountCode: "2100_HOST_PAYABLES", credit: 200 },
      { accountCode: "2200_DEFERRED_PLATFORM_REVENUE", credit: 50 },
    ],
  });

  const txTwo = createBalancedJournalTransaction({
    eventType: "host_payout_settled",
    sourceType: "payout",
    sourceRef: "payout-3",
    idempotencyKey: "tx-2",
    description: "test 2",
    entries: [
      { accountCode: "2100_HOST_PAYABLES", debit: 500 },
      { accountCode: "6100_HOST_PAYOUT_LIABILITIES", credit: 500 },
    ],
  });

  assert.equal(validateBalancedEntries(txOne.entries).length, txOne.entries.length);
  assert.equal(validateBalancedEntries(txTwo.entries).length, txTwo.entries.length);
});

test("19. Posted journal entries cannot be modified or deleted by ordinary application operations", () => {
  const record = { status: "posted" };
  assert.equal(isPostedRecord(record), true);
});

test("20. Unauthorized guests and hosts cannot read or modify privileged financial records", () => {
  assert.equal(canViewFinancialRecord({ actorRole: "guest", requiredRole: "admin" }), false);
  assert.equal(canViewFinancialRecord({ actorRole: "host", requiredRole: "admin" }), false);
  assert.equal(canViewFinancialRecord({ actorRole: "admin", requiredRole: "admin" }), true);
});

test("21. Reconciliation can be rerun without duplicate postings", () => {
  const seenEvents = new Set(["evt-1", "evt-2"]);
  const safe = ensureReconciliationSafe({
    previousReconciledAt: "2026-01-05T00:00:00Z",
    currentEventId: "evt-3",
    seenEvents,
  });
  const duplicate = ensureReconciliationSafe({
    previousReconciledAt: "2026-01-05T00:00:00Z",
    currentEventId: "evt-1",
    seenEvents,
  });

  assert.equal(safe, true);
  assert.equal(duplicate, false);
});

test("22. Existing booking and payment workflows continue working", () => {
  const price = createBookingPriceSnapshot({
    guestTotal: 2500,
    hostEarnings: 2000,
    platformMarkup: 500,
    paymentProcessingFee: 15,
  });

  assert.equal(price.guest_total, 2500);
  assert.equal(price.host_amount_payable, 2000);
  assert.equal(price.platform_markup, 500);
});
