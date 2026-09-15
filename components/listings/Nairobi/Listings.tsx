"use client";

import Link from "next/link";
import { Listing } from "../../homeData";
import MinimalListingCard from "../../minimalListingCard";

interface FeaturedListingsProps {
  listings: Listing[];
}

export default function NairobiListings({ listings }: FeaturedListingsProps) {
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

      {listings.length === 0 ? (
        <p className="text-[15px] text-[#3A3856]/70">
          No listings match that location yet — try a different town.
        </p>
      ) : (
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {listings.map((item: Listing) => (
            <MinimalListingCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
