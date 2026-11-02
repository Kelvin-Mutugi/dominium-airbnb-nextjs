"use client";

import { useEffect, useState } from "react";
import RecommendationRow from "@/components/recs/RecommendationRow";
import {
  recommendationsResponseSchema,
  type RecommendationCard,
} from "@/app/lib/recs/ui-schema";

export default function RecommendationShelf({
  listingId,
  checkIn,
  checkOut,
}: {
  listingId: string;
  checkIn?: string;
  checkOut?: string;
}) {
  const [listings, setListings] = useState<RecommendationCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      surface: "listing",
      listingId,
      limit: "6",
    });
    if (checkIn && checkOut) {
      params.set("checkIn", checkIn);
      params.set("checkOut", checkOut);
    }

    async function loadRecommendations() {
      setIsLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/recs?${params.toString()}`, {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (!response.ok) {
          throw new Error(`Recommendations returned ${response.status}.`);
        }
        const payload: unknown = await response.json();
        const parsed = recommendationsResponseSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error("Recommendations returned an invalid response.");
        }
        setListings(parsed.data.recommendations);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          console.error("Failed to load related stay recommendations:", loadError);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadRecommendations();
    return () => controller.abort();
  }, [checkIn, checkOut, listingId]);

  if (error) {
    return (
      <p role="alert" className="px-[6%] py-4 text-sm text-[#6B7280]">
        Similar stays are temporarily unavailable.
      </p>
    );
  }

  return (
    <RecommendationRow
      title="You might also like"
      listings={listings}
      isLoading={isLoading}
      surface="listing"
    />
  );
}
