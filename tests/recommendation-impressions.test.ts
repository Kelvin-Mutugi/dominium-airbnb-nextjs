import assert from "node:assert/strict";
import test from "node:test";
import { recImpressionBatchSchema } from "../app/lib/recs/impression-schema.ts";

const record = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  action: "impression",
  surface: "home",
  listingId: "123e4567-e89b-42d3-a456-426614174001",
  position: 1,
} as const;

test("validates recommendation impressions and click records", () => {
  assert.equal(recImpressionBatchSchema.safeParse([record]).success, true);
  assert.equal(
    recImpressionBatchSchema.safeParse([
      { ...record, action: "click", surface: "listing", position: 6 },
    ]).success,
    true,
  );
});

test("rejects malformed, unsupported, or unsafe impression records", () => {
  assert.equal(
    recImpressionBatchSchema.safeParse([
      { ...record, listingId: "not-a-uuid" },
    ]).success,
    false,
  );
  assert.equal(
    recImpressionBatchSchema.safeParse([
      { ...record, action: "save" },
    ]).success,
    false,
  );
  assert.equal(
    recImpressionBatchSchema.safeParse([
      { ...record, surface: "sales" },
    ]).success,
    false,
  );
  assert.equal(
    recImpressionBatchSchema.safeParse([
      { ...record, position: 0 },
    ]).success,
    false,
  );
  assert.equal(
    recImpressionBatchSchema.safeParse([
      { ...record, anonId: "123e4567-e89b-42d3-a456-426614174002" },
    ]).success,
    false,
  );
});

test("limits batches and rejects repeated impression IDs", () => {
  assert.equal(
    recImpressionBatchSchema.safeParse(
      Array.from({ length: 20 }, (_, index) => ({
        ...record,
        id: `123e4567-e89b-42d3-a456-${String(index).padStart(12, "0")}`,
      })),
    ).success,
    true,
  );
  assert.equal(
    recImpressionBatchSchema.safeParse(
      Array.from({ length: 21 }, (_, index) => ({
        ...record,
        id: `123e4567-e89b-42d3-a456-${String(index).padStart(12, "0")}`,
      })),
    ).success,
    false,
  );
  assert.equal(
    recImpressionBatchSchema.safeParse([record, record]).success,
    false,
  );
});
