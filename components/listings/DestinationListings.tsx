"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Listing } from "../homeData";
import MinimalListingCard from "../minimalListingCard";
import HorizontalListingCarousel, {
  type HorizontalListingCarouselHandle,
} from "./HorizontalListingCarousel";

interface DestinationListingsProps {
  label: string;
  slug: string;
  listings: Listing[];
  isLoading?: boolean;
}

export default function DestinationListings({
  label,
  slug,
  listings,
  isLoading = false,
}: DestinationListingsProps) {
  const carouselRef = useRef<HorizontalListingCarouselHandle>(null);
  const carouselLabel = `${label} listings`;

  return (
    <section className="px-[6%] pb-[20px] pt-[10px]">
      <div className="mb-[26px] flex items-center justify-between">
        <div className="flex items-center">
          <h2 className="text-[20px] font-semibold text-[#36454F]">{label}</h2>
          <Link
            href={`/listings/${encodeURIComponent(slug)}`}
            aria-label={`View all ${label}`}
            className="ml-[15px] flex h-7 w-7 items-center justify-center rounded-full border border-[#E9E6DD] bg-[#F7F7F7] font-bold text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
          >
            <ChevronRight size={18} />
          </Link>
        </div>

        <div className="hidden gap-2 lg:flex">
          <button
            type="button"
            aria-label={`Scroll ${carouselLabel} left`}
            onClick={() => carouselRef.current?.scroll("left")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label={`Scroll ${carouselLabel} right`}
            onClick={() => carouselRef.current?.scroll("right")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <HorizontalListingCarousel ref={carouselRef} label={carouselLabel}>
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="w-[160px] shrink-0 snap-start">
              <MinimalListingCard loading />
            </div>
          ))}
        </HorizontalListingCarousel>
      ) : (
        <HorizontalListingCarousel ref={carouselRef} label={carouselLabel}>
          {listings.map((listing) => (
            <div key={listing.id} className="w-[160px] shrink-0 snap-start">
              <MinimalListingCard item={listing} />
            </div>
          ))}
        </HorizontalListingCarousel>
      )}
    </section>
  );
}
