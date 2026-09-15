"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

interface HorizontalListingCarouselProps {
  children: React.ReactNode;
  label: string;
}

export default function HorizontalListingCarousel({
  children,
  label,
}: HorizontalListingCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    trackRef.current?.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label={`Scroll ${label} left`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label={`Scroll ${label} right`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E9E6DD] bg-white text-[#36454F] transition-colors hover:border-[#E23E85] hover:text-[#E23E85]"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
