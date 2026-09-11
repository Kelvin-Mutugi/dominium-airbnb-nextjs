// appartmentDetails/LocationMap.tsx
import { MapPin } from "lucide-react";

interface LocationMapProps {
  latitude?: number;
  longitude?: number;
  loc: string;
}

export function LocationMap({ latitude, longitude, loc }: LocationMapProps) {
  if (!latitude || !longitude) return null;

  const delta = 0.01; // rough radius so exact pin isn't pinpointed
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join(",");

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${latitude},${longitude}`;

  return (
    <div className="mt-8">
      <h3 className="mb-4 flex items-center gap-2 text-[18px] font-semibold text-[#1B1A2E]">
        <MapPin size={18} />
        Where you'll be
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