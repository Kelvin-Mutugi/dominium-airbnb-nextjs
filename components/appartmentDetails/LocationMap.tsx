// appartmentDetails/LocationMap.tsx
import { MapPin } from "lucide-react";

interface LocationMapProps {
  latitude?: number;
  longitude?: number;
  loc: string;
}

export function LocationMap({ latitude, longitude, loc }: LocationMapProps) {
  if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const approximateLatitude = Math.round(latitude * 100) / 100;
  const approximateLongitude = Math.round(longitude * 100) / 100;
  const delta = 0.02;
  const bbox = [
    approximateLongitude - delta,
    approximateLatitude - delta,
    approximateLongitude + delta,
    approximateLatitude + delta,
  ].join(",");

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;

  return (
    <div className="mt-8">
      <h3 className="mb-4 flex items-center gap-2 text-[18px] font-semibold text-[#1B1A2E]">
        <MapPin size={18} />
        Where you&apos;ll be
      </h3>
      <div className="overflow-hidden rounded-2xl border border-[#EDEBE4]">
        <iframe
          title="Listing location"
          src={src}
          className="h-[320px] w-full"
          loading="lazy"
        />
      </div>
      <p className="mt-2 text-[13px] text-[#3A3856]/70">{loc}</p>
    </div>
  );
}