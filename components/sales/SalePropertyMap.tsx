"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import type { PublicSaleProperty } from "@/app/lib/sale-properties";

const KENYA_CENTER: [number, number] = [-1.2864, 36.8172];
const priceFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

type SaleMapPoint = {
  property: PublicSaleProperty;
  position: [number, number];
};

function isValidCoordinate(lat: number | null | undefined, lng: number | null | undefined) {
  return typeof lat === "number"
    && typeof lng === "number"
    && Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180;
}

function createPriceIcon(price: number | string, active: boolean) {
  const formatted = priceFormatter.format(Math.round(Number(price)));
  const background = active ? "#1B1A2E" : "#FFFFFF";
  const color = active ? "#FFFFFF" : "#1B1A2E";
  const scale = active ? 1.08 : 1;
  return L.divIcon({
    className: "dominium-sale-price-marker",
    html: `<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(${scale});white-space:nowrap;padding:7px 10px;border-radius:999px;font:600 13px/1 system-ui,sans-serif;background:${background};color:${color};box-shadow:0 2px 8px rgba(0,0,0,.24);border:1px solid rgba(0,0,0,.1);cursor:pointer;">${formatted}</span>`,
    iconSize: [140, 40],
    iconAnchor: [70, 20],
  });
}

function FitMapToProperties({ points }: { points: SaleMapPoint[] }) {
  const map = useMap();
  const pointsKey = points.map((point) => point.position.join(",")).join("|");

  useEffect(() => {
    if (!points.length) {
      map.setView(KENYA_CENTER, 6);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0].position, 13);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map((point) => point.position)), {
      padding: [48, 48],
      maxZoom: 13,
    });
  }, [map, points, pointsKey]);

  return null;
}

function KeepMapSized() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export function SalePropertyMap({
  properties,
  selectedId,
  onSelect,
}: {
  properties: PublicSaleProperty[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const points = useMemo(() => properties.flatMap((property): SaleMapPoint[] => {
    const lat = property.map_lat;
    const lng = property.map_lng;
    if (typeof lat !== "number" || typeof lng !== "number" || !isValidCoordinate(lat, lng)) return [];
    return [{
      property,
      position: [lat, lng],
    }];
  }), [properties]);
  const pointById = useMemo(
    () => new Map(points.map((point) => [point.property.id, point])),
    [points],
  );
  const selectedPoint = selectedId ? pointById.get(selectedId) ?? null : null;
  const missingLocationCount = properties.length - points.length;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={points[0]?.position ?? KENYA_CENTER}
        zoom={points.length ? 11 : 6}
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
        <FitMapToProperties points={points} />
        {points.map(({ property, position }) => (
          <Marker
            key={property.id}
            position={position}
            icon={createPriceIcon(property.asking_price, property.id === selectedId)}
            zIndexOffset={property.id === selectedId ? 1000 : 0}
            title={`${priceFormatter.format(Number(property.asking_price))} · ${property.title}`}
            eventHandlers={{
              click: () => onSelect(property.id),
              mouseover: (event) => {
                const marker = event.target as L.Marker;
                marker.setZIndexOffset(1000);
              },
              mouseout: (event) => {
                const marker = event.target as L.Marker;
                marker.setZIndexOffset(property.id === selectedId ? 1000 : 0);
              },
            }}
          />
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[calc(100%-5rem)] rounded-lg bg-white/95 px-3 py-2 text-xs leading-5 text-[#4B4A5A] shadow">
        Pins show neighborhood areas unless a listing explicitly shares its exact location.
        {missingLocationCount > 0 && ` ${missingLocationCount} ${missingLocationCount === 1 ? "property has" : "properties have"} no map location yet.`}
      </div>

      {tilesFailed && (
        <div role="status" className="absolute inset-x-3 bottom-3 z-[500] rounded-lg bg-white/95 p-3 text-sm text-[#5F5D69] shadow">
          Map tiles could not be loaded. Property results are still available in the list.
        </div>
      )}

      {selectedPoint && (
        <article
          role="region"
          aria-label="Selected property"
          className="absolute inset-x-3 bottom-3 z-[600] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 sm:right-auto sm:w-[min(22rem,calc(100%-1.5rem))]"
        >
          <div className="flex gap-3 p-3">
            {(() => {
              const cover = selectedPoint.property.sale_property_images.find((image) => image.is_cover)
                ?? selectedPoint.property.sale_property_images[0];
              return cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover.url}
                  alt={cover.alt_text || selectedPoint.property.title}
                  className="h-24 w-28 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-lg bg-[#EFEEEB] text-xs text-[#777582]">
                  No photo
                </div>
              );
            })()}
            <div className="min-w-0 flex-1 py-1">
              <p className="text-sm font-bold text-[#9C2454]">
                {priceFormatter.format(Number(selectedPoint.property.asking_price))}
              </p>
              <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-[#1B1A2E]">
                {selectedPoint.property.title}
              </h3>
              <p className="mt-1 truncate text-xs text-[#6B6A78]">
                {[selectedPoint.property.neighborhood, selectedPoint.property.town]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <Link
                href={`/for-sale/${selectedPoint.property.slug}`}
                className="mt-2 inline-flex text-xs font-semibold text-[#9C2454] underline"
              >
                View property
              </Link>
            </div>
            <button
              type="button"
              onClick={() => onSelect(null)}
              aria-label="Close selected property"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-lg text-[#4B4A5A] shadow hover:bg-[#F6EAF0]"
            >
              ×
            </button>
          </div>
        </article>
      )}

      {!points.length && (
        <div className="pointer-events-none absolute inset-x-5 bottom-16 z-[500] rounded-xl bg-white/95 p-4 text-center shadow">
          <p className="text-sm font-semibold text-[#1B1A2E]">Map locations are being added</p>
          <p className="mt-1 text-xs leading-5 text-[#6B6A78]">
            You can still browse all matching properties in the list.
          </p>
        </div>
      )}
    </div>
  );
}
