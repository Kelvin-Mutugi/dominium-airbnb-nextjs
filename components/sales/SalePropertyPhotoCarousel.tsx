"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type MouseEvent } from "react";
import type { SalePropertyImage } from "@/app/lib/sale-properties";

export function SalePropertyPhotoCarousel({
  images,
  propertyTitle,
  propertySlug,
  className = "",
  noPhotoMessage = "Photos coming soon",
  initialImageIndex = 0,
  onFocus,
  onBlur,
}: {
  images: SalePropertyImage[];
  propertyTitle: string;
  propertySlug: string;
  className?: string;
  noPhotoMessage?: string;
  initialImageIndex?: number;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(() => Math.max(
    0,
    Math.min(images.length - 1, initialImageIndex),
  ));
  const touchStartX = useRef<number | null>(null);
  const ignoreClick = useRef(false);
  const imageCount = images.length;

  function changeImage(event: MouseEvent<HTMLButtonElement>, direction: -1 | 1) {
    event.preventDefault();
    event.stopPropagation();
    setActiveImageIndex((current) => Math.max(0, Math.min(imageCount - 1, current + direction)));
  }

  return (
    <div
      role="group"
      aria-label={`${propertyTitle} photos`}
      aria-roledescription="carousel"
      className={`group relative aspect-[4/3] overflow-hidden bg-[#EFEEEB] touch-pan-y ${className}`}
      onPointerDown={(event) => {
        if (event.pointerType === "touch") touchStartX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (touchStartX.current === null || imageCount < 2) return;
        const delta = event.clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < 40) return;
        ignoreClick.current = true;
        window.setTimeout(() => {
          ignoreClick.current = false;
        }, 0);
        setActiveImageIndex((current) => Math.max(0, Math.min(imageCount - 1, current + (delta < 0 ? 1 : -1))));
      }}
      onPointerCancel={() => {
        touchStartX.current = null;
      }}
    >
      {imageCount > 0 ? (
        <div
          className="flex h-full transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{
            width: `${imageCount * 100}%`,
            transform: `translate3d(-${(activeImageIndex * 100) / imageCount}%, 0, 0)`,
          }}
        >
          {images.map((image, index) => (
            <div key={image.id} className="h-full shrink-0" style={{ width: `${100 / imageCount}%` }}>
              <Link
                href={`/for-sale/${propertySlug}`}
                aria-label={`View ${propertyTitle}`}
                aria-hidden={index !== activeImageIndex}
                tabIndex={index === activeImageIndex ? 0 : -1}
                onFocus={onFocus}
                onBlur={onBlur}
                onClick={(event) => {
                  if (!ignoreClick.current) return;
                  event.preventDefault();
                  ignoreClick.current = false;
                }}
                className="block h-full w-full focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#9C2454]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.alt_text || `${propertyTitle} photo ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[#777582]">{noPhotoMessage}</div>
      )}
      {imageCount > 1 && (
        <>
          {activeImageIndex > 0 && (
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(event) => changeImage(event, -1)}
              className="sale-card-carousel-control absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#1B1A2E] shadow transition hover:scale-105 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9C2454] sm:h-8 sm:w-8"
            >
              <ChevronLeft aria-hidden="true" size={20} />
            </button>
          )}
          {activeImageIndex < imageCount - 1 && (
            <button
              type="button"
              aria-label="Next photo"
              onClick={(event) => changeImage(event, 1)}
              className="sale-card-carousel-control absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#1B1A2E] shadow transition hover:scale-105 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9C2454] sm:h-8 sm:w-8"
            >
              <ChevronRight aria-hidden="true" size={20} />
            </button>
          )}
          <div className="absolute inset-x-0 bottom-2.5 z-20 flex justify-center">
            <div role="group" aria-label="Choose property photo" className="flex items-center gap-0.5">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  aria-label={`Show photo ${index + 1} of ${imageCount}`}
                  aria-current={index === activeImageIndex ? "true" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveImageIndex(index);
                  }}
                  className="flex h-4 w-3 items-center justify-center"
                >
                  <span className={`block h-1.5 rounded-full shadow-sm transition-all duration-300 motion-reduce:transition-none ${index === activeImageIndex ? "w-3.5 bg-white" : "w-1.5 bg-white/75"}`} />
                </button>
              ))}
            </div>
          </div>
          <span className="sr-only" aria-live="polite">
            Photo {activeImageIndex + 1} of {imageCount}
          </span>
        </>
      )}
    </div>
  );
}
