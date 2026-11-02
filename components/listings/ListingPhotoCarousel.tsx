"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

interface ListingPhotoCarouselProps {
  images: readonly string[];
  listingName: string;
  href?: string;
  target?: "_blank" | "_self";
  className: string;
  linkClassName?: string;
  emptyMessage?: string;
  onImageClick?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  renderImage: (src: string, index: number) => ReactNode;
  children?: ReactNode;
}

export default function ListingPhotoCarousel({
  images,
  listingName,
  href,
  target,
  className,
  linkClassName = "",
  emptyMessage = "Photos coming soon",
  onImageClick,
  onFocus,
  onBlur,
  renderImage,
  children,
}: ListingPhotoCarouselProps) {
  const [selection, setSelection] = useState({ key: "", index: 0 });
  const touchStartX = useRef<number | null>(null);
  const ignoreClick = useRef(false);
  const imageCount = images.length;
  const firstImage = images[0] ?? "";
  const selectionKey = `${firstImage}\u0000${imageCount}`;
  const activeImageIndex =
    selection.key === selectionKey
      ? Math.min(selection.index, Math.max(imageCount - 1, 0))
      : 0;

  function changeImage(event: MouseEvent<HTMLButtonElement>, direction: -1 | 1) {
    event.preventDefault();
    event.stopPropagation();
    setSelection({
      key: selectionKey,
      index: Math.max(0, Math.min(imageCount - 1, activeImageIndex + direction)),
    });
  }

  return (
    <div
      role="group"
      aria-label={`${listingName} photos`}
      aria-roledescription="carousel"
      className={`group relative overflow-hidden touch-pan-y ${className}`}
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
        setSelection({
          key: selectionKey,
          index: Math.max(
            0,
            Math.min(
              imageCount - 1,
              activeImageIndex + (delta < 0 ? 1 : -1),
            ),
          ),
        });
      }}
      onPointerCancel={() => {
        touchStartX.current = null;
      }}
      onClickCapture={(event) => {
        if (!ignoreClick.current) return;
        event.preventDefault();
        event.stopPropagation();
        ignoreClick.current = false;
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
          {images.map((src, index) => {
            const slide = (
              <>
                {renderImage(src, index)}
                {href && (
                  <span className="sr-only">
                    View details for {listingName}
                  </span>
                )}
              </>
            );
            const slideClassName = `relative block h-full w-full focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#9C2454] ${linkClassName}`;

            return (
              <div
                key={`${src}-${index}`}
                aria-hidden={index !== activeImageIndex}
                className="h-full shrink-0"
                style={{ width: `${100 / imageCount}%` }}
              >
                {href ? (
                  <Link
                    href={href}
                    target={target}
                    rel={target === "_blank" ? "noreferrer" : undefined}
                    aria-label={`View ${listingName}`}
                    tabIndex={index === activeImageIndex ? 0 : -1}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onClick={(event) => {
                      if (ignoreClick.current) {
                        event.preventDefault();
                        ignoreClick.current = false;
                        return;
                      }
                      onImageClick?.();
                    }}
                    className={slideClassName}
                  >
                    {slide}
                  </Link>
                ) : (
                  <div className={slideClassName}>{slide}</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[#777582]">
          {emptyMessage}
        </div>
      )}

      {children}

      {imageCount > 1 && (
        <>
          {activeImageIndex > 0 && (
            <button
              type="button"
              aria-label={`Previous photo of ${listingName}`}
              onClick={(event) => changeImage(event, -1)}
              className="listing-card-carousel-control absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#1B1A2E] shadow transition hover:scale-105 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9C2454] sm:h-8 sm:w-8"
            >
              <ChevronLeft aria-hidden="true" size={20} />
            </button>
          )}
          {activeImageIndex < imageCount - 1 && (
            <button
              type="button"
              aria-label={`Next photo of ${listingName}`}
              onClick={(event) => changeImage(event, 1)}
              className="listing-card-carousel-control absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#1B1A2E] shadow transition hover:scale-105 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9C2454] sm:h-8 sm:w-8"
            >
              <ChevronRight aria-hidden="true" size={20} />
            </button>
          )}
          <div className="absolute inset-x-0 bottom-2.5 z-20 flex justify-center">
            <div
              role="group"
              aria-label="Choose listing photo"
              className="flex items-center gap-0.5"
            >
              {images.map((src, index) => (
                <button
                  key={`${src}-${index}-dot`}
                  type="button"
                  aria-label={`Show photo ${index + 1} of ${imageCount}`}
                  aria-current={index === activeImageIndex ? "true" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setSelection({ key: selectionKey, index });
                  }}
                  className="flex h-4 w-3 items-center justify-center"
                >
                  <span
                    className={`block h-1.5 rounded-full shadow-sm transition-all duration-300 motion-reduce:transition-none ${
                      index === activeImageIndex
                        ? "w-3.5 bg-white"
                        : "w-1.5 bg-white/75"
                    }`}
                  />
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
