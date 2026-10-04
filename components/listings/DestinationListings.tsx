"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
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
            href={`/allListings?location=${encodeURIComponent(slug)}`}
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
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            aria-label={`Scroll ${carouselLabel} right`}
            onClick={() => carouselRef.current?.scroll("right")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <HorizontalListingCarousel ref={carouselRef} label={carouselLabel}>
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="w-[180px] shrink-0 snap-start">
              <MinimalListingCard loading />
            </div>
          ))}
        </HorizontalListingCarousel>
      ) : (
        <HorizontalListingCarousel ref={carouselRef} label={carouselLabel}>
          {listings.map((listing) => (
            <div key={listing.id} className="w-[180px] shrink-0 snap-start">
              <MinimalListingCard item={listing} />
            </div>
          ))}
          <SeeAllDestinationCard slug={slug} />
        </HorizontalListingCarousel>
      )}
    </section>
  );
}

function SeeAllDestinationCard({ slug }: { slug: string }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setIsVisible(false);
          return;
        }

        setIsVisible(true);
        observer.unobserve(card);
      },
      { threshold: 0.25 },
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      ref={cardRef}
      href={`/allListings?location=${encodeURIComponent(slug)}`}
      aria-label={`See all stays in ${slug}`}
      aria-hidden={!isVisible}
      tabIndex={isVisible ? undefined : -1}
      className={`account-neu-surface group flex h-[184px] w-[148px] shrink-0 snap-start flex-col justify-start overflow-hidden rounded-[18px] border border-[#E9E6DD] bg-white p-4 text-[#36454F] transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
        isVisible ? "translate-x-0 scale-100 opacity-100" : "translate-x-5 scale-[0.97] opacity-0"
      }`}
    >
      <span className="flex size-9 items-center justify-center rounded-full border border-[#E9E6DD] bg-[#F7F7F7] shadow-[inset_1px_1px_3px_rgba(27,26,46,0.08),inset_-1px_-1px_3px_rgba(255,255,255,0.9)]">
        <ArrowUpRight aria-hidden="true" className="text-[#E23E85]" size={17} />
      </span>
      <span className="mt-8 min-w-0">
        <span className="block text-base font-semibold leading-tight">See all stays</span>
        <span className="mt-1 block truncate text-sm text-[#72777A]">in {slug}</span>
      </span>
    </Link>
  );
}
