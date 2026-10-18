"use client";

import { useState } from "react";
import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Star,
  Users,
} from "lucide-react";
import type { Listing } from "@/types/types";
import SaveListingButton from "@/components/listings/SaveListingButton";

interface ListingCardProps {
  listing: Listing;
  soft?: boolean;
  onView?: (id: string) => void;
  comparing?: boolean;
  onToggleCompare?: (listing: Listing) => void;
}

const MAX_AMENITIES = 2;

export default function ListingCard({
  listing,
  soft = false,
  onView,
  comparing = false,
  onToggleCompare,
}: ListingCardProps) {
  const [imageIndex, setImageIndex] = useState(0);

  const images = listing.imageUrls?.length
    ? listing.imageUrls
    : listing.imageUrl
      ? [listing.imageUrl]
      : [];
  const activeImageIndex = images.length ? imageIndex % images.length : 0;
  const activeImage = images[activeImageIndex];

  const extraAmenities = Math.max(0, listing.amenities.length - MAX_AMENITIES);
  const bedLabel =
    listing.bedrooms === 0
      ? "Studio"
      : `${listing.bedrooms} ${listing.bedrooms === 1 ? "bedroom" : "bedrooms"}`;
  const guestLabel = `${listing.guests} ${listing.guests === 1 ? "guest" : "guests"}`;

  // Shared style tokens, so the soft and flat variants stay in one place.
  const radius = soft ? "rounded-[24px]" : "rounded-3xl";
  const imageRadius = soft ? "rounded-[18px]" : "rounded-2xl";
  const chip = "rounded-lg bg-ink/5 px-2.5 py-1 text-ink/70";

  const arrowBase =
    "absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink shadow-sm transition-opacity hover:bg-white hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink sm:size-9 " +
    // Always visible on touch screens, revealed on hover/focus on desktop.
    "opacity-75 lg:opacity-0 lg:group-hover:opacity-90 lg:group-focus-within:opacity-90";

  return (
    <article
      className={`group relative grid grid-cols-1 gap-4 sm:grid-cols-[260px_1fr] sm:gap-5 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr] ${
        soft
          ? "my-3 overflow-hidden bg-white p-3 sm:p-4"
          : "py-5 first:pt-0 "
      } ${soft ? radius : ""}`}
    >
      {/* Photo */}
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#eeeeee] to-[#d6d6d6] sm:aspect-auto sm:min-h-[200px] ${imageRadius}`}
      >
        {activeImage ? (
          <img
            src={activeImage}
            alt={`${listing.title}, photo ${activeImageIndex + 1} of ${images.length}`}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-ink/40">
            No photos yet
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label={`Previous photo of ${listing.title}`}
              onClick={() =>
                setImageIndex(
                  (current) => (current - 1 + images.length) % images.length
                )
              }
              className={`${arrowBase} left-2`}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Next photo of ${listing.title}`}
              onClick={() =>
                setImageIndex((current) => (current + 1) % images.length)
              }
              className={`${arrowBase} right-2`}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <span
              aria-live="polite"
              className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white"
            >
              {activeImageIndex + 1} / {images.length}
            </span>
          </>
        )}

        <SaveListingButton
          listingId={listing.id}
          iconSize={21}
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full border border-white/90 bg-black/55 text-white shadow-sm transition-opacity hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-70"
        />
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-col">
        <h3 className="text-lg font-semibold leading-snug text-ink line-clamp-2">
          {/* The title is the card's main link. Its ::after stretches over the whole card
              so the entire card is clickable, while the save, arrow and compare
              controls sit above it with z-10. */}
          <button
            type="button"
            onClick={() => onView?.(listing.id)}
            className={`text-left decoration-ink/30 underline-offset-4 after:absolute after:inset-0 group-hover:underline focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ink focus-visible:after:ring-offset-2 ${
              soft ? "after:rounded-[24px]" : "after:rounded-3xl"
            }`}
          >
            {listing.title}
          </button>
        </h3>

        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink/60">
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} aria-hidden="true" className="shrink-0" />
            {listing.location}
          </span>
          {listing.distanceLabel && (
            <span className="text-ink/45">{listing.distanceLabel}</span>
          )}
        </p>

        {/* Key facts first, amenities second */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink/80">
          <span className="inline-flex items-center gap-1.5">
            <BedDouble size={16} aria-hidden="true" className="text-ink/50" />
            {bedLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={16} aria-hidden="true" className="text-ink/50" />
            {guestLabel}
          </span>
        </div>

        {listing.amenities.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {listing.amenities.slice(0, MAX_AMENITIES).map((amenity) => (
              <span key={amenity} className={`${chip} text-[11.5px]`}>
                {amenity}
              </span>
            ))}
            {extraAmenities > 0 && (
              <span className={`${chip} text-[11.5px]`}>
                +{extraAmenities} more
              </span>
            )}
          </div>
        )}

        <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink/60 line-clamp-2">
          {listing.description}
        </p>

        {/* Footer: trust signals on the left, price on the right */}
        <div className="mt-auto flex items-end justify-between gap-4 pt-4">
          <div className="flex flex-col items-start gap-2">
            {listing.reviewCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-ink">
                <Star size={15} aria-hidden="true" className="fill-current" />
                <span className="font-semibold">
                  {listing.rating.toFixed(1)}
                </span>
                <span className="sr-only">out of 5,</span>
                <span className="text-ink/60">
                  ({listing.reviewCount}{" "}
                  {listing.reviewCount === 1 ? "review" : "reviews"})
                </span>
              </span>
            ) : (
              <span className="text-sm text-ink/60">New listing</span>
            )}

            <label className="relative z-10 inline-flex cursor-pointer items-center gap-2 text-sm text-ink/70 hover:text-ink">
              <input
                type="checkbox"
                checked={comparing}
                onChange={() => onToggleCompare?.(listing)}
                className="size-4 cursor-pointer accent-ink"
              />
              Compare
            </label>
          </div>

          <div className="text-right">
            <div className="text-xl font-semibold tracking-tight text-ink">
              KES {listing.pricePerNight.toLocaleString("en-KE")}
            </div>
            <div className="text-xs text-ink/50">per night</div>
          </div>
        </div>
      </div>
    </article>
  );
}