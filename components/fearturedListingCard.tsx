"use client";

import Image from "next/image";
import Link from "next/link";
import { unsplashCardImageLoader } from "./unsplash-image-loader";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";

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

  // Loading state mirrors the real card so nothing jumps when it loads.
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

  return (
    <article className="group relative w-full">
      <Link
        href={`/apartments/${listing.id}`}
        target="_blank"
        aria-label={`${listing.name}, ${listing.loc}, ${listing.price} per night`}
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
            onError={() =>
              setFailedSrcs((prev) =>
                prev.includes(currentSrc) ? prev : [...prev, currentSrc],
              )
            }
            className="listing-image object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        </div>

        {/* Content: three lines, nothing more */}
        <div className="pt-3">
          {/* Location + rating */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15px] font-semibold leading-5 text-[#1B1A2E]">
              {listing.loc}
            </h3>

            {rating && (
              <span className="flex shrink-0 items-center gap-1 text-[14px] leading-5 text-[#1B1A2E]">
                <Star size={12} fill="currentColor" aria-hidden="true" />
                {rating}
              </span>
            )}
          </div>

          {/* Listing name, quieter */}
          <p className="truncate text-[14px] leading-5 text-[#6B7280]">
            {listing.name}
          </p>

          {/* Price */}
          <p className="mt-1 text-[15px] leading-5 text-[#1B1A2E]">
            <span className="font-semibold">{listing.price}</span>
            <span className="text-[#6B7280]"> night</span>
          </p>
        </div>
      </Link>

      {/* Save button stays a sibling of the link (no button inside an <a>) */}
      {showSave && (
        <SaveListingButton
          listingId={listing.id}
          iconSize={24}
          className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] transition hover:scale-110 ${focusRing}`}
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