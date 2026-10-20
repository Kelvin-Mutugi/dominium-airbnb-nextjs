"use client";

import Image from "next/image";
import Link from "next/link";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { List, Map as MapIcon, X } from "lucide-react";
import SaveListingButton from "@/components/listings/SaveListingButton";
import type { Listing } from "@/types/types";

const KENYA_CENTER: [number, number] = [-0.0236, 37.9062];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E23E85]";

interface ListingMapPoint {
  listing: Listing;
  position: [number, number];
}

// ---------- helpers ----------

// Rounded to ~1 km so a guest never sees a host's exact doorstep.
function approximateCoordinate(value: number) {
  return Math.round(value * 100) / 100;
}

function getMapPoints(listings: Listing[]): ListingMapPoint[] {
  const points = listings.flatMap((listing): ListingMapPoint[] => {
    const { latitude, longitude } = listing;
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return [];
    }

    return [
      {
        listing,
        position: [
          approximateCoordinate(latitude),
          approximateCoordinate(longitude),
        ],
      },
    ];
  });

  return spreadOverlappingPoints(points);
}

// Rounding means many listings can land on the exact same spot, and their
// price pills would sit on top of each other. Fan those out in a small ring
// (a few hundred metres) so every pill can be seen and tapped.
function spreadOverlappingPoints(points: ListingMapPoint[]): ListingMapPoint[] {
  const groups = new Map<string, number[]>();
  points.forEach((point, index) => {
    const key = point.position.join(",");
    groups.set(key, [...(groups.get(key) ?? []), index]);
  });

  const result = [...points];
  groups.forEach((indexes) => {
    if (indexes.length < 2) return;
    const radius = 0.004 * (1 + Math.floor(indexes.length / 8));
    indexes.forEach((pointIndex, n) => {
      const angle = (2 * Math.PI * n) / indexes.length;
      const [lat, lng] = points[pointIndex].position;
      result[pointIndex] = {
        ...points[pointIndex],
        position: [
          lat + Math.sin(angle) * radius,
          lng + Math.cos(angle) * radius,
        ],
      };
    });
  });
  return result;
}

const priceFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function formatMoney(amount: number) {
  return priceFormatter.format(Math.round(amount));
}

