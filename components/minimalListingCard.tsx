"use client";

import Image from "next/image";
import Link from "next/link";
import { unsplashCardImageLoader } from "./unsplash-image-loader";
import { useEffect, useState } from "react";
import { BedDouble, Star, Gem, Users } from "lucide-react";
import { supabase } from "@/app/lib/supabase/client";
import SaveListingButton from "@/components/listings/SaveListingButton";
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
  const [dbListing, setDbListing] = useState<Listing | null>(null);
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

  if (loading) {
    return (
      <div className="w-full max-w-[180px] overflow-hidden rounded-[24px] border border-[#E9E6DD] bg-white shadow-sm">
        <div aria-hidden="true">
          <div className="shimmer size-[180px] rounded-2xl" />
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
    : galleryImages[0] ?? "/placeholder.svg";

  const ratingValue = formatRating(listing.rating);
  const hasBeds = typeof listing.beds === "number";
  const bedsLabel =
    listing.beds === 0
      ? "Studio"
      : `${listing.beds} bed${listing.beds === 1 ? "" : "s"}`;
  const hasGuests = typeof listing.guests === "number" && listing.guests > 0;
  const guestsLabel = `${listing.guests} guest${listing.guests === 1 ? "" : "s"}`;
  const pricePerNight = /\/\s*night\s*$/i.test(listing.price)
    ? listing.price.replace(/\s*\/\s*night\s*$/i, "")
    : listing.price;

  return (
    <Link
      href={`/apartments/${listing.id}`}
      target="_blank"
      aria-label={`View details for ${listing.name}`}
      className="block w-full max-w-[180px] overflow-hidden rounded-2xl bg-white text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E89A1C] active:transform-none active:transition-none [-webkit-tap-highlight-color:transparent]"
    >
      <article>
        <div className="relative size-[180px] overflow-hidden rounded-2xl">
          <Image
            src={activeImage}
            alt={listing.name}
            loader={activeImage.includes("images.unsplash.com") ? unsplashCardImageLoader : undefined}
            fill
            sizes="180px"
            quality={85}
            unoptimized={activeImage.includes("placehold.co") || activeImage === "/placeholder.svg"}
            onError={() => setImageError(true)}
            className="listing-image object-cover"
          />

          <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-[#040720]/75 px-2 py-1 text-[10px] font-semibold text-[#FFFFFF] shadow-sm backdrop-blur-sm">
            {pricePerNight}
            {/* <span className="ml-0.5 font-normal text-[#FFFFFF]/80">/ night</span> */}
          </span>

          {listing.rareFind && (
            <span className="absolute left-2.5 bottom-2.5 z-10 flex items-center gap-1 rounded-full bg-[#1B1A2E]/85 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
              <Gem size={12} />
              Rare find
            </span>
          )}

          <SaveListingButton
            listingId={listing.id}
            iconSize={15}
            className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#1B1A2E] shadow-sm backdrop-blur-sm transition hover:bg-white disabled:opacity-70"
          />
        </div>

        <div className="px-1.5 pt-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] text-[#36454F]/90">{listing.loc}</p>
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

          <h3 className="mt-1 truncate text-[15px] font-medium text-[#1B1A2E]">
            {listing.name}
          </h3>

          {(hasBeds || hasGuests) && (
            <p className="mt-1 flex items-center gap-3 text-[11px] text-[#36454F]/90">
              {hasBeds && (
                <span className="inline-flex items-center gap-1">
                  <BedDouble size={12} aria-hidden="true" />
                  {bedsLabel}
                </span>
              )}
              {hasGuests && (
                <span className="inline-flex items-center gap-1">
                  <Users size={12} aria-hidden="true" />
                  {guestsLabel}
                </span>
              )}
            </p>
          )}

          {/* <p className="mt-1 text-[12px] font-semibold text-[#1B1A2E]">
            {pricePerNight}
            <span className="ml-0.5 font-normal text-[#36454F]/55">/ night</span>
          </p> */}
        </div>
      </article>
    </Link>
  );
}