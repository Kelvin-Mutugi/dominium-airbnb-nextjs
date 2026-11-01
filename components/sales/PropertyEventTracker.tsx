"use client";

import { useEffect, useRef } from "react";

function hasAnalyticsConsent() {
  return document.cookie
    .split("; ")
    .some((cookie) => cookie === "dominium_cookie_consent=v1.accepted");
}

export function trackSalePropertyEvent(propertyId: string, eventType: string) {
  if (!hasAnalyticsConsent()) return;
  void fetch("/api/property-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ propertyId, eventType }),
    keepalive: true,
  }).then((response) => {
    if (!response.ok) console.warn("Sale property event was not recorded.", response.status);
  }).catch((error: unknown) => {
    console.warn("Sale property event could not be sent.", error);
  });
}

export function PropertyEventTracker({ propertyId }: { propertyId: string }) {
  const viewed = useRef(false);

  useEffect(() => {
    if (!viewed.current) {
      viewed.current = true;
      trackSalePropertyEvent(propertyId, "view");
    }

    function onClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const eventElement = event.target.closest<HTMLElement>("[data-property-event]");
      const eventType = eventElement?.dataset.propertyEvent;
      if (eventType) trackSalePropertyEvent(propertyId, eventType);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [propertyId]);

  return null;
}
