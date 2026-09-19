"use client";

import SearchBar from "./SearchBar";
import { HERO_IMAGES } from "./homeData";

interface HeroSectionProps {
  selectedRoute: string;
  onRouteChange: (route: string) => void;
  checkIn: string;
  onCheckInChange: (value: string) => void;
  onSearch: () => void;
}

export default function HeroSection({
  selectedRoute,
  onRouteChange,
  checkIn,
  onCheckInChange,
  onSearch,
}: HeroSectionProps) {
  return (
    <section
      id="home"
      // Below lg: a compact, auto-height column (heading, then search bar in normal flow).
      // lg and up: the original 35vh hero with the search bar floating over the bottom edge.
      className="relative flex flex-col items-center justify-center gap-5 bg-[#1B1A2E] px-4 py-8 sm:gap-6 sm:px-[6%] sm:py-10 lg:h-[35vh] lg:flex-row lg:gap-0 lg:py-8"
    >
      {/* Sliding background images — clipped to the hero only */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {HERO_IMAGES.map((src: string, index: number) => (
          <img
            key={src}
            src={src || "/placeholder.svg"}
            alt=""
            className="hero-slide"
            style={{
              animationDelay: index === 0 ? "0s" : index === 1 ? "-6s" : "-12s",
            }}
            onError={(event) => {
              event.currentTarget.src = "/placeholder.svg";
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[rgba(10,9,20,0.55)]" />
      </div>

      <div className="relative z-[2] mx-auto w-full max-w-[1120px] text-center">
        <h1 className="mx-auto max-w-[620px] text-center text-[26px] font-bold leading-[1.1] tracking-[0.3px] text-white/50 sm:text-[30px] lg:text-[33px] lg:leading-[1.06]">
          Find Your Next <em className="not-italic">Few Nights</em> In Kenya
        </h1>

        {/* <p className="mx-auto mt-4 max-w-[440px] text-center text-[15px] leading-[1.5] text-white/80">
          Personally verified apartments across the country. Message the host
          directly on WhatsApp to book in minutes.
        </p> */}
      </div>

      {/* Search bar
          - below lg: sits in the normal flow under the heading (no overhang, no overlap)
          - lg and up: centered, own max-width, floats over the hero's bottom edge */}
      <div className="relative z-[3] flex w-full justify-center lg:absolute lg:bottom-0 lg:left-0 lg:right-0 lg:translate-y-1/3 lg:px-[6%]">
        <div className="w-full max-w-[900px]">
          <SearchBar
            selectedRoute={selectedRoute}
            onRouteChange={onRouteChange}
            checkIn={checkIn}
            onCheckInChange={onCheckInChange}
            onSearch={onSearch}
          />
        </div>
      </div>
    </section>
  );
}