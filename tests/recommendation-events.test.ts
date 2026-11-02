import assert from "node:assert/strict";
import test from "node:test";
import { recEventBatchSchema } from "../app/lib/recs/event-schema.ts";

const event = {
  listingId: "123e4567-e89b-42d3-a456-426614174000",
  eventType: "view",
};

test("validates a single recommendation event and its safe metadata", () => {
  const result = recEventBatchSchema.safeParse([
    {
      ...event,
      metadata: { surface: "listing", hasDates: true, guestCount: 2 },
    },
  ]);
  assert.equal(result.success, true);
  assert.equal(
    recEventBatchSchema.safeParse([
      { eventType: "search", metadata: { surface: "search", guestCount: 0 } },
    ]).success,
    true,
  );
});

test("accepts batches up to 20 events and rejects larger batches", () => {
  assert.equal(
    recEventBatchSchema.safeParse(
      Array.from({ length: 20 }, () => event),
    ).success,
    true,
  );
  assert.equal(
    recEventBatchSchema.safeParse(
      Array.from({ length: 21 }, () => event),
    ).success,
    false,
  );
});

test("rejects malformed IDs, unsupported event types, and unapproved metadata", () => {
  assert.equal(
    recEventBatchSchema.safeParse([{ ...event, listingId: "not-a-uuid" }])
      .success,
    false,
  );
  assert.equal(
    recEventBatchSchema.safeParse([{ ...event, eventType: "click" }]).success,
    false,
  );
  assert.equal(
    recEventBatchSchema.safeParse([{ eventType: "view" }]).success,
    false,
  );
  assert.equal(
    recEventBatchSchema.safeParse([
      { ...event, metadata: { email: "guest@example.com" } },
    ]).success,
    false,
  );
});
