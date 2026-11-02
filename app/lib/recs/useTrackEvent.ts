"use client";

import { useCallback } from "react";
import type { FilterState } from "@/types/types";
import type { TrackEventInput } from "@/app/lib/recs/types";

const CONSENT_COOKIE = "dominium_cookie_consent=v1.accepted";
const EVENTS_ENDPOINT = "/api/recs/events";

function hasAnalyticsConsent() {
  return document.cookie.split("; ").includes(CONSENT_COOKIE);
}

export function getActiveFilterCount(filters: FilterState) {
  return (
    Number(filters.minPrice > 0 || filters.maxPrice < 50000) +
    Number(Boolean(filters.propertyType)) +
    Number(Boolean(filters.bedrooms)) +
    filters.amenities.length +
    Number(filters.petFriendly) +
    Number(filters.groupStayOnly) +
    Number(filters.instantBooking) +
    Number(filters.minRating !== null)
  );
}

export function useTrackEvent() {
  return useCallback(
    (event: TrackEventInput, options: { unload?: boolean } = {}) => {
      if (typeof window === "undefined" || !hasAnalyticsConsent()) return;

      const body = JSON.stringify([event]);
      if (options.unload && typeof navigator.sendBeacon === "function") {
        const queued = navigator.sendBeacon(
          EVENTS_ENDPOINT,
          new Blob([body], { type: "application/json" }),
        );
        if (queued) return;
      }

      void fetch(EVENTS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        credentials: "same-origin",
        keepalive: options.unload === true,
      }).then((response) => {
        if (!response.ok) {
          console.warn(
            "Recommendation event tracking request failed:",
            response.status,
          );
        }
      }).catch((error: unknown) => {
        console.warn("Recommendation event tracking request failed:", error);
      });
    },
    [],
  );
}
