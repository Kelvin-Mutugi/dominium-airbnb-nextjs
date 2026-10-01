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

  const renderItems = (compact: boolean) =>
    items.map(({ key, icon: Icon, label }) => (
      <div
        key={key}
        className={
          compact
            ? "flex min-w-0 items-center gap-2 rounded-xl p-2 transition-colors"
            : "flex items-center gap-3 rounded-xl p-3 transition-colors"
        }
      >
        <span
          className={`flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${compact ? "h-8 w-8" : "h-9 w-9"}`}
        >
          <Icon size={compact ? 16 : 18} className="text-[#1B1A2E]" />
        </span>
        <span
          className={
            compact
              ? "min-w-0 text-[13px] leading-5 text-[#1B1A2E]"
              : "text-[15px] text-[#1B1A2E]"
          }
        >
          {label}
        </span>
      </div>
    ));

  return (
    <>
      <div className="mt-4 mb-2 grid grid-cols-2 gap-x-1 gap-y-1 sm:hidden">
        {renderItems(true)}
      </div>
      <div className="hidden mt-6 mb-3 gap-2 sm:grid sm:grid-cols-4">
        {renderItems(false)}
      </div>
    </>
  );
}