import { Listing } from "@/types/types";

interface ListingCardProps {
  listing: Listing;
  onView?: (id: string) => void;
  onToggleSave?: (id: string) => void;
  saved?: boolean;
}

export default function ListingCard({
  listing,
  onView,
  onToggleSave,
  saved = false,
}: ListingCardProps) {
  return (
    <div className="grid grid-cols-1 gap-5 border-b border-ink/10 py-5 first:pt-0 sm:grid-cols-[260px_1fr]">
      {/* Thumbnail — swap the gradient div for a real <Image> from Supabase Storage */}
      <div
        className="relative h-45 sm:h-[180px] w-full bg-cover bg-center"
        style={{
          backgroundImage: listing.imageUrl
            ? `url(${listing.imageUrl})`
            : "linear-gradient(150deg,#7f9c93,#42615a)",
        }}
      >
        {listing.verified && (
          <span className="absolute left-2.5 top-2.5 bg-black/35 px-2 py-1 text-[10.5px] text-white">
            ✓ Verified
          </span>
        )}
        <button
          onClick={() => onToggleSave?.(listing.id)}
          className="absolute right-2.5 top-2.5 text-white"
          aria-label={saved ? "Remove from saved" : "Save listing"}
        >
          {saved ? "♥" : "♡"}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold text-lg text-ink">{listing.title}</div>
            <div className="mb-2.5 text-sm text-ink/60">
              {listing.location}
              {listing.distanceLabel ? ` · ${listing.distanceLabel}` : ""}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-lg font-semibold text-ink">
              KES {listing.pricePerNight.toLocaleString()}
            </div>
            <div className="text-xs text-ink/40">per night</div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <span className="bg-ink/5 px-2.5 py-1 text-[11.5px] text-ink/70">
            {listing.bedrooms} bed
          </span>
          <span className="bg-ink/5 px-2.5 py-1 text-[11.5px] text-ink/70">
            Guests {listing.guests}
          </span>
          {listing.amenities.slice(0, 2).map((a) => (
            <span key={a} className="bg-ink/5 px-2.5 py-1 text-[11.5px] text-ink/70">
              {a}
            </span>
          ))}
        </div>

        <p className="mb-3.5 max-w-lg text-sm text-ink/60">{listing.description}</p>

        <div className="mt-auto flex items-center justify-between">
          <div className="text-sm text-ink/80">
            <span className="font-semibold">{listing.rating.toFixed(1)}</span>{" "}
            · {listing.reviewCount} reviews
          </div>
          <button
            onClick={() => onView?.(listing.id)}
            className="border-b border-ink text-sm font-semibold text-ink"
          >
            View listing →
          </button>
        </div>
      </div>
    </div>
  );
}