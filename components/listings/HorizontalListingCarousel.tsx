"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export interface HorizontalListingCarouselHandle {
  scroll: (direction: "left" | "right") => void;
}

interface HorizontalListingCarouselProps {
  children: React.ReactNode;
  label: string;
}

const HorizontalListingCarousel = forwardRef<
  HorizontalListingCarouselHandle,
  HorizontalListingCarouselProps
>(function HorizontalListingCarousel({ children, label }, ref) {
  const trackRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    scroll: (direction: "left" | "right") => {
      trackRef.current?.scrollBy({
        left: direction === "left" ? -320 : 320,
        behavior: "smooth",
      });
    },
  }));

  return (
    <div className="relative">
      <div
        ref={trackRef}
        aria-label={label}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
});

export default HorizontalListingCarousel;