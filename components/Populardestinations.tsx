"use client";

import React, { useState } from "react";

/**
 * These types mirror the shape of the objects in your homeData.ts.
 * If you already export these from homeData.ts, import them instead.
 */

export interface Review {
  id: string;
  guestName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface BookedRange {
  start: string;
  end: string;
}

export interface Home {
  id: string;
  name: string;
  loc: string;
  price: string;
  detail: string;
  img: string;
  gallery: string[];
  description: string;
  features: string[];
  host: string;
  bookingTerms: string;
  cancelationPolicy: string;
  houserules: string[];
  refundPolicy: string;
  privacyPolicy: string;
  maxGuests: number;
  checkInTime: string;
  checkOutTime: string;
  minNights: number;
  pricePerNight: number;
  serviceFeePercent: number;
  cancellationDeadline: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  reviews: Review[];
  bookedDateRanges: BookedRange[];
  verified: boolean;
  guests: number;
  beds: number;
  baths: number;
  amenities: string[];
}

interface PopularDestinationsProps {
  homes: Home[];

  /** Called when a guest clicks the CTA */
  onView?: (home: Home) => void;
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);

  return (
    <span
      className="inline-flex gap-[2px] text-[13px] tracking-[1px]"
      aria-hidden="true"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={
            i < rounded
              ? "text-[#C8952B]"
              : "text-white/30"
          }
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function PopularDestinations({
  homes,
  onView,
}: PopularDestinationsProps) {
  const [activeId, setActiveId] = useState(homes[0]?.id);
  const [stageIndex, setStageIndex] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const active =
    homes.find((h) => h.id === activeId) ?? homes[0];

  if (!active) return null;

  const stageImages =
    active.gallery?.length
      ? active.gallery
      : [active.img];

  const stageSrc =
    stageImages[
      Math.min(stageIndex, stageImages.length - 1)
    ];

  const selectHome = (id: string) => {
    setActiveId(id);
    setStageIndex(0);
  };

  const markError = (src: string) =>
    setImgErrors((prev) => ({
      ...prev,
      [src]: true,
    }));

  return (
    <section className="bg-[#F7F7F7] px-[6%] py-16 font-sans text-[#1B2420] md:py-24">

      {/* Header */}
      <div className="mb-14 max-w-[640px] md:mb-14">

        <h2 className="text-[28px] font-semibold text-[#36454F]">
          Favorite Places, Chosen By Our Guests.
        </h2>

        <p className="max-w-[46ch] text-[15px] leading-[1.6] text-[#1B2420]/70">
          The homes our guests book again and again. Select one to see what
          makes it worth the stay.
        </p>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-16">

        {/* Image stage */}
        <div className="relative h-[420px] overflow-hidden rounded-[2px] bg-[#1F4B4A] lg:sticky lg:top-8 lg:h-[640px]">

          {/* Main image / fallback */}
          {imgErrors[stageSrc] ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1F4B4A] to-[#1B2420]">
              <span className="text-[100px] italic text-[#f6f2e9]/35 md:text-[120px]">
                {active.name.charAt(0)}
              </span>
            </div>
          ) : (
            <img
              key={stageSrc}
              src={stageSrc}
              alt={`${active.name}, ${active.loc}`}
              onError={() => markError(stageSrc)}
              className="absolute inset-0 h-full w-full object-cover motion-safe:animate-[pdFade_0.45s_ease]"
            />
          )}

          {/* Image shade */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/[0.78]" />

          {/* Thumbnails */}
          {stageImages.length > 1 && (
            <div className="absolute right-5 top-5 flex gap-2">
              {stageImages.slice(0, 4).map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  aria-label={`Photo ${i + 1} of ${active.name}`}
                  onClick={() => setStageIndex(i)}
                  className={`h-11 w-11 overflow-hidden rounded-[2px] border-[1.5px] bg-black/20 p-0 transition ${
                    i === stageIndex
                      ? "border-[#C8952B]"
                      : "border-[#f6f2e9]/50"
                  }`}
                >
                  <img
                    src={src}
                    alt=""
                    onError={() => markError(src)}
                    className={`block h-full w-full object-cover transition-opacity duration-200 ${
                      i === stageIndex
                        ? "opacity-100"
                        : "opacity-65 hover:opacity-100"
                    }`}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Stage information */}
          <div className="absolute bottom-0 left-0 right-0 p-7 text-[#FFFFFF] md:p-9">

            {/* Location + verified */}
            <div className="mb-2 flex items-center gap-2.5">
              <span className="text-[13px] tracking-[0.02em] text-[#f6f2e9]/75">
                {active.loc}
              </span>

              {active.verified && (
                <span className="rounded-full border border-[#f6f2e9]/40 px-2.5 py-[3px] text-[11.5px] text-[#f6f2e9]/90">
                  Verified host
                </span>
              )}
            </div>

            {/* Name */}
            <h3 className="text-[28px] font-semibold text-[#WHITE] md:text-[30px]">
              {active.name}
            </h3>

            {/* Rating */}
            <div className="mb-3.5 flex items-center gap-2">
              <Stars rating={active.rating} />

              <span className="text-[13px] text-[#f6f2e9]/75">
                {active.rating.toFixed(1)} · {active.reviewCount} reviews
              </span>
            </div>

            {/* Features */}
            <div className="mb-[22px] flex flex-wrap gap-2">
              {active.features.slice(0, 4).map((feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-[#f6f2e9]/30 px-3 py-[5px] text-[12.5px] text-[#f6f2e9]/85"
                >
                  {feature}
                </span>
              ))}
            </div>

            {/* Price + CTA */}
            <div className="flex items-center justify-between gap-4">

              <div className="text-[13px] text-[#f6f2e9]/80">
                <b className="text-[18px] font-medium text-white">
                  {active.price}
                </b>

                <span className="mt-0.5 block text-[12px] text-[#f6f2e9]/60">
                  {active.host}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onView?.(active)}
                className="rounded-[2px] border-0 bg-white px-[22px] py-3 text-[13.5px] font-medium text-[#1B2420] transition-colors duration-200 hover:bg-[#faf8f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E23E85] focus-visible:outline-offset-2"
              >
                View {active.name}
              </button>
            </div>
          </div>
        </div>

        {/* Homes list */}
        <div className="border-t border-[#1B2420]/[0.12]">

          {homes.map((home) => {
            const isActive = home.id === active.id;

            return (
              <button
                key={home.id}
                type="button"
                role="listitem"
                aria-current={isActive}
                onClick={() => selectHome(home.id)}
                onMouseEnter={() => selectHome(home.id)}
                className={`group relative flex w-full items-center justify-between gap-5 border-b border-[#1B2420]/[0.12] bg-transparent px-1 py-[22px] text-left transition-colors ${
                  isActive
                    ? "before:scale-y-100"
                    : "before:scale-y-0"
                }

                before:absolute
                before:-left-[6vw]
                before:top-0
                before:bottom-0
                before:w-[3px]
                before:bg-[#E23E85]
                before:transition-transform
                before:duration-300

                focus-visible:outline
                focus-visible:outline-2
                focus-visible:outline-[#E23E85]
                focus-visible:outline-offset-[-2px]`}
              >

                {/* Main information */}
                <div className="flex min-w-0 flex-col gap-[5px]">

                  <span
                    className={`text-black text-[20px] font-normal transition-colors duration-200 md:text-[21px] ${
                      isActive
                        ? "text-[#1B2420]"
                        : "text-[#1B2420]/70 group-hover:text-[#1B2420]"
                    }`}
                  >
                    {home.name}
                  </span>

                  <span className="text-[13px] text-[#1B2420]/70">
                    {home.loc}
                  </span>

                  <span className="text-[12.5px] text-[#1B2420]/55">
                    {home.detail}
                  </span>
                </div>

                {/* Price + rating */}
                <div className="flex shrink-0 flex-col items-end gap-1 whitespace-nowrap">
                  <span className="text-[13.5px] text-[#1B2420]">
                    {home.price.split("/")[0].trim()}
                  </span>

                  <span className="text-[12px] text-[#1B2420]/70">
                    ★ {home.rating.toFixed(1)}
                  </span>
                </div>

              </button>
            );
          })}
        </div>
      </div>

      {/* Small animation definition */}
      <style jsx>{`
        @keyframes pdFade {
          from {
            opacity: 0;
            transform: scale(1.02);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

    </section>
  );
}