// Styles are inline so the marker looks right without any global CSS.
function createPriceIcon(price: number, active: boolean) {
  const background = active ? "#1B1A2E" : "#FFFFFF";
  const color = active ? "#FFFFFF" : "#1B1A2E";
  const scale = active ? 1.08 : 1;

  return L.divIcon({
    className: "dominium-price-marker",
    html: `<span style="position:absolute;left:0;top:0;transform:translate(-50%,-50%) scale(${scale});white-space:nowrap;padding:6px 10px;border-radius:999px;font:600 13px/1 system-ui,sans-serif;background:${background};color:${color};box-shadow:0 2px 6px rgba(0,0,0,.28);border:1px solid rgba(0,0,0,.08);cursor:pointer;">${formatMoney(price)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Scrolls only the list's own scroll area (never the whole page).
function scrollCardIntoView(id: string, container: HTMLElement | null) {
  if (!container || !window.matchMedia("(min-width: 1024px)").matches) return;
  const card = document.getElementById(`stay-card-${id}`);
  if (!card) return;
  const box = container.getBoundingClientRect();
  const rect = card.getBoundingClientRect();
  if (rect.top < box.top || rect.bottom > box.bottom) {
    container.scrollTo({
      top: container.scrollTop + rect.top - box.top - 8,
      behavior: "smooth",
    });
  }
}

// Height taken up by the sticky site header and category bar, so the map can
// be sized to exactly the space left on screen.
function useStickyOffset() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const elements = [
      document.querySelector<HTMLElement>("[data-site-navbar]"),
      document.querySelector<HTMLElement>('nav[aria-label="Browse by category"]'),
    ].filter((el): el is HTMLElement => el !== null);

    const measure = () => {
      setOffset(
        Math.round(
          elements.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0),
        ),
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    elements.forEach((el) => observer.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return offset;
}

// ---------- map helpers ----------

function FitMapToListings({ points }: { points: ListingMapPoint[] }) {
  const map = useMap();
  const positionsKey = points
    .map(({ position }) => position.join(","))
    .join("|");

  useEffect(() => {
    if (!points.length) {
      map.setView(KENYA_CENTER, 6);
      return;
    }

    if (points.length === 1) {
      map.setView(points[0].position, 12);
      return;
    }

    map.fitBounds(L.latLngBounds(points.map(({ position }) => position)), {
      padding: [48, 48],
      maxZoom: 12,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, positionsKey]);

  return null;
}

// Leaflet miscalculates its size when the map is hidden and then shown
// (the mobile list/map toggle). This keeps it correct at all times.
function KeepMapSized() {
  const map = useMap();

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
}

function MapBackgroundClick({ onClick }: { onClick: () => void }) {
  useMapEvents({ click: onClick });
  return null;
}

function PanToSelected({ position }: { position: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (position) map.panTo(position, { animate: true });
  }, [map, position]);

  return null;
}

function PriceMarker({
  point,
  active,
  onSelect,
  onHover,
}: {
  point: ListingMapPoint;
  active: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const { listing, position } = point;

  const icon = useMemo(
    () => createPriceIcon(listing.pricePerNight, active),
    [listing.pricePerNight, active],
  );

  const handlers = useMemo(
    () => ({
      click: () => onSelect(listing.id),
      mouseover: () => onHover(listing.id),
      mouseout: () => onHover(null),
    }),
    [listing.id, onSelect, onHover],
  );

  return (
    <Marker
      position={position}
      icon={icon}
      zIndexOffset={active ? 1000 : 0}
      title={`${listing.title}, ${formatMoney(listing.pricePerNight)} per night`}
      eventHandlers={handlers}
    />
  );
}

// ---------- list card (same look as the home page cards) ----------

function StayCard({
  listing,
  hasMapLocation,
  selected,
  onHover,
}: {
  listing: Listing;
  hasMapLocation: boolean;
  selected: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <article
      id={`stay-card-${listing.id}`}
      className="group relative scroll-mt-2"
      onMouseEnter={() => onHover(listing.id)}
      onMouseLeave={() => onHover(null)}
    >
      <Link
        href={`/apartments/${encodeURIComponent(listing.id)}`}
        aria-label={`${listing.title}, ${listing.location}, ${formatMoney(listing.pricePerNight)} per night`}
        onFocus={() => onHover(listing.id)}
        onBlur={() => onHover(null)}
        className={`block rounded-xl text-left no-underline ${focusRing}`}
      >
        <div
          className={`relative aspect-[20/19] w-full overflow-hidden rounded-xl bg-neutral-100 transition-shadow ${
            selected ? "ring-2 ring-[#1B1A2E] ring-offset-2" : ""
          }`}
        >
          {listing.imageUrl ? (
            <Image
              src={listing.imageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 100vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <span className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
              No photo available
            </span>
          )}
        </div>

        <div className="pt-3">
          <h3 className="truncate text-[15px] font-semibold leading-5 text-[#1B1A2E]">
            {listing.location}
          </h3>
          <p className="truncate text-[14px] leading-5 text-[#6B7280]">
            {listing.title}
          </p>
          <p className="mt-1 text-[15px] leading-5 text-[#1B1A2E]">
            <span className="font-semibold">
              {formatMoney(listing.pricePerNight)}
            </span>
            <span className="text-[#6B7280]"> night</span>
          </p>
          {!hasMapLocation && (
            <p className="mt-1 text-xs text-neutral-500">
              Not shown on the map
            </p>
          )}
        </div>
      </Link>

      {/* Sibling of the link, never nested inside it */}
      <SaveListingButton
        listingId={listing.id}
        iconSize={24}
        className={`absolute right-3 top-3 z-10 flex size-8 items-center justify-center text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] transition hover:scale-110 disabled:opacity-70 ${focusRing}`}
      />
    </article>
  );
}

// ---------- main component ----------

export default function ListingResultsMap({
  listings,
}: {
  listings: Listing[];
}) {
  const points = useMemo(() => getMapPoints(listings), [listings]);
  const pointById = useMemo(
    () => new Map(points.map((point) => [point.listing.id, point])),
    [points],
  );

  const [tilesFailed, setTilesFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // On phones only one of the two is shown at a time. On large screens both are.
  const [mobileView, setMobileView] = useState<"list" | "map">("map");
  const stickyOffset = useStickyOffset();
  const listScrollRef = useRef<HTMLDivElement>(null);
  const listSectionRef = useRef<HTMLElement>(null);
  const mapSectionRef = useRef<HTMLElement>(null);

  const missingLocationCount = listings.length - points.length;
  const selectedPoint = selectedId ? pointById.get(selectedId) ?? null : null;

  // Drop the selection if its listing disappears (e.g. filters changed).
  useEffect(() => {
    if (selectedId && !pointById.has(selectedId)) setSelectedId(null);
  }, [selectedId, pointById]);

  // Escape closes the card on the map.
  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;

    const target =
      mobileView === "map" ? mapSectionRef.current : listSectionRef.current;
    const frame = window.requestAnimationFrame(() => {
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [mobileView]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    scrollCardIntoView(id, listScrollRef.current);
    // If part of the map is off screen, nudge the page just enough that the
    // whole map, and the card on it, is visible.
    mapSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  };

  return (
    <div
      className="relative"
      style={
        {
          "--sticky-top": `${stickyOffset + 16}px`,
          // Never taller than the space left on screen, and never huge.
          "--map-h": `min(calc(100dvh - ${stickyOffset + 32}px), 720px)`,
        } as CSSProperties
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* ---------- List ---------- */}
        <section
          ref={listSectionRef}
          aria-label="Stays"
          style={{ scrollMarginTop: "var(--sticky-top)" }}
          className={`min-w-0 ${mobileView === "map" ? "hidden lg:block" : ""}`}
        >
          <p className="mb-4 text-sm text-neutral-600">
            {listings.length} {listings.length === 1 ? "stay" : "stays"}
            {missingLocationCount > 0 &&
              ` · ${missingLocationCount} not shown on the map`}
          </p>

          {listings.length === 0 ? (
            <p className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
              No stays match right now. Try changing your filters.
            </p>
          ) : (
            <div
              ref={listScrollRef}
              className="grid grid-cols-1 gap-x-4 gap-y-8 pb-24 sm:grid-cols-2 sm:gap-x-6 lg:max-h-[calc(var(--map-h)-2rem)] lg:overflow-y-auto lg:pb-4 lg:pr-2"
            >
              {listings.map((listing) => (
                <StayCard
                  key={listing.id}
                  listing={listing}
                  hasMapLocation={pointById.has(listing.id)}
                  selected={selectedId === listing.id}
                  onHover={setHoveredId}
                />
              ))}
            </div>
          )}
        </section>

        {/* ---------- Map ---------- */}
        <section
          ref={mapSectionRef}
          aria-label="Map of available stays"
          style={{ scrollMarginTop: "var(--sticky-top)" }}
          className={`relative isolate h-[var(--map-h)] min-h-[360px] overflow-hidden rounded-xl border border-neutral-200 bg-[#e8edf0] lg:sticky lg:top-[var(--sticky-top)] ${
            mobileView === "list" ? "hidden lg:block" : ""
          }`}
        >
          <MapContainer
            center={points[0]?.position ?? KENYA_CENTER}
            zoom={points.length ? 8 : 6}
            scrollWheelZoom
            zoomControl={false}
            className="h-full w-full"
            style={{ backgroundColor: "#e8edf0" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              eventHandlers={{
                tileerror: () => setTilesFailed(true),
                load: () => setTilesFailed(false),
              }}
            />
            <ZoomControl position="topright" />
            <KeepMapSized />
            <FitMapToListings points={points} />
            <MapBackgroundClick onClick={() => setSelectedId(null)} />
            <PanToSelected position={selectedPoint?.position ?? null} />

            {points.map((point) => (
              <PriceMarker
                key={point.listing.id}
                point={point}
                active={
                  point.listing.id === selectedId ||
                  point.listing.id === hoveredId
                }
                onSelect={handleSelect}
                onHover={setHoveredId}
              />
            ))}
          </MapContainer>

          {/* Selected stay: a small card on the map, like Airbnb */}
          {selectedPoint && (
            <div
              role="region"
              aria-label="Selected stay"
              className="absolute inset-x-3 bottom-3 z-[1000] sm:right-auto sm:w-[22rem]"
            >
              <div className="relative flex gap-3 rounded-2xl bg-white p-2.5 shadow-lg ring-1 ring-black/5">
                <Link
                  href={`/apartments/${encodeURIComponent(selectedPoint.listing.id)}`}
                  aria-label={`View ${selectedPoint.listing.title}`}
                  className={`relative size-28 shrink-0 overflow-hidden rounded-xl bg-neutral-100 ${focusRing}`}
                >
                  {selectedPoint.listing.imageUrl ? (
                    <Image
                      src={selectedPoint.listing.imageUrl}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
                      No photo available
                    </span>
                  )}
                </Link>

                <SaveListingButton
                  listingId={selectedPoint.listing.id}
                  iconSize={20}
                  className={`absolute left-[5.75rem] top-3.5 z-10 flex size-7 items-center justify-center text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] disabled:opacity-70 ${focusRing}`}
                />

                <div className="min-w-0 flex-1 py-1 pr-7">
                  <Link
                    href={`/apartments/${encodeURIComponent(selectedPoint.listing.id)}`}
                    className={`block truncate text-[15px] font-semibold text-[#1B1A2E] hover:underline ${focusRing}`}
                  >
                    {selectedPoint.listing.location}
                  </Link>
                  <p className="line-clamp-2 text-[14px] leading-5 text-[#6B7280]">
                    {selectedPoint.listing.title}
                  </p>
                  <p className="mt-1.5 text-[15px] text-[#1B1A2E]">
                    <span className="font-semibold">
                      {formatMoney(selectedPoint.listing.pricePerNight)}
                    </span>
                    <span className="text-[#6B7280]"> night</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close"
                  className={`absolute right-2 top-2 flex size-7 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 ${focusRing}`}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {points.length === 0 && (
            <p className="absolute left-3 top-3 z-[1000] max-w-[calc(100%-4rem)] rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 text-sm text-neutral-700 shadow-sm">
              Map locations aren&apos;t available for these stays yet.
            </p>
          )}
          {tilesFailed && (
            <p
              role="status"
              className={`absolute left-3 z-[1000] max-w-[calc(100%-1.5rem)] rounded-lg border border-amber-200 bg-white/95 px-3 py-2 text-xs text-amber-900 shadow-sm ${
                selectedPoint ? "top-3" : "bottom-3"
              }`}
            >
              Map tiles couldn&apos;t load. Check your connection and try again.
            </p>
          )}
        </section>
      </div>

      {/* Phone-only switch between the list and the map */}
      <button
        type="button"
        onClick={() => setMobileView((v) => (v === "list" ? "map" : "list"))}
        aria-label={mobileView === "list" ? "Show map" : "Show listings"}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-1/2 z-[1100] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#1B1A2E] px-5 py-3 text-sm font-semibold text-white shadow-lg lg:hidden ${
          selectedPoint && mobileView === "map" ? "hidden" : ""
        } ${focusRing}`}
      >
        {mobileView === "list" ? (
          <>
            Map <MapIcon size={16} aria-hidden="true" />
          </>
        ) : (
          <>
            List <List size={16} aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  );
}