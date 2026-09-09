import {
  BedDouble,
  Bath,
  Wifi,
  ShieldCheck,
  Tv,
  Wind,
  Car,
  UtensilsCrossed,
  WashingMachine,
  Snowflake,
  Waves,
  Flame,
  Dog,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// Maps amenity keys (as stored in Supabase) to icon + display label
const AMENITY_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  bedrooms: { icon: BedDouble, label: "bedrooms" }, // special-cased below (needs count)
  bathrooms: { icon: Bath, label: "bathrooms" },    // special-cased below (needs count)
  wifi: { icon: Wifi, label: "Fast Wi‑Fi" },
  secure: { icon: ShieldCheck, label: "Secure stay" },
  tv: { icon: Tv, label: "Smart TV" },
  ac: { icon: Wind, label: "Air conditioning" },
  parking: { icon: Car, label: "Free parking" },
  kitchen: { icon: UtensilsCrossed, label: "Fully equipped kitchen" },
  laundry: { icon: WashingMachine, label: "Washing machine" },
  fridge: { icon: Snowflake, label: "Fridge" },
  pool: { icon: Waves, label: "Swimming pool" },
  heating: { icon: Flame, label: "Hot water / heating" },
  pets: { icon: Dog, label: "Pet friendly" },
};

const FALLBACK_ICON = Sparkles;

interface AmenitiesGridProps {
  listing: {
    bedrooms?: number;
    bathrooms?: number;
    amenities?: string[]; // e.g. ["wifi", "secure", "parking"]
  };
}

export default function AmenitiesGrid({ listing }: AmenitiesGridProps) {
  const items: { key: string; icon: LucideIcon; label: string }[] = [];

  if (listing.bedrooms) {
    items.push({
      key: "bedrooms",
      icon: BedDouble,
      label: `${listing.bedrooms} bedroom${listing.bedrooms > 1 ? "s" : ""}`,
    });
  }

  if (listing.bathrooms) {
    items.push({
      key: "bathrooms",
      icon: Bath,
      label: `${listing.bathrooms} bathroom${listing.bathrooms > 1 ? "s" : ""}`,
    });
  }

  (listing.amenities ?? []).forEach((key) => {
    const config = AMENITY_CONFIG[key];
    if (config && key !== "bedrooms" && key !== "bathrooms") {
      items.push({ key, icon: config.icon, label: config.label });
    } else if (!config) {
      // Unknown amenity string — show it as-is rather than dropping it silently
      items.push({ key, icon: FALLBACK_ICON, label: key });
    }
  });

  if (items.length === 0) return null;

  return (
    <div className="mt-6 mb-3 grid gap-3 sm:grid-cols-4">
      {items.map(({ key, icon: Icon, label }) => (
        <div
          key={key}
          className="flex items-center gap-3 rounded-xl bg-[#FAF9F6] p-3 transition-colors"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
            <Icon size={18} className="text-[#1B1A2E]" />
          </span>
          <span className="text-[15px] text-[#1B1A2E]">{label}</span>
        </div>
      ))}
    </div>
  );
}