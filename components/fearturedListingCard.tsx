"use client";

import Image from "next/image";
import Link from "next/link";
import { unsplashCardImageLoader } from "./unsplash-image-loader";
import { useEffect, useState } from "react";
import { BedDouble, Star, Users } from "lucide-react";

import { supabase } from "@/app/lib/supabase/client";
import SaveListingButton from "@/components/listings/SaveListingButton";
import { LISTINGS, type Listing } from "./homeData";

interface FeaturedListingCardProps {
  item?: Listing;
  id?: string;
  loading?: boolean;
  /** Shows the persisted save control. */
  showSave?: boolean;
}

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E23E85]";

// The card fills whatever width its parent gives it (grid column or carousel
// wrapper). Keep this `sizes` value in sync with the grid in
// FeaturedListingCardGridPreview below, or with your own layout.
const CARD_IMAGE_SIZES =
  "(min-width: 1440px) 20vw, (min-width: 1200px) 25vw, (min-width: 950px) 33vw, (min-width: 550px) 50vw, 100vw";

export default function FeaturedListingCard({
  item,
  id,
  loading = false,
  showSave = false,
}: FeaturedListingCardProps) {
  const [dbListing, setDbListing] = useState<Listing | null>(null);
  // Track which image URLs failed, so one bad photo doesn't replace the whole gallery
  const [failedSrcs, setFailedSrcs] = useState<string[]>([]);

  const listing = item ?? dbListing;

  useEffect(() => {
    if (item || !id || !supabase) return;

    const dbClient = supabase;
    let ignore = false;

    async function loadListing() {
      const { data, error } = await dbClient
        .from("listings")
        .select(`
          id,
          title,
          county,
          town,
          price_per_night,
          max_guests,
          bedrooms,
          bathrooms,
          amenities,
          listing_images ( url, sort_order )
        `)
        .order("sort_order", {
          foreignTable: "listing_images",
          ascending: true,
        })
        .eq("id", id)
        .maybeSingle();

      if (ignore) return;

      if (error) {
        console.error("Failed to load featured listing:", error);
        return;
      }

      if (!data) {
        setDbListing(null);
        return;
      }

      const gallery = Array.isArray(data.listing_images)
        ? data.listing_images
            .map((imageRow: { url?: string | null }) => imageRow?.url)
            .filter((url): url is string => Boolean(url))
        : [];

      const price = Number(data.price_per_night ?? 0);

      const formattedPrice = new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0,
      }).format(price);

      const normalized: Listing = {
        id: String(data.id),
        name: data.title ?? "Untitled listing",
        loc:
          [data.town, data.county].filter(Boolean).join(", ") ||
          "Location unavailable",
        price: formattedPrice || "Price on request",
        detail: "",
        img: gallery[0] ?? "/placeholder.svg",
        gallery,
        description: "",
        maxGuests:
          typeof data.max_guests === "number" ? data.max_guests : 0,
        checkInTime: "2:00 PM",
        checkOutTime: "11:00 AM",
        minNights: 1,
        pricePerNight: price,
        serviceFeePercent: 0.1,
        features: [],
        host: "Host",
        rating: undefined,
        reviewCount: undefined,
        verified: false,
        rareFind: false,
        guests:
          typeof data.max_guests === "number"
            ? data.max_guests
            : undefined,
        beds:
          typeof data.bedrooms === "number"
            ? data.bedrooms
            : undefined,
        baths:
          typeof data.bathrooms === "number"
            ? data.bathrooms
            : undefined,
        amenities: Array.isArray(data.amenities)
          ? data.amenities
              .filter(
                (amenity): amenity is string => typeof amenity === "string",
              )
              .map((amenity) => amenity.trim())
              .filter(Boolean)
          : [],
      };

      setDbListing(normalized);
    }

    void loadListing();

    return () => {
      ignore = true;
    };
  }, [id, item]);

  // Loading state: mirrors the real card (square image + text lines)
  // so nothing jumps when the listing loads.
  if (loading) {
    return (
      <div className="w-full" aria-hidden="true">
        <div className="shimmer aspect-square w-full rounded-xl" />

        <div className="space-y-2 pt-3">
          <div className="shimmer h-3 w-1/2 rounded" />
          <div className="shimmer h-4 w-3/4 rounded" />
          <div className="shimmer h-3 w-2/5 rounded" />
          <div className="shimmer h-4 w-1/3 rounded" />
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const galleryImages =
    listing.gallery && listing.gallery.length > 0
      ? listing.gallery
      : [listing.img || "/placeholder.svg"];

  const currentSrc = galleryImages[0] ?? "/placeholder.svg";
  const activeImage = failedSrcs.includes(currentSrc)
    ? "/placeholder.svg"
    : currentSrc;

  const rating =
    typeof listing.rating === "number" ? listing.rating.toFixed(1) : null;

  const hasBeds = typeof listing.beds === "number";
  const bedsLabel =
    listing.beds === 0
      ? "Studio"
      : `${listing.beds} bed${listing.beds === 1 ? "" : "s"}`;

  const hasGuests = typeof listing.guests === "number" && listing.guests > 0;
  const guestsLabel = `${listing.guests} guest${listing.guests === 1 ? "" : "s"}`;

  return (
    <article className="relative w-full">
      <Link
        href={`/apartments/${listing.id}`}
        target="_blank"
        aria-label={`${listing.name}, ${listing.loc}, ${listing.price} per night`}
        className={`block rounded-xl text-left no-underline active:transform-none active:transition-none [-webkit-tap-highlight-color:transparent] ${focusRing}`}
      >
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xl">
          <Image
            src={activeImage}
            alt={listing.name}
            loader={activeImage.includes("images.unsplash.com") ? unsplashCardImageLoader : undefined}
            fill
            sizes={CARD_IMAGE_SIZES}
            quality={85}
            unoptimized={activeImage.includes("placehold.co") || activeImage === "/placeholder.svg"}
            onError={() =>
              setFailedSrcs((prev) =>
                prev.includes(currentSrc) ? prev : [...prev, currentSrc],
              )
            }
            className="listing-image object-cover"
          />

          {/* Subtle bottom gradient (pointer-events-none so hover still reaches the photo) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/25 to-transparent" />

          {/* Verified badge */}
          {/* {listing.verified && (
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-[#1B1A2E] shadow-sm">
              <BadgeCheck size={13} className="text-[#E23E85]" aria-hidden="true" />
              Verified
            </span>
          )} */}
        </div>

        {/* Content */}
        <div className="pt-3">
          {/* Location + Rating */}
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-[12px] text-[#36454F]/90 lg:text-[13px]">
              {listing.loc}
            </p>

            {rating && (
              <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-[#1B1A2E] lg:text-[13px]">
                <Star
                  size={12}
                  fill="currentColor"
                  className="text-[#F7B500]"
                  aria-hidden="true"
                />
                {rating}
                {typeof listing.reviewCount === "number" &&
                  listing.reviewCount > 0 && (
                    <span className="font-normal text-[#36454F]/55">
                      ({listing.reviewCount})
                    </span>
                  )}
              </span>
            )}
          </div>

          {/* Name */}
          <h3 className="mt-1 truncate text-[15px] font-medium leading-5 text-[#1B1A2E]">
            {listing.name}
          </h3>

          {/* Beds + guests */}
          {(hasBeds || hasGuests) && (
            <p className="mt-1 flex items-center gap-3 text-[12px] text-[#36454F]/90 lg:text-[13px]">
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

          {/* Price */}
          <p className="mt-1.5 text-[14px] font-semibold text-[#1B1A2E]">
            {listing.price}
            <span className="ml-1 font-normal text-[#36454F]/55">/ night</span>
          </p>

          {/* Description */}
          {listing.description ? (
            <p className="mt-1 line-clamp-2 w-full text-[12px] leading-4 text-[#36454F]/90">
              {listing.description}
            </p>
          ) : null}
        </div>
      </Link>

      {/* Save button: a sibling of the link, so we don't nest a button inside an <a> */}
      {showSave && (
        <SaveListingButton
          listingId={listing.id}
          iconSize={15}
          className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#1B1A2E] shadow-sm backdrop-blur-sm transition hover:bg-white ${focusRing}`}
        />
      )}
    </article>
  );
}

export function FeaturedListingCardGridPreview() {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 min-[550px]:grid-cols-2 min-[950px]:grid-cols-3 min-[1200px]:grid-cols-4 min-[1440px]:grid-cols-5 sm:gap-x-6">
      {LISTINGS.map((listing) => (
        <FeaturedListingCard key={listing.id} item={listing} />
      ))}
    </div>
  );
}