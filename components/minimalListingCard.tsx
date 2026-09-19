"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";
import { Heart, Star, ShieldCheck, Gem } from "lucide-react";
import { supabase } from "@/app/lib/supabase/client";
import type { Amenity, Listing } from "./homeData";

// ---------- helpers ----------

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeAmenities(value: unknown): Amenity[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatRating(rating?: number) {
  if (typeof rating !== "number" || Number.isNaN(rating)) return null;
  return rating.toFixed(1).replace(/\.0$/, "");
}

// Only trust image hosts we explicitly recognize. Next/Image's optimizer
// fetches remote URLs *server-side* — if a bad actor ever got a row into
// `listing_images.url` (compromised host account, bad data import, etc.)
// an unchecked URL becomes an SSRF vector against your own server. This
// allowlist is defense-in-depth on top of `next.config.js` remotePatterns.
const SUPABASE_STORAGE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const TRUSTED_IMAGE_HOSTS = new Set(
  [SUPABASE_STORAGE_HOST, "images.unsplash.com", "placehold.co"].filter(
    Boolean,
  ) as string[],
);

function trustedImageUrl(url: string | undefined | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (!TRUSTED_IMAGE_HOSTS.has(parsed.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

interface ListingCardProps {
  item?: Listing;
  id?: string;
  loading?: boolean;
}

export default function MinimalListingCard({
  item,
  id,
  loading = false,
}: ListingCardProps) {
  const router = useRouter();
  const [dbListing, setDbListing] = useState<Listing | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const listing = item ?? dbListing;

  useEffect(() => {
    if (item || !id) return;
    if (!supabase) return;

    // Reject anything that isn't a well-formed UUID before it ever reaches
    // a query — cheap guard against malformed/garbage route params.
    if (!UUID_RE.test(id)) {
      return;
    }

    const dbClient = supabase;
    let ignore = false;

    async function loadListing() {
      const { data, error } = await dbClient
        .from("listings")
        .select(
          `
            id,
            title,
            description,
            county,
            town,
            address,
            price_per_night,
            max_guests,
            bedrooms,
            bathrooms,
            amenities,
            average_rating,
            review_count,
            is_rare_find,
            status,
            listing_images ( url, sort_order ),
            host:profiles!listings_host_id_fkey ( full_name, host_verified_at )
          `,
        )
        .order("sort_order", { foreignTable: "listing_images", ascending: true })
        .eq("id", id)
        // Defense-in-depth: even if RLS is ever misconfigured, never let a
        // guessed/leaked UUID surface a draft, suspended, or archived
        // listing on a public page.
        .eq("status", "active")
        .maybeSingle();

      if (ignore) return;

      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load listing from Supabase:", error);
        }
        return;
      }

      if (!data) {
        setDbListing(null);
        return;
      }

      const gallery = Array.isArray(data.listing_images)
        ? data.listing_images
            .map((row: { url?: string | null }) => row?.url)
            .filter((url): url is string => Boolean(url))
        : [];

      const amenities = normalizeAmenities(data.amenities);
      const price = Number(data.price_per_night ?? 0);
      const formattedPrice = new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0,
      }).format(price);

      const host = Array.isArray(data.host) ? data.host[0] : data.host;

      const normalized: Listing = {
        id: String(data.id),
        name: data.title ?? "Untitled listing",
        loc:
          [data.town, data.county].filter(Boolean).join(", ") ||
          "Location unavailable",
        price: formattedPrice || "Price on request",
        detail: `Max guests: ${data.max_guests ?? 0}${
          amenities.length ? ` · ${amenities.slice(0, 2).join(" · ")}` : ""
        }`,
        img: gallery[0] ?? "/placeholder.svg",
        gallery,
        description: data.description ?? "",
        maxGuests: typeof data.max_guests === "number" ? data.max_guests : 0,
        checkInTime: "2:00 PM",
        checkOutTime: "11:00 AM",
        minNights: 1,
        pricePerNight: price,
        serviceFeePercent: 0.1,
        features: [
          ...(data.bedrooms
            ? [`${data.bedrooms} bedroom${data.bedrooms > 1 ? "s" : ""}`]
            : []),
          ...(data.bathrooms
            ? [`${data.bathrooms} bathroom${data.bathrooms > 1 ? "s" : ""}`]
            : []),
          ...amenities,
        ],
        host: host?.full_name ?? "Host",
        rating: typeof data.average_rating === "number" ? data.average_rating : undefined,
        reviewCount: typeof data.review_count === "number" ? data.review_count : undefined,
        verified: Boolean(host?.host_verified_at),
        rareFind: Boolean(data.is_rare_find),
        guests: typeof data.max_guests === "number" ? data.max_guests : undefined,
        beds: typeof data.bedrooms === "number" ? data.bedrooms : undefined,
        baths: typeof data.bathrooms === "number" ? data.bathrooms : undefined,
        amenities,
      };

      setDbListing(normalized);
    }

    void loadListing();
    return () => {
      ignore = true;
    };
  }, [id, item]);

  useEffect(() => {
    if (!isHovered || !listing || (listing.gallery?.length ?? 0) <= 1) return;
    const interval = setInterval(() => {
      setImageIndex((current) => (current + 1) % listing.gallery.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isHovered, listing]);

  const handleSaveClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!supabase || !listing) return;

    // Never let an unauthenticated visitor's click imply a persisted,
    // user-scoped action. Confirm a real session before flipping state.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push(`/login?redirect=/apartments/${listing.id}`);
      return;
    }

    setIsSaved((current) => !current);
    // TODO: once a `favorites (user_id, listing_id)` table with RLS
    // ("owner can insert/select/delete own rows only") exists, persist
    // here scoped to `session.user.id` instead of local component state.
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[320px] overflow-hidden rounded-[24px] border border-[#E9E6DD] bg-white shadow-sm">
        <div aria-hidden="true">
          <div className="shimmer h-[220px] w-full" />
          <div className="space-y-3 p-4">
            <div className="shimmer h-4 w-24 rounded" />
            <div className="shimmer h-5 w-3/4 rounded" />
            <div className="shimmer h-4 w-1/2 rounded" />
            <div className="shimmer h-10 w-full rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const rawGallery = (
    listing.gallery && listing.gallery.length > 0
      ? listing.gallery
      : [listing.img || "/placeholder.svg"]
  ).filter(Boolean);

  const galleryImages = rawGallery.map(
    (url) => trustedImageUrl(url) ?? "/placeholder.svg",
  );

  const activeImage = imageError
    ? "/placeholder.svg"
    : galleryImages[imageIndex] ?? "/placeholder.svg";

  const ratingValue = formatRating(listing.rating);

  return (
    <Link
      href={`/apartments/${listing.id}`}
      onKeyDown={handleKeyDown}
      aria-label={`View details for ${listing.name}`}
      className="group block w-full max-w-[240px] overflow-hidden rounded-2xl bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#E89A1C]"
    >
      <article>
        <div className="relative h-[160px] w-full overflow-hidden rounded-2xl">
          <Image
            src={activeImage}
            alt={listing.name}
            fill
            sizes="240px"
            unoptimized={activeImage === "/placeholder.svg" ? false : true}
            onError={() => setImageError(true)}
            className={`object-cover transition-transform duration-500 ${
              isHovered ? "scale-105" : "scale-100"
            }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          />

          {listing.verified && (
            <span className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full bg-white/85 px-2 py-1 text-[10px] font-medium text-[#1B1A2E] backdrop-blur-sm">
              <ShieldCheck size={12} className="text-[#2E7D32]" />
              Verified host
            </span>
          )}

          {listing.rareFind && (
            <span className="absolute left-2.5 bottom-2.5 z-10 flex items-center gap-1 rounded-full bg-[#1B1A2E]/85 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
              <Gem size={12} />
              Rare find
            </span>
          )}

          {/* <button
            type="button"
            aria-label={isSaved ? "Remove from saved listings" : "Save listing"}
            onClick={handleSaveClick}
            className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-[#1B1A2E] shadow-sm backdrop-blur-sm"
          >
            <Heart
              size={15}
              className={isSaved ? "fill-[#E23E85] text-[#E23E85]" : "text-[#1B1A2E]"}
            />
          </button> */}
        </div>

        <div className="px-1.5 pt-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] text-[#36454F]/65">{listing.loc}</p>
            {ratingValue && (
              <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium">
                <Star size={11} fill="currentColor" className="text-[#F7B500]" />
                {ratingValue}
                {typeof listing.reviewCount === "number" && (
                  <span className="text-[#36454F]/50">({listing.reviewCount})</span>
                )}
              </span>
            )}
          </div>

          <h3 className="mt-1 truncate text-[14px] font-semibold text-[#1B1A2E]">
            {listing.name}
          </h3>

          <p className="mt-1 text-[12px] font-semibold text-[#1B1A2E]">{listing.price}</p>
        </div>
      </article>
    </Link>
  );
}