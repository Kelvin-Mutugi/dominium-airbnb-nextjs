"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { Heart, Star } from "lucide-react";

import { supabase } from "@/app/lib/supabase/client";
import { LISTINGS, type Listing } from "./homeData";

interface FeaturedListingCardProps {
  item?: Listing;
  id?: string;
  loading?: boolean;
}

export default function FeaturedListingCard({
  item,
  id,
  loading = false,
}: FeaturedListingCardProps) {
  const [dbListing, setDbListing] = useState<Listing | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

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
              .filter((item): item is string => typeof item === "string")
              .map((item) => item.trim())
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
  useEffect(() => {
    if (
      !isHovered ||
      !listing ||
      (listing.gallery?.length ?? 0) <= 1
    ) {
      return;
    }

    const interval = setInterval(() => {
      setImageIndex(
        (current) => (current + 1) % listing.gallery.length
      );
    }, 1800);

    return () => clearInterval(interval);
  }, [isHovered, listing]);

  const handleSaveClick = (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setIsSaved((current) => !current);
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLAnchorElement>
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full max-w-[280px] overflow-hidden rounded-2xl">
        <div className="animate-pulse">
          <div className="h-[190px] w-full rounded-2xl bg-[#E9E5DD]" />

          <div className="space-y-2 pt-3">
            <div className="h-3 w-24 rounded bg-[#EEEAE2]" />
            <div className="h-4 w-40 rounded bg-[#EEEAE2]" />
            <div className="h-4 w-28 rounded bg-[#EEEAE2]" />
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

  const activeImage = imageError
    ? "/placeholder.svg"
    : galleryImages[imageIndex] ?? "/placeholder.svg";

  const rating =
    typeof listing.rating === "number"
      ? listing.rating.toFixed(1)
      : null;

  return (
    <Link
      href={`/apartments/${listing.id}`}
      onKeyDown={handleKeyDown}
      aria-label={`View details for ${listing.name}`}
      className="
        group block w-full max-w-[280px]
        overflow-hidden rounded-l
        text-left
        focus:outline-none
        focus:ring-2
        focus:ring-[#E89A1C]
        focus:ring-offset-2
      "
    >
      <article>
        {/* Image */}
        <div className="relative h-[190px] w-full overflow-hidden rounded-2xl">
          <Image
            src={activeImage}
            alt={listing.name}
            fill
            sizes="280px"
            unoptimized={
              activeImage.includes("placehold.co") ||
              activeImage.includes("images.unsplash.com")
            }
            onError={() => setImageError(true)}
            className={`
              object-cover
              transition-transform duration-700
              ${isHovered ? "scale-105" : "scale-100"}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          />

          {/* Subtle bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/25 to-transparent" />

          {/* Save button */}
          <button
            type="button"
            aria-label={
              isSaved
                ? "Remove from saved listings"
                : "Save listing"
            }
            onClick={handleSaveClick}
            className="
              absolute right-3 top-3 z-10
              flex h-8 w-8 items-center justify-center
              rounded-full
              bg-white/90
              text-[#1B1A2E]
              shadow-sm
              backdrop-blur-sm
              transition
              hover:bg-white
            "
          >
            <Heart
              size={15}
              className={
                isSaved
                  ? "fill-[#E23E85] text-[#E23E85]"
                  : "text-[#1B1A2E]"
              }
            />
          </button>
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
                />
                {rating}
              </span>
            )}
          </div>

          {/* Name */}
          <h3 className="mt-1 truncate text-[15px] font-semibold leading-5 text-[#1B1A2E]">
            {listing.name}
          </h3>

          {/* Price */}
          <p className="mt-1.5 text-[13px] font-semibold text-[#1B1A2E]">
            {listing.price}
            <span className="ml-1 font-normal text-[#36454F]/55">
              / night
            </span>
          </p>
        </div>
      </article>
    </Link>
  );
}

export function FeaturedListingCardGridPreview() {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {LISTINGS.map((listing) => (
        <FeaturedListingCard
          key={listing.id}
          item={listing}
        />
      ))}
    </div>
  );
}
