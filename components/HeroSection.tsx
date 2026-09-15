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
      className="relative flex min-h-[460px] items-center bg-[#1B1A2E] px-[6%] py-12 lg:h-[35vh] lg:min-h-0 lg:py-8"
      id="home"
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
        <h1 className="mx-auto max-w-[620px] text-[clamp(32px,4.5vw,33px)] leading-[1.06] tracking-[0.3px] font-bold text-center text-white/50">
          Find Your Next{" "}
          <em className="not-italic">Few Nights</em> In Kenya
        </h1>

        {/* <p className="mx-auto mt-4 max-w-[440px] text-center text-[15px] leading-[1.5] text-white/80">
          Personally verified apartments across the country. Message the host
          directly on WhatsApp to book in minutes.
        </p> */}
      </div>

      {/* Search bar — centered, own max-width, floats over the hero's bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 z-[3] flex translate-y-1/3 justify-center px-[6%]">
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