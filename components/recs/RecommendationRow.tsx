"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Listing as HomeListing } from "@/components/homeData";
import MinimalListingCard from "@/components/minimalListingCard";
import HorizontalListingCarousel, {
  type HorizontalListingCarouselHandle,
} from "@/components/listings/HorizontalListingCarousel";
import type { RecommendationCard } from "@/app/lib/recs/ui-schema";
import { useRecommendationImpressions } from "@/app/lib/recs/useRecommendationImpressions";

function toHomeListing(listing: RecommendationCard): HomeListing {
  const imageUrls =
    listing.imageUrls?.length
      ? listing.imageUrls
      : listing.imageUrl
        ? [listing.imageUrl]
        : [];
  return {
    id: listing.id,
    name: listing.title,
    loc: listing.location,
    price: `KES ${listing.pricePerNight.toLocaleString("en-KE")}`,
    detail: `${listing.bedrooms} bedrooms · ${listing.guests} guests`,
    img: imageUrls[0] ?? "/placeholder.svg",
    gallery: imageUrls,
    description: listing.description,
    features: listing.amenities,
    host: "Host",
    maxGuests: listing.guests,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    minNights: 1,
    pricePerNight: listing.pricePerNight,
    serviceFeePercent: 0,
    rating: listing.rating,
    reviewCount: listing.reviewCount,
    verified: listing.verified,
    guests: listing.guests,
    bedrooms: listing.bedrooms,
    beds: listing.bedrooms,
    amenities: listing.amenities,
  };
}

export default function RecommendationRow({
  title,
  listings,
  isLoading = false,
  surface,
}: {
  title: string;
  listings: RecommendationCard[];
  isLoading?: boolean;
  surface: "home" | "listing" | "search";
}) {
  const carouselRef = useRef<HorizontalListingCarouselHandle>(null);
  const rowRef = useRef<HTMLElement>(null);
  const trackClick = useRecommendationImpressions(
    rowRef,
    surface,
    !isLoading && listings.length > 0,
    listings.map((listing) => listing.id).join(","),
  );

  if (!isLoading && listings.length === 0) return null;

  return (
    <section
      ref={rowRef}
      aria-busy={isLoading}
      className="px-[6%] pb-[20px] pt-[10px]"
    >
      <div className="mb-[18px] flex items-center justify-between gap-4">
        {isLoading ? (
          <div className="shimmer h-6 w-44 rounded" aria-hidden="true" />
        ) : (
          <h2 className="text-[20px] font-semibold text-[#36454F]">{title}</h2>
        )}
        {!isLoading && (
          <div className="hidden gap-2 lg:flex">
            <button
              type="button"
              aria-label={`Scroll ${title} left`}
              onClick={() => carouselRef.current?.scroll("left")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] hover:border-[#E23E85] hover:text-[#E23E85]"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              aria-label={`Scroll ${title} right`}
              onClick={() => carouselRef.current?.scroll("right")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] hover:border-[#E23E85] hover:text-[#E23E85]"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <HorizontalListingCarousel
        ref={carouselRef}
        label={`${title} listings`}
      >
        {isLoading
          ? Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="w-[180px] shrink-0 snap-start"
              >
                <MinimalListingCard loading />
              </div>
            ))
          : listings.map((listing, index) => (
              <div
                key={listing.id}
                data-rec-card
                data-listing-id={listing.id}
                data-position={index + 1}
                className="w-[180px] shrink-0 snap-start"
              >
                <MinimalListingCard
                  item={toHomeListing(listing)}
                  onClick={() => trackClick(listing.id, index + 1)}
                />
              </div>
            ))}
      </HorizontalListingCarousel>
    </section>
  );
}
