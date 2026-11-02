import assert from "node:assert/strict";
import test from "node:test";
import { recEventBatchSchema } from "../app/lib/recs/event-schema.ts";
import { recImpressionBatchSchema } from "../app/lib/recs/impression-schema.ts";
import { postgresUuidSchema } from "../app/lib/recs/postgres-uuid-schema.ts";

const nonRfcPostgresUuid = "00000000-0000-0000-0000-000000000001";

test("accepts canonical PostgreSQL UUIDs without RFC version bits", () => {
  assert.equal(postgresUuidSchema.safeParse(nonRfcPostgresUuid).success, true);
  assert.equal(
    postgresUuidSchema.safeParse("not-a-canonical-uuid").success,
    false,
  );
});

test("accepts PostgreSQL listing IDs in event and impression inputs", () => {
  assert.equal(
    recEventBatchSchema.safeParse([
      { listingId: nonRfcPostgresUuid, eventType: "view" },
    ]).success,
    true,
  );
  assert.equal(
    recImpressionBatchSchema.safeParse([
      {
        id: "123e4567-e89b-42d3-a456-426614174000",
        action: "impression",
        surface: "home",
        listingId: nonRfcPostgresUuid,
        position: 1,
      },
    ]).success,
    true,
  );
});
