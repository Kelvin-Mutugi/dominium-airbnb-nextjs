"use client";

import { useRef, useState } from "react";

export type SaleGalleryImage = {
  id: string;
  url: string;
  alt_text: string;
  width: number;
  height: number;
};

export function SalePropertyGallery({
  images,
  propertyTitle,
}: {
  images: SaleGalleryImage[];
  propertyTitle: string;
}) {
  const mobileGalleryRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function moveMobileGallery(direction: -1 | 1) {
    const gallery = mobileGalleryRef.current;
    if (!gallery) return;
    gallery.scrollBy({ left: gallery.clientWidth * direction, behavior: "smooth" });
  }

  if (!images.length) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[#EFEEEB] text-sm text-[#777582] sm:aspect-[16/9]">
        Photos coming soon
      </div>
    );
  }

  return (
    <>
      <div className="relative md:hidden">
        <div
          ref={mobileGalleryRef}
          role="region"
          aria-label={`${propertyTitle} photos`}
          aria-roledescription="carousel"
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(event) => {
            const gallery = event.currentTarget;
            if (gallery.clientWidth > 0) {
              setActiveIndex(Math.round(gallery.scrollLeft / gallery.clientWidth));
            }
          }}
        >
          {images.map((image, index) => (
            <div key={image.id} className="relative aspect-[4/3] min-w-full snap-center overflow-hidden bg-[#EFEEEB]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt_text || `${propertyTitle} photo ${index + 1}`}
                data-property-event="gallery_open"
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={index === 0 ? "high" : "auto"}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous property photo"
              onClick={() => moveMobileGallery(-1)}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-2xl text-[#1B1A2E] shadow-md"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next property photo"
              onClick={() => moveMobileGallery(1)}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-2xl text-[#1B1A2E] shadow-md"
            >
              ›
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-[#1B1A2E]/80 px-3 py-1 text-xs font-medium text-white" aria-live="polite">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-2">
        {images.map((image, index) => (
          <div
            key={image.id}
            className={`overflow-hidden rounded-xl bg-[#EFEEEB] ${index === 0 ? "md:col-span-2" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.alt_text || `${propertyTitle} photo ${index + 1}`}
              data-property-event="gallery_open"
              loading={index < 2 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={index === 0 ? "high" : "auto"}
              className={`w-full object-cover ${index === 0 ? "max-h-[560px] aspect-[16/9]" : "aspect-[4/3]"}`}
            />
          </div>
        ))}
      </div>
    </>
  );
}
