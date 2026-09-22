"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { BadgeCheck, BedDouble, Heart, Star, Users } from "lucide-react";

import { supabase } from "@/app/lib/supabase/client";
import { LISTINGS, type Listing } from "./homeData";

interface FeaturedListingCardProps {
  item?: Listing;
  id?: string;
  loading?: boolean;
  /**
   * Shows the heart button. It only toggles local state for now, so leave this
   * off until saved listings are stored somewhere (e.g. a saved_listings table).
   */
  showSave?: boolean;
}

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E23E85]";

export default function FeaturedListingCard({
  item,
  id,
  loading = false,
  showSave = false,
}: FeaturedListingCardProps) {
  const [dbListing, setDbListing] = useState<Listing | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
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

  // Cycle through listing images while hovering
  const galleryLength = listing?.gallery?.length ?? 0;

  useEffect(() => {
    if (!isHovered || galleryLength <= 1) return;

    const interval = setInterval(() => {
      setImageIndex((current) => (current + 1) % galleryLength);
    }, 1800);

    return () => clearInterval(interval);
  }, [isHovered, galleryLength]);

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setImageIndex(0); // go back to the cover photo
  };

  const handleSaveClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsSaved((current) => !current);
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full max-w-[240px] overflow-hidden rounded-2xl">
        <div>
          <div className="shimmer aspect-square w-full rounded-2xl" />

          <div className="space-y-2 pt-3">
            <div className="shimmer h-3 w-24 rounded" />
            <div className="shimmer h-4 w-40 rounded" />
            <div className="shimmer h-4 w-28 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const galleryImages =
    listing.gallery && listing.gallery.length > 0
      ? listing.gallery
      : [listing.img || "/placeholder.svg"];

  const currentSrc = galleryImages[imageIndex] ?? "/placeholder.svg";
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
    <article
      className="group relative w-full max-w-[200px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={`/apartments/${listing.id}`}
        aria-label={`${listing.name}, ${listing.loc}, ${listing.price} per night`}
        className={`block rounded-2xl text-left no-underline ${focusRing}`}
      >
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
          <Image
            src={activeImage}
            alt={listing.name}
            fill
            sizes="200px"
            unoptimized={
              activeImage.includes("placehold.co") ||
              activeImage.includes("images.unsplash.com")
            }
            onError={() =>
              setFailedSrcs((prev) =>
                prev.includes(currentSrc) ? prev : [...prev, currentSrc],
              )
            }
            className="listing-image object-cover transition-transform duration-700 group-hover:scale-105"
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
            <p className="truncate text-[11px] text-[#36454F]/65">
              {listing.loc}
            </p>

            {rating && (
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#1B1A2E]">
                <Star
                  size={11}
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
          <h3 className="mt-1 truncate text-[15px] font-semibold leading-5 text-[#1B1A2E]">
            {listing.name}
          </h3>

          {/* Beds + guests */}
          {(hasBeds || hasGuests) && (
            <p className="mt-1 flex items-center gap-3 text-[11px] text-[#36454F]/70">
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
          <p className="mt-1.5 text-[13px] font-semibold text-[#1B1A2E]">
            {listing.price}
            <span className="ml-1 font-normal text-[#36454F]/55">/ night</span>
          </p>

          {/* Description: w-full (was w-64, wider than the 240px card, which clipped the text) */}
          {listing.description ? (
            <p className="mt-1 line-clamp-2 w-full text-[11px] leading-4 text-[#36454F]/65">
              {listing.description}
            </p>
          ) : null}
        </div>
      </Link>

      {/* Save button: a sibling of the link, so we don't nest a button inside an <a> */}
      {showSave && (
        <button
          type="button"
          aria-label={
            isSaved ? "Remove from saved listings" : "Save listing"
          }
          aria-pressed={isSaved}
          onClick={handleSaveClick}
          className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#1B1A2E] shadow-sm backdrop-blur-sm transition hover:bg-white ${focusRing}`}
        >
          <Heart
            size={15}
            className={
              isSaved ? "fill-[#E23E85] text-[#E23E85]" : "text-[#1B1A2E]"
            }
          />
        </button>
      )}
    </article>
  );
}

export function FeaturedListingCardGridPreview() {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {LISTINGS.map((listing) => (
        <FeaturedListingCard key={listing.id} item={listing} />
      ))}
    </div>
  );
}