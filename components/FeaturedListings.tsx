"use client";

import { Listing } from "./homeData";
import ListingCard from "./ListingCard";

interface FeaturedListingsProps {
  listings: Listing[];
}

export default function FeaturedListings({ listings }: FeaturedListingsProps) {
  return (
    <section id="listings" className="px-[6%] pb-[20px] pt-[40px]">
      <div className="mb-[26px] flex items-baseline justify-between">
        <h2 className="font-display text-[30px] font-normal text-[#36454F]">
          Featured stays
        </h2>

        <a
          href="#all"
          className="text-[14px] font-semibold text-[#E23E85] no-underline"
        >
          View all →
        </a>
      </div>

      {listings.length === 0 ? (
        <p className="text-[15px] text-[#3A3856]/70">
          No listings match that location yet — try a different town.
        </p>
      ) : (
        <div className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
          {listings.map((item: Listing) => (
            <ListingCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
