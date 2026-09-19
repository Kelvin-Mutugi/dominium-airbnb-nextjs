"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Listing } from "../../homeData";
import FeaturedListingCard from "../../fearturedListingCard";
import HorizontalListingCarousel, {
  HorizontalListingCarouselHandle,
} from "@/components/listings/HorizontalListingCarousel";

interface FeaturedListingsProps {
  listings: Listing[];
  isLoading?: boolean;
}

export default function FeaturedListings({
  listings,
  isLoading = false,
}: FeaturedListingsProps) {
  const carouselRef = useRef<HorizontalListingCarouselHandle>(null);

  return (
    <section id="listings" className="px-[6%] pb-[20px] pt-[40px]">
      {/* Title + arrows */}
      <div className="mb-[26px] flex items-center justify-between">
        <h2 className="text-[20px] font-semibold text-[#36454F]">
          Our Top Unique Properties
        </h2>

        {/* Carousel arrows */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => carouselRef.current?.scroll("left")}
            aria-label="Scroll featured listings left"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            onClick={() => carouselRef.current?.scroll("right")}
            aria-label="Scroll featured listings right"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <HorizontalListingCarousel
          ref={carouselRef}
          label="featured listings"
        >
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="w-[280px] shrink-0 snap-start"
            >
              <FeaturedListingCard loading />
            </div>
          ))}
        </HorizontalListingCarousel>
      ) : listings.length === 0 ? (
        <p className="text-[15px] text-[#3A3856]/70">
          No listings match that location yet — try a different town.
        </p>
      ) : (
        <HorizontalListingCarousel
          ref={carouselRef}
          label="featured listings"
        >
          {listings.map((item: Listing) => (
            <div
              key={item.id}
              className="w-[280px] shrink-0 snap-start"
            >
              <FeaturedListingCard item={item} />
            </div>
          ))}
        </HorizontalListingCarousel>
      )}
    </section>
  );
}