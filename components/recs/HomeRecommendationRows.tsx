"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import RecommendationRow from "@/components/recs/RecommendationRow";
import {
  recommendationsResponseSchema,
  type RecommendationsResponse,
} from "@/app/lib/recs/ui-schema";

const recommendationErrorSchema = z.object({
  diagnostic: z
    .object({
      stage: z.string(),
      code: z.string().optional(),
      issues: z.array(z.string()).optional(),
    })
    .optional(),
});

export default function HomeRecommendationRows() {
  const [result, setResult] = useState<RecommendationsResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecommendations() {
      try {
        const response = await fetch("/api/recs?surface=home&limit=8", {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (!response.ok) {
          const errorPayload: unknown = await response.json().catch(() => null);
          const parsedError =
            recommendationErrorSchema.safeParse(errorPayload);
          const diagnostic = parsedError.success
            ? parsedError.data.diagnostic
            : undefined;
          const diagnosticLabel = diagnostic
            ? ` at ${diagnostic.stage}${
                diagnostic.code ? ` (${diagnostic.code})` : ""
              }${
                diagnostic.issues?.length
                  ? ` [${diagnostic.issues.join(", ")}]`
                  : ""
              }`
            : "";
          throw new Error(
            `Recommendations returned ${response.status}${diagnosticLabel}.`,
          );
        }
        const payload: unknown = await response.json();
        const parsed = recommendationsResponseSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error("Recommendations returned an invalid response.");
        }
        setResult(parsed.data);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          console.error("Failed to load homepage recommendations:", loadError);
          setError(true);
        }
      }
    }

    void loadRecommendations();
    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <p role="alert" className="px-[6%] py-4 text-sm text-[#6B7280]">
        Stays you may like are temporarily unavailable.
      </p>
    );
  }

  if (!result) {
    return (
      <RecommendationRow
        title="Stays you may like"
        listings={[]}
        isLoading
        surface="home"
      />
    );
  }

  return (
    <>
      {result.recentlyViewed.length > 0 && (
        <RecommendationRow
          title="Continue where you left off"
          listings={result.recentlyViewed}
          surface="home"
        />
      )}
      <RecommendationRow
        title={
          result.cold_start ? "Popular right now" : "Picked for you"
        }
        listings={result.recommendations}
        surface="home"
      />
    </>
  );
}
