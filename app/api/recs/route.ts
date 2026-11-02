import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPublicListingsByIds } from "@/app/lib/public-listings";
import { createClient } from "@/app/lib/supabase/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import {
  NIGHTLY_PRICE_BANDS,
  type ListingFeatures,
  type SessionPreferenceProfile,
} from "@/app/lib/recs/types";
import {
  listingSimilarity,
  rerankRecommendations,
  type RecommendationCandidate,
  type RecommendationScoreComponents,
} from "@/app/lib/recs/rerank";
import { getStayNights } from "@/app/lib/booking/availability";
import { postgresUuidSchema } from "@/app/lib/recs/postgres-uuid-schema";
import { recConfig } from "@/lib/recs/config";

const ANON_COOKIE = "dominium_anon_id";
const COOKIE_CONSENT = "dominium_cookie_consent";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const querySchema = z
  .object({
    surface: z.enum(["home", "listing", "search"]).default("home"),
    listingId: postgresUuidSchema.optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(recConfig.maximumLimit)
      .default(recConfig.defaultLimit),
    checkIn: z.iso.date().optional(),
    checkOut: z.iso.date().optional(),
  })
  .strict()
  .superRefine((query, context) => {
    if (query.surface === "listing" && !query.listingId) {
      context.addIssue({
        code: "custom",
        message: "listingId is required for the listing surface.",
        path: ["listingId"],
      });
    }
    if (Boolean(query.checkIn) !== Boolean(query.checkOut)) {
      context.addIssue({
        code: "custom",
        message: "checkIn and checkOut must be provided together.",
        path: ["checkOut"],
      });
    }
    if (query.checkIn && query.checkOut && getStayNights(query.checkIn, query.checkOut) < 1) {
      context.addIssue({
        code: "custom",
        message: "checkOut must be after checkIn.",
        path: ["checkOut"],
      });
    }
  });

const preferenceWeightsSchema = z.record(z.string(), z.number().finite().min(0));
const profileSchema = z.object({
  areas: preferenceWeightsSchema,
  bedrooms: preferenceWeightsSchema,
  price_bands: z
    .object({
      budget: z.number().finite().min(0).optional(),
      mid: z.number().finite().min(0).optional(),
      premium: z.number().finite().min(0).optional(),
    })
    .strict(),
  amenities: preferenceWeightsSchema,
  property_types: preferenceWeightsSchema,
  meaningful_event_count: z.number().int().min(0),
});

const scoreRowSchema = z.object({
  listing_id: postgresUuidSchema,
  profile_match: z.number().finite(),
  popularity: z.number().finite(),
  freshness: z.number().finite(),
  availability_fit: z.number().finite(),
  score: z.number().finite(),
  meaningful_event_count: z.number().int().min(0),
  cold_start: z.boolean(),
  featured_rank: z.number().int().nullable(),
});

const featuresSchema = z.object({
  id: postgresUuidSchema,
  area: z.string().nullable(),
  bedrooms: z.number().int().nullable(),
  nightly_price_band: z.enum(NIGHTLY_PRICE_BANDS),
  amenities: z.array(z.string()),
  property_type: z.string().nullable(),
  created_at: z.string(),
  is_active: z.boolean(),
});

type ScoreRow = z.infer<typeof scoreRowSchema>;

