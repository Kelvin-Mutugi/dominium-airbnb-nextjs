"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Listing } from "../../homeData";
import MinimalListingCard from "../../minimalListingCard";
import HorizontalListingCarousel from "@/components/listings/HorizontalListingCarousel";

interface FeaturedListingsProps {
  listings: Listing[];
  isLoading?: boolean;
}

export default function MombasaListings({
  listings,
  isLoading = false,
}: FeaturedListingsProps) {
  return (
    <section id="listings" className="px-[6%] pb-[20px] pt-[20px]">
      <div className="mb-[26px] flex items-center justify-between">
        {/* Title */}
        <div className="flex items-center">
          <h2 className="text-[20px] font-semibold text-[#36454F]">
            Our Mombasa Homes
          </h2>

          <Link
            href="/listings/Mombasa"
            className="ml-[15px] flex h-7 w-7 items-center justify-center rounded-full border border-[#E9E6DD] bg-[#F7F7F7] font-bold text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
          >
            <ChevronRight size={18} />
          </Link>
        </div>

        {/* Carousel arrows */}
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Scroll Mombasa listings left"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("mombasa-listings-scroll", {
                  detail: "left",
                })
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            aria-label="Scroll Mombasa listings right"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("mombasa-listings-scroll", {
                  detail: "right",
                })
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <HorizontalListingCarousel label="Mombasa listings">
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
        <HorizontalListingCarousel label="Mombasa listings">
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