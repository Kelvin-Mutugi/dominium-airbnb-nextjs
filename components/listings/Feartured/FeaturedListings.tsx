"use client";

import { Listing } from "../../homeData";
import FeaturedListingCard from "../../fearturedListingCard";
import HorizontalListingCarousel from "@/components/listings/HorizontalListingCarousel";

interface FeaturedListingsProps {
  listings: Listing[];
  isLoading?: boolean;
}

export default function FeaturedListings({ listings, isLoading = false }: FeaturedListingsProps) {
  return (
    <section id="listings" className="px-[6%] pb-[20px] pt-[40px]">
      <div className="mb-[26px] flex items-baseline justify-between">
        <h2 className="text-[20px] font-semibold text-[#36454F]">
          Our Top Unique Properties
        </h2>

        {/* <a
          href="#all"
          className="text-[14px] font-semibold text-[#E23E85] no-underline"
        >
          View all →
        </a> */}
      </div>

      {isLoading ? (
        <HorizontalListingCarousel label="featured listings">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="w-[280px] shrink-0 snap-start">
              <FeaturedListingCard loading />
            </div>
          ))}
        </HorizontalListingCarousel>
      ) : listings.length === 0 ? (
        <p className="text-[15px] text-[#3A3856]/70">
          No listings match that location yet — try a different town.
        </p>
      ) : (
        <HorizontalListingCarousel label="featured listings">
          {listings.map((item: Listing) => (
            <div key={item.id} className="w-[280px] shrink-0 snap-start">
              <FeaturedListingCard item={item} />
            </div>
          ))}
        </HorizontalListingCarousel>
      )}
    </section>
  );
}
