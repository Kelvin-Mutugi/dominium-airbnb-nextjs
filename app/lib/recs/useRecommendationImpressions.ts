"use client";

import { useEffect, useRef, type RefObject } from "react";
import { z } from "zod";
import type { RecImpressionRecord } from "./impression-schema";

type RecommendationSurface = "home" | "listing" | "search";

const impressionErrorSchema = z.object({
  diagnostic: z
    .object({
      stage: z.string(),
      code: z.string().optional(),
    })
    .optional(),
});

function sendImpressions(records: RecImpressionRecord[]) {
  if (records.length === 0) return;
  void fetch("/api/recs/impressions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify(records),
  }).then((response) => {
    if (!response.ok) {
      return response.json().catch(() => null).then((payload: unknown) => {
        const parsed = impressionErrorSchema.safeParse(payload);
        const diagnostic = parsed.success
          ? parsed.data.diagnostic
          : undefined;
        const diagnosticLabel = diagnostic
          ? `stage=${diagnostic.stage}${
              diagnostic.code ? ` code=${diagnostic.code}` : ""
            }`
          : "diagnostic unavailable";
        console.error(
          "Recommendation impressions were rejected.",
          response.status,
          diagnosticLabel,
        );
      });
    }
  }).catch((error: unknown) => {
    console.error("Recommendation impressions could not be sent:", error);
  });
}

export function useRecommendationImpressions<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  surface: RecommendationSurface,
  active: boolean,
  trackingKey: string,
) {
  const reportedImpressions = useRef(new Set<string>());
  const impressionIds = useRef(new Map<string, string>());

  useEffect(() => {
    if (!active) return;

    const pending: RecImpressionRecord[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = undefined;
      const batch = pending.splice(0, 20);
      sendImpressions(batch);
    };
    const observeCard = (card: HTMLElement) => {
      const listingId = card.dataset.listingId;
      const position = Number(card.dataset.position);
      if (!listingId || !Number.isInteger(position) || position < 1) return;

      const key = `${surface}:${listingId}:${position}`;
      if (reportedImpressions.current.has(key)) return;
      reportedImpressions.current.add(key);
      const id = crypto.randomUUID();
      impressionIds.current.set(key, id);
      pending.push({
        id,
        action: "impression",
        surface,
        listingId,
        position,
      });
      if (pending.length >= 20) flush();
      else if (!flushTimer) flushTimer = setTimeout(flush, 100);
    };

    const cards =
      containerRef.current?.querySelectorAll<HTMLElement>("[data-rec-card]") ?? [];
    if (typeof IntersectionObserver === "undefined") {
      cards.forEach(observeCard);
      return flush;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (
            entry.isIntersecting &&
            entry.intersectionRatio >= 0.5 &&
            entry.target instanceof HTMLElement
          ) {
            observeCard(entry.target);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.5 },
    );
    cards.forEach((card) => observer.observe(card));

    return () => {
      observer.disconnect();
      flush();
    };
  }, [active, containerRef, surface, trackingKey]);

  return (listingId: string, position: number) => {
    const key = `${surface}:${listingId}:${position}`;
    const id = impressionIds.current.get(key) ?? crypto.randomUUID();
    impressionIds.current.set(key, id);
    sendImpressions([
      {
        id,
        action: "click",
        surface,
        listingId,
        position,
      },
    ]);
  };
}
