import type { Listing } from "@/types/types";
import type {
  ListingFeatures,
  SessionPreferenceProfile,
} from "@/app/lib/recs/types";
import { recConfig } from "../../../lib/recs/config.ts";

export interface RecommendationScoreComponents {
  profile_match: number;
  popularity: number;
  freshness: number;
  availability_fit: number;
  meaningful_event_count: number;
  cold_start: boolean;
  featured_rank: number | null;
  similarity?: number;
}

export interface RecommendationCandidate {
  listing: Listing;
  features: ListingFeatures;
  score: number;
  components: RecommendationScoreComponents;
}

function jaccardSimilarity(first: string[], second: string[]) {
  const firstSet = new Set(first);
  const secondSet = new Set(second);
  const union = new Set([...firstSet, ...secondSet]);
  if (union.size === 0) return 1;
  let intersectionSize = 0;
  for (const value of firstSet) {
    if (secondSet.has(value)) intersectionSize += 1;
  }
  return intersectionSize / union.size;
}

export function listingSimilarity(
  first: ListingFeatures,
  second: ListingFeatures,
) {
  let totalWeight = 0;
  let similarity = 0;
  const addMatch = (weight: number, matches: boolean) => {
    totalWeight += weight;
    if (matches) similarity += weight;
  };
  const addScore = (weight: number, score: number) => {
    totalWeight += weight;
    similarity += weight * score;
  };

  if (first.area && second.area) {
    addMatch(0.35, first.area.toLocaleLowerCase() === second.area.toLocaleLowerCase());
  }
  if (first.nightly_price_band && second.nightly_price_band) {
    addMatch(0.25, first.nightly_price_band === second.nightly_price_band);
  }
  if (first.bedrooms !== null && second.bedrooms !== null) {
    addMatch(0.25, first.bedrooms === second.bedrooms);
  }
  addScore(0.15, jaccardSimilarity(first.amenities, second.amenities));

  return totalWeight === 0 ? 0 : similarity / totalWeight;
}

function topPreferenceKey(preferences: Record<string, number>) {
  let bestKey: string | null = null;
  let bestWeight = Number.NEGATIVE_INFINITY;
  for (const [key, weight] of Object.entries(preferences)) {
    if (weight > bestWeight) {
      bestKey = key;
      bestWeight = weight;
    }
  }
  return bestKey;
}

function isExplorationCandidate(
  candidate: RecommendationCandidate,
  topArea: string | null,
  topPriceBand: string | null,
) {
  if (!topArea && !topPriceBand) return true;
  const outsideTopArea =
    topArea !== null &&
    candidate.features.area?.toLocaleLowerCase() !== topArea.toLocaleLowerCase();
  const outsideTopPrice =
    topPriceBand !== null &&
    candidate.features.nightly_price_band !== topPriceBand;
  return outsideTopArea || outsideTopPrice;
}

function mmrValue(
  candidate: RecommendationCandidate,
  selected: RecommendationCandidate[],
) {
  const relevance = Math.max(0, Math.min(1, candidate.score));
  const redundancy =
    selected.length === 0
      ? 0
      : Math.max(
          ...selected.map((item) =>
            listingSimilarity(candidate.features, item.features),
          ),
        );
  return (
    recConfig.mmrLambda * relevance -
    (1 - recConfig.mmrLambda) * redundancy
  );
}

export function rerankRecommendations(
  candidates: RecommendationCandidate[],
  profile: SessionPreferenceProfile,
  limit: number,
) {
  const remaining = [...candidates];
  const selected: RecommendationCandidate[] = [];
  const topArea = topPreferenceKey(profile.areas);
  const topPriceBand = topPreferenceKey(profile.price_bands);
  const targetCount = Math.max(0, Math.min(limit, candidates.length));

  while (selected.length < targetCount && remaining.length > 0) {
    const pinned = remaining
      .filter((item) => item.components.featured_rank !== null)
      .sort(
        (first, second) =>
          (first.components.featured_rank ?? 0) -
          (second.components.featured_rank ?? 0),
      );
    if (pinned.length > 0) {
      const next = pinned[0];
      selected.push(next);
      remaining.splice(remaining.indexOf(next), 1);
      continue;
    }

    const slot = selected.length + 1;
    const shouldExplore =
      slot % recConfig.explorationInterval === 0 && remaining.some((item) =>
        isExplorationCandidate(item, topArea, topPriceBand),
      );
    const pool = shouldExplore
      ? remaining.filter((item) =>
          isExplorationCandidate(item, topArea, topPriceBand),
        )
      : remaining;

    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < pool.length; index += 1) {
      const score = mmrValue(pool[index], selected);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    const next = pool[bestIndex];
    selected.push(next);
    remaining.splice(remaining.indexOf(next), 1);
  }

  return selected;
}
