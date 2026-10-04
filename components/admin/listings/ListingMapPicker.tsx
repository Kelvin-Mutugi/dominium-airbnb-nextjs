"use client";

import L from "leaflet";
import { useMemo, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const KENYA_CENTER: [number, number] = [-0.0236, 37.9062];
const PIN_ICON = L.divIcon({
  className: "listing-map-pin",
  html: '<span style="display:block;width:20px;height:20px;border:3px solid #fff;border-radius:50% 50% 50% 0;background:#e23e85;box-shadow:0 2px 8px #17202a88;transform:rotate(-45deg)"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

function PinEvents({ onSelect }: { onSelect: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export function ListingMapPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
}) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const hasPin = Number.isFinite(latitude) && Number.isFinite(longitude);
  const center = useMemo<[number, number]>(
    () => hasPin ? [latitude as number, longitude as number] : KENYA_CENTER,
    [hasPin, latitude, longitude],
  );

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-[#e8edf0]">
      <MapContainer
        center={center}
        zoom={hasPin ? 15 : 6}
        scrollWheelZoom
        className="h-[340px] w-full bg-[#e8edf0]"
        style={{ backgroundColor: "#e8edf0" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: () => setTilesFailed(true), load: () => setTilesFailed(false) }}
        />
        <PinEvents onSelect={onChange} />
        {hasPin && (
          <>
            <Marker
              position={[latitude as number, longitude as number]}
              icon={PIN_ICON}
              draggable
              eventHandlers={{
                dragend(event) {
                  const point = event.target.getLatLng();
                  onChange(point.lat, point.lng);
                },
              }}
            />
            <Circle
              center={[latitude as number, longitude as number]}
              radius={25}
              pathOptions={{ color: "#e23e85", fillColor: "#e23e85", fillOpacity: 0.08, weight: 1 }}
            />
          </>
        )}
      </MapContainer>
      {tilesFailed && (
        <p role="status" className="absolute bottom-3 left-3 z-[1000] max-w-[min(24rem,calc(100%-1.5rem))] rounded-lg border border-amber-200 bg-white/95 px-3 py-2 text-xs text-amber-900 shadow-sm">
          Map tiles could not load. The location pin can still be set by clicking the map after reconnecting.
        </p>
      )}
    </div>
  );
}