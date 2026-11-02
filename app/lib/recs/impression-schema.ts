import { z } from "zod";
import { postgresUuidSchema } from "./postgres-uuid-schema.ts";

export const recommendationSurfaceSchema = z.enum([
  "home",
  "listing",
  "search",
]);

const recImpressionSchema = z
  .object({
    id: z.uuid(),
    action: z.enum(["impression", "click"]),
    surface: recommendationSurfaceSchema,
    listingId: postgresUuidSchema,
    position: z.number().int().min(1).max(100),
  })
  .strict();

export const recImpressionBatchSchema = z
  .array(recImpressionSchema)
  .min(1)
  .max(20)
  .superRefine((records, context) => {
    const ids = new Set<string>();
    for (const [index, record] of records.entries()) {
      if (ids.has(record.id)) {
        context.addIssue({
          code: "custom",
          message: "Each impression ID may appear only once per batch.",
          path: [index, "id"],
        });
      }
      ids.add(record.id);
    }
  });

export type RecImpressionRecord = z.infer<typeof recImpressionBatchSchema>[number];
