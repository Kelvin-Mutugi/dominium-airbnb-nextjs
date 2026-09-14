"use client";

import { Listing } from "../../homeData";
import FeaturedListingCard from "../../fearturedListingCard";
import MinimalListingCard from "@/components/minimalListingCard";

interface FeaturedListingsProps {
  listings: Listing[];
}

export default function FeaturedListings({ listings }: FeaturedListingsProps) {
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

      {listings.length === 0 ? (
        <p className="text-[15px] text-[#3A3856]/70">
          No listings match that location yet — try a different town.
        </p>
      ) : (
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 bg-[#F7F7F7] p-4 rounded-lg">
          {listings.map((item: Listing) => (
            <FeaturedListingCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
