import test from "node:test";
import assert from "node:assert/strict";

import { calculateAccommodationRate } from "../app/lib/booking/monthly-pricing.ts";

test("monthly rate does not apply before 28 nights", () => {
  const rate = calculateAccommodationRate(2500, 60000, 27);
  assert.equal(rate.monthlyRateApplied, false);
  assert.equal(rate.hostSubtotal, 67500);
  assert.equal(rate.effectiveNightlyRate, 2500);
});

test("monthly rate is prorated per 30 nights from 28 nights onward", () => {
  const rate = calculateAccommodationRate(2500, 60000, 28);
  assert.equal(rate.monthlyRateApplied, true);
  assert.equal(rate.hostSubtotal, 56000);
  assert.equal(rate.effectiveNightlyRate, 2000);
});

test("whole months use the monthly rate without a rounding difference", () => {
  const rate = calculateAccommodationRate(2500, 60000, 30);
  assert.equal(rate.monthlyRateApplied, true);
  assert.equal(rate.hostSubtotal, 60000);
  assert.equal(rate.effectiveNightlyRate, 2000);
});
