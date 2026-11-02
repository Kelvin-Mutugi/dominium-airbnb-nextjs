import assert from "node:assert/strict";
import test from "node:test";
import {
  rerankRecommendations,
  type RecommendationCandidate,
} from "../app/lib/recs/rerank.ts";
import type {
  ListingFeatures,
  SessionPreferenceProfile,
} from "../app/lib/recs/types.ts";

const profile: SessionPreferenceProfile = {
  areas: { Nairobi: 1 },
  bedrooms: { "2": 1 },
  price_bands: { mid: 1 },
  amenities: {},
  property_types: {},
  meaningful_event_count: 5,
};

function candidate(
  id: string,
  area: string,
  score: number,
  featuredRank: number | null = null,
): RecommendationCandidate {
  const features: ListingFeatures = {
    id,
    area,
    bedrooms: 2,
    nightly_price_band: "mid",
    amenities: ["WiFi"],
    property_type: "Apartment",
    created_at: "2026-11-01T00:00:00.000Z",
    is_active: true,
  };
  return {
    listing: {
      id,
      title: id,
      location: area,
      pricePerNight: 5000,
      bedrooms: 2,
      guests: 2,
      amenities: ["WiFi"],
      description: "",
      rating: 0,
      reviewCount: 0,
      verified: true,
    },
    features,
    score,
    components: {
      profile_match: score,
      popularity: score,
      freshness: 0,
      availability_fit: 1,
      meaningful_event_count: 5,
      cold_start: false,
      featured_rank: featuredRank,
    },
  };
}

test("reserves the fifth result for an item outside the top profile area", () => {
  const candidates = [
    candidate("nairobi-1", "Nairobi", 1),
    candidate("nairobi-2", "Nairobi", 0.99),
    candidate("nairobi-3", "Nairobi", 0.98),
    candidate("nairobi-4", "Nairobi", 0.97),
    candidate("nairobi-5", "Nairobi", 0.96),
    candidate("mombasa", "Mombasa", 0.2),
  ];

  const ranked = rerankRecommendations(candidates, profile, 6);

  assert.equal(ranked[4]?.listing.id, "mombasa");
});

test("does not return more results than requested", () => {
  const ranked = rerankRecommendations(
    [candidate("one", "Nairobi", 0.8), candidate("two", "Mombasa", 0.7)],
    profile,
    1,
  );

  assert.equal(ranked.length, 1);
});

test("keeps manually featured stays ahead of algorithmic candidates", () => {
  const ranked = rerankRecommendations(
    [
      candidate("high-score", "Nairobi", 1),
      candidate("featured-later", "Nairobi", 0.1, 2),
      candidate("featured-first", "Mombasa", 0.1, 1),
    ],
    profile,
    3,
  );

  assert.deepEqual(
    ranked.slice(0, 2).map((item) => item.listing.id),
    ["featured-first", "featured-later"],
  );
});
