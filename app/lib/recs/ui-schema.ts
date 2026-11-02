import { z } from "zod";
import { postgresUuidSchema } from "./postgres-uuid-schema";

export const recommendationCardSchema = z.object({
  id: postgresUuidSchema,
  title: z.string(),
  location: z.string(),
  pricePerNight: z.number().finite(),
  bedrooms: z.number().int(),
  guests: z.number().int(),
  amenities: z.array(z.string()),
  description: z.string(),
  rating: z.number().finite(),
  reviewCount: z.number().int(),
  verified: z.boolean(),
  imageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  score: z.number().finite().optional(),
  score_components: z
    .object({
      cold_start: z.boolean(),
    })
    .passthrough()
    .optional(),
});

export const recommendationsResponseSchema = z.object({
  surface: z.enum(["home", "listing", "search"]),
  cold_start: z.boolean(),
  recentlyViewed: z.array(recommendationCardSchema),
  recommendations: z.array(recommendationCardSchema),
});

export type RecommendationCard = z.infer<typeof recommendationCardSchema>;
export type RecommendationsResponse = z.infer<
  typeof recommendationsResponseSchema
>;
