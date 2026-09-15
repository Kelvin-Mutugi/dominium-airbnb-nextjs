"use client";

import Link from "next/link";
import type { Listing } from "../../homeData";
import MinimalListingCard from "../../minimalListingCard";
import HorizontalListingCarousel from "@/components/listings/HorizontalListingCarousel";

interface FeaturedListingsProps {
  listings: Listing[];
  isLoading?: boolean;
}

export default function NairobiListings({ listings, isLoading = false }: FeaturedListingsProps) {
  return (
    <section id="listings" className="px-[6%] pb-[20px] pt-[40px]">
      <div className="mb-[26px] flex items-baseline justify-between">
        <h2 className="text-[20px] font-semibold text-[#36454F]">
          Stay in Nairobi
        </h2>

        <Link
          href="/allListings"
          className="text-[14px] font-semibold text-[#E23E85] no-underline"
        >
          View all →
        </Link>
      </div>

      {isLoading ? (
        <HorizontalListingCarousel label="Nairobi listings">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="w-[240px] shrink-0 snap-start">
              <MinimalListingCard loading />
            </div>
          ))}
        </HorizontalListingCarousel>
      ) : listings.length === 0 ? (
        <p className="text-[15px] text-[#3A3856]/70">
          No listings match that location yet — try a different town.
        </p>
      ) : (
        <HorizontalListingCarousel label="Nairobi listings">
          {listings.map((item: Listing) => (
            <div key={item.id} className="w-[240px] shrink-0 snap-start">
              <MinimalListingCard item={item} />
            </div>
          ))}
        </HorizontalListingCarousel>
      )}
    </section>
  );
}
