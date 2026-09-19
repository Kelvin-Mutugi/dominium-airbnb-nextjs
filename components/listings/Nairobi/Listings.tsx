"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Listing } from "../../homeData";
import MinimalListingCard from "../../minimalListingCard";
import HorizontalListingCarousel from "@/components/listings/HorizontalListingCarousel";

interface FeaturedListingsProps {
  listings: Listing[];
  isLoading?: boolean;
}

export default function NairobiListings({
  listings,
  isLoading = false,
}: FeaturedListingsProps) {
  const [scrollCarousel, setScrollCarousel] = useState<
    ((direction: "left" | "right") => void) | null
  >(null);

  return (
    <section id="listings" className="px-[6%] pt-[40px]">
      {/* Heading + arrows on the same level */}
      <div className="mb-[26px] flex items-center justify-between">
        <div className="flex items-center">
          <h2 className="text-[20px] font-semibold text-[#36454F]">
            Stay in Nairobi
          </h2>

          <Link
            href="/listings/Nairobi"
            className="ml-[15px] flex h-7 w-7 items-center justify-center rounded-full border border-[#E9E6DD] bg-[#F7F7F7] font-bold text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
          >
            <ChevronRight size={18} />
          </Link>
        </div>

        {/* Carousel arrows */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollCarousel?.("left")}
            aria-label="Scroll Nairobi listings left"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            onClick={() => scrollCarousel?.("right")}
            aria-label="Scroll Nairobi listings right"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <HorizontalListingCarousel
          label="Nairobi listings"
          onReady={setScrollCarousel}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="w-[240px] shrink-0 snap-start"
            >
              <MinimalListingCard loading />
            </div>
          ))}
        </HorizontalListingCarousel>
      ) : listings.length === 0 ? (
        <p className="text-[15px] text-[#3A3856]/70">
          No listings match that location yet — try a different town.
        </p>
      ) : (
        <HorizontalListingCarousel
          label="Nairobi listings"
          onReady={setScrollCarousel}
        >
          {listings.map((item: Listing) => (
            <div
              key={item.id}
              className="w-[240px] shrink-0 snap-start"
            >
              <MinimalListingCard item={item} />
            </div>
          ))}
        </HorizontalListingCarousel>
      )}
    </section>
  );
}