function response(
  request: NextRequest,
  payload: unknown,
  status: number,
  anonId?: string,
  shouldSetCookie = false,
) {
  const result = NextResponse.json(payload, { status });
  result.headers.set("Cache-Control", "private, no-store");
  if (anonId && shouldSetCookie) {
    result.cookies.set(ANON_COOKIE, anonId, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return result;
}

function scoreComponents(row: ScoreRow): RecommendationScoreComponents {
  return {
    profile_match: row.profile_match,
    popularity: row.popularity,
    freshness: row.freshness,
    availability_fit: row.availability_fit,
    meaningful_event_count: row.meaningful_event_count,
    cold_start: row.cold_start,
    featured_rank: row.featured_rank,
  };
}

function calculateScore(components: RecommendationScoreComponents) {
  if (components.cold_start) {
    return (
      recConfig.coldStartWeights.popularity * components.popularity +
      recConfig.coldStartWeights.freshness * components.freshness
    );
  }
  const weights = recConfig.scoreWeights;
  return (
    weights.profile * components.profile_match +
    weights.popularity * components.popularity +
    weights.freshness * components.freshness +
    weights.availability * components.availability_fit
  );
}

export async function GET(request: NextRequest) {
  const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsedQuery = querySchema.safeParse(rawQuery);
  if (!parsedQuery.success) {
    return response(request, { error: "Invalid recommendation request." }, 400);
  }

  const query = parsedQuery.data;
  const consentAccepted =
    request.cookies.get(COOKIE_CONSENT)?.value === "v1.accepted";
  const suppliedAnonId = request.cookies.get(ANON_COOKIE)?.value;
  const hasValidAnonCookie =
    suppliedAnonId !== undefined && UUID_PATTERN.test(suppliedAnonId);
  const anonId =
    consentAccepted && hasValidAnonCookie
      ? suppliedAnonId
      : crypto.randomUUID();
  const shouldSetCookie = consentAccepted && !hasValidAnonCookie;
  const failure = (
    stage: string,
    code?: string,
    issues?: string[],
  ) =>
    response(
      request,
      {
        error: "Unable to load recommendations.",
        ...(process.env.NODE_ENV !== "production"
          ? {
              diagnostic: {
                stage,
                ...(code ? { code } : {}),
                ...(issues && issues.length > 0 ? { issues } : {}),
              },
            }
          : {}),
      },
      503,
      anonId,
      shouldSetCookie,
    );

  try {
    const sessionClient = await createClient();
    const {
      data: { user },
      error: userError,
    } = await sessionClient.auth.getUser();
    if (userError) {
      console.error("Recommendation user lookup failed:", userError.message);
      return failure("user_auth", userError.code);
    }

    const admin = getSupabaseAdmin();
    const { data: rawProfile, error: profileError } = await admin.rpc(
      "get_session_profile",
      {
        p_anon_id: anonId,
        p_user_id: consentAccepted ? (user?.id ?? null) : null,
      },
    );
    if (profileError) {
      console.error("Recommendation profile query failed:", profileError);
      return failure("profile_rpc", profileError.code);
    }
    const parsedProfile = profileSchema.safeParse(rawProfile);
    if (!parsedProfile.success) {
      console.error("Recommendation profile returned an invalid shape.");
      return failure("profile_validation");
    }
    const profile: SessionPreferenceProfile = parsedProfile.data;

    const recommendationLimit = Math.min(
      recConfig.maximumCandidatePool,
      query.limit * recConfig.candidatePoolMultiplier,
    );
    const context: Record<string, unknown> = {
      profile,
      weights: recConfig.scoreWeights,
      cold_start_weights: recConfig.coldStartWeights,
    };
    if (consentAccepted && user) context.user_id = user.id;
    if (query.checkIn && query.checkOut) {
      context.check_in = query.checkIn;
      context.check_out = query.checkOut;
    }

    const { data: rawScores, error: scoreError } = await admin.rpc(
      "recommend_listings",
      {
        p_anon_id: anonId,
        p_limit: recommendationLimit,
        p_exclude: query.listingId ? [query.listingId] : [],
        p_context: context,
      },
    );
    if (scoreError) {
      console.error("Recommendation scoring query failed:", scoreError);
      return failure("ranking_rpc", scoreError.code);
    }
    const parsedScores = z.array(scoreRowSchema).safeParse(rawScores);
    if (!parsedScores.success) {
      const issues = parsedScores.error.issues.map(
        (issue) => `${issue.path.map(String).join(".") || "root"}:${issue.code}`,
      );
      console.error(
        "Recommendation scoring returned an invalid shape:",
        parsedScores.error.issues,
      );
      return failure("ranking_validation", undefined, issues);
    }

    const scoreRows = parsedScores.data;
    const idsToLoad = [
      ...scoreRows.map((row) => row.listing_id),
      ...(query.surface === "listing" && query.listingId
        ? [query.listingId]
        : []),
    ];
    let rawFeatures: unknown = [];
    if (idsToLoad.length > 0) {
      const { data, error: featuresError } = await admin
        .from("listing_features")
        .select(
          "id, area, bedrooms, nightly_price_band, amenities, property_type, created_at, is_active",
        )
        .in("id", idsToLoad);
      if (featuresError) {
        console.error("Recommendation feature lookup failed:", featuresError);
        return failure("feature_lookup", featuresError.code);
      }
      rawFeatures = data;
    }
    const parsedFeatures = z.array(featuresSchema).safeParse(rawFeatures);
    if (!parsedFeatures.success) {
      console.error("Recommendation features returned an invalid shape.");
      return failure("feature_validation");
    }
    const featuresById = new Map<string, ListingFeatures>(
      parsedFeatures.data.map((feature) => [feature.id, feature]),
    );

    let publicListings: Awaited<ReturnType<typeof getPublicListingsByIds>>;
    try {
      publicListings = await getPublicListingsByIds(
        scoreRows.map((row) => row.listing_id),
      );
    } catch (error) {
      console.error("Recommended stay cards could not be loaded:", error);
      return failure("public_listing_cards");
    }
    const listingsById = new Map(
      publicListings.map((listing) => [listing.id, listing]),
    );
    const currentFeatures =
      query.surface === "listing" && query.listingId
        ? featuresById.get(query.listingId)
        : undefined;
    if (query.surface === "listing" && !currentFeatures) {
      return response(
        request,
        { error: "Stay not found." },
        404,
        anonId,
        shouldSetCookie,
      );
    }

    const candidates: RecommendationCandidate[] = scoreRows.flatMap((row) => {
      const listing = listingsById.get(row.listing_id);
      const features = featuresById.get(row.listing_id);
      if (!listing || !features || !features.is_active) return [];

      const components = scoreComponents(row);
      if (currentFeatures && !components.cold_start) {
        components.similarity = listingSimilarity(features, currentFeatures);
        components.profile_match =
          0.6 * components.similarity + 0.4 * components.profile_match;
      }

      return [
        {
          listing,
          features,
          score: calculateScore(components),
          components,
        },
      ];
    });

    const ranked = rerankRecommendations(candidates, profile, query.limit);
    let recentlyViewed: Awaited<ReturnType<typeof getPublicListingsByIds>> = [];
    if (query.surface === "home" && consentAccepted) {
      const { data: rawViewedEvents, error: viewedEventsError } = await admin
        .from("rec_events")
        .select("listing_id")
        .eq("anon_id", anonId)
        .eq("event_type", "view")
        .not("listing_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(40);
      if (viewedEventsError) {
        console.error("Recently viewed stays query failed:", viewedEventsError);
        return failure("recent_views_query", viewedEventsError.code);
      }
      const viewedRows = z
        .array(z.object({ listing_id: postgresUuidSchema.nullable() }))
        .safeParse(rawViewedEvents);
      if (!viewedRows.success) {
        console.error("Recently viewed stays returned an invalid shape.");
        return failure("recent_views_validation");
      }
      const viewedIds = [
        ...new Set(
          viewedRows.data.flatMap((row) =>
            row.listing_id ? [row.listing_id] : [],
          ),
        ),
      ].slice(0, 8);
      try {
        recentlyViewed = await getPublicListingsByIds(viewedIds);
      } catch (error) {
        console.error("Recently viewed stay cards could not be loaded:", error);
        return failure("recent_view_cards");
      }
    }

    return response(
      request,
      {
        surface: query.surface,
        cold_start: profile.meaningful_event_count < 3,
        recentlyViewed,
        recommendations: ranked.map((candidate) => ({
          ...candidate.listing,
          score: candidate.score,
          score_components: candidate.components,
        })),
      },
      200,
      anonId,
      shouldSetCookie,
    );
  } catch (error) {
    console.error("Recommendation request failed:", error);
    return failure("unexpected");
  }
}
