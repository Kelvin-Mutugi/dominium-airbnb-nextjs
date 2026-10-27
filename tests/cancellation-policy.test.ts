import test from "node:test";
import assert from "node:assert/strict";

import { calculateCancellationRefund } from "../app/lib/cancellation-policy.ts";

test("14 days before check-in refunds 100% of recorded payments", () => {
  assert.deepEqual(calculateCancellationRefund(1234.56, 14), {
    refundPercent: 100,
    estimatedRefund: 1234.56,
  });
});

test("13 days before check-in refunds 50% of recorded payments", () => {
  assert.deepEqual(calculateCancellationRefund(1234.56, 13), {
    refundPercent: 50,
    estimatedRefund: 617.28,
  });
});

test("7 days before check-in refunds 50% of recorded payments", () => {
  assert.deepEqual(calculateCancellationRefund(1000, 7), {
    refundPercent: 50,
    estimatedRefund: 500,
  });
});

test("6 days before check-in refunds none of the recorded payments", () => {
  assert.deepEqual(calculateCancellationRefund(1000, 6), {
    refundPercent: 0,
    estimatedRefund: 0,
  });
});

test("after check-in does not generate a standard cancellation refund", () => {
  assert.deepEqual(calculateCancellationRefund(1000, -1), {
    refundPercent: 0,
    estimatedRefund: 0,
  });
});

test("cancellation refund estimate rejects invalid amounts and fractional days", () => {
  assert.throws(() => calculateCancellationRefund(-1, 14), /non-negative number/);
  assert.throws(() => calculateCancellationRefund(100, 7.5), /integer/);
});
