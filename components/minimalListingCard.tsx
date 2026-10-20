"use client";

import Image from "next/image";
import Link from "next/link";
import { unsplashCardImageLoader } from "./unsplash-image-loader";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/app/lib/supabase/client";
import SaveListingButton from "@/components/listings/SaveListingButton";
import type { Amenity, Listing } from "./homeData";

// ---------- helpers ----------

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E23E85]";

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

// The card fills whatever width its parent gives it. Size it in the
// carousel/grid wrapper, e.g. `w-[44%] shrink-0 snap-start sm:w-[200px] lg:w-[225px]`.
// Keep the `sizes` value below in sync with those widths.
const CARD_IMAGE_SIZES = "(min-width: 1024px) 225px, (min-width: 640px) 200px, 44vw";

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

  // Skeleton mirrors the real card (image + three text lines)
  // so nothing jumps when the listing loads.
  if (loading) {
    return (
      <div className="w-full" aria-hidden="true">
        <div className="shimmer aspect-[20/19] w-full rounded-xl" />
        <div className="space-y-2 pt-3">
          <div className="shimmer h-4 w-2/3 rounded" />
          <div className="shimmer h-3.5 w-1/2 rounded" />
          <div className="shimmer h-4 w-1/3 rounded" />
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

  // Some listings store the price as "Ksh 5,000 / night"; strip the suffix
  // so we can render our own quieter "night" label.
  const pricePerNight = /\/\s*night\s*$/i.test(listing.price)
    ? listing.price.replace(/\s*\/\s*night\s*$/i, "")
    : listing.price;

  return (
    <article className="group relative w-full">
      <Link
        href={`/apartments/${listing.id}`}
        target="_blank"
        aria-label={`${listing.name}, ${listing.loc}, ${pricePerNight} per night`}
        className={`block rounded-xl text-left no-underline active:transform-none active:transition-none [-webkit-tap-highlight-color:transparent] ${focusRing}`}
      >
        {/* Image */}
        <div className="relative aspect-[20/19] w-full overflow-hidden rounded-xl bg-neutral-100">
          <Image
            src={activeImage}
            alt={listing.name}
            loader={
              activeImage.includes("images.unsplash.com")
                ? unsplashCardImageLoader
                : undefined
            }
            fill
            sizes={CARD_IMAGE_SIZES}
            quality={85}
            unoptimized={
              activeImage.includes("placehold.co") ||
              activeImage === "/placeholder.svg"
            }
            onError={() => setImageError(true)}
            className="listing-image object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        </div>

        {/* Content: three lines, nothing more */}
        <div className="pt-3">
          {/* Location + rating */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[14px] font-semibold leading-5 text-[#1B1A2E] lg:text-[15px]">
              {listing.loc}
            </h3>

            {ratingValue && (
              <span className="flex shrink-0 items-center gap-1 text-[13px] leading-5 text-[#1B1A2E] lg:text-[14px]">
                <Star size={12} fill="currentColor" aria-hidden="true" />
                {ratingValue}
              </span>
            )}
          </div>

          {/* Listing name, quieter */}
          <p className="truncate text-[13px] leading-5 text-[#6B7280] lg:text-[14px]">
            {listing.name}
          </p>

          {/* Price */}
          <p className="mt-1 text-[14px] leading-5 text-[#1B1A2E] lg:text-[15px]">
            <span className="font-semibold">{pricePerNight}</span>
            <span className="text-[#6B7280]"> night</span>
          </p>
        </div>
      </Link>

      {/* Save button is a sibling of the link, so we never nest a button inside an <a> */}
      <SaveListingButton
        listingId={listing.id}
        iconSize={24}
        className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] transition hover:scale-110 disabled:opacity-70 ${focusRing}`}
      />
    </article>
  );
}