import { z } from "zod";
import {
  type ListingRecEventType,
  type RecEventType,
} from "./types.ts";
import { postgresUuidSchema } from "./postgres-uuid-schema.ts";

const listingEventTypes = [
  "view",
  "long_dwell",
  "gallery_open",
  "save",
  "unsave",
  "share",
  "booking_start",
] as const satisfies readonly ListingRecEventType[];
const sessionEventTypes = [
  "search",
  "filter_apply",
] as const satisfies readonly Extract<RecEventType, "search" | "filter_apply">[];

const eventMetadataSchema = z
  .object({
    surface: z.enum(["home", "listing", "search"]).optional(),
    hasDates: z.boolean().optional(),
    guestCount: z.number().int().min(0).max(20).optional(),
    activeFilterCount: z.number().int().min(0).max(20).optional(),
  })
  .strict();

const listingEventSchema = z
  .object({
    listingId: postgresUuidSchema,
    eventType: z.enum(listingEventTypes),
    metadata: eventMetadataSchema.optional().default({}),
  })
  .strict();

const sessionEventSchema = z
  .object({
    listingId: postgresUuidSchema.optional(),
    eventType: z.enum(sessionEventTypes),
    metadata: eventMetadataSchema.optional().default({}),
  })
  .strict();

const recEventSchema = z.union([listingEventSchema, sessionEventSchema]);

export const recEventBatchSchema = z.array(recEventSchema).min(1).max(20);

export type ValidatedRecEvent = z.infer<typeof recEventSchema>;
