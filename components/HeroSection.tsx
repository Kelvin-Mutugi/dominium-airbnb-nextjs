"use client";

import Link from "next/link";
import { HERO_IMAGES } from "./homeData";
import SearchBar from "./SearchBar";

// Shortcuts into /allListings. The `location` param matches what the navbar search uses.
const HERO_COUNTIES = ["Nairobi", "Mombasa", "Kilifi", "Nakuru", "Kisumu"];

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
      // Below lg: the navbar sits in normal flow above the hero, so no extra top padding.
      // lg and up: the navbar overlaps the hero (lg:-mb-[72px]), so pt-[104px] keeps
      // the content clear of it (72px navbar + 32px breathing room).
      className="relative flex flex-col items-center justify-center bg-[#1B1A2E] px-4 py-12 sm:px-[6%] sm:py-14 lg:min-h-[clamp(380px,48vh,520px)] lg:pb-14 lg:pt-[104px]"
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
              animationDelay:
                index === 0 ? "0s" : index === 1 ? "-6s" : "-12s",
            }}
            onError={(event) => {
              event.currentTarget.src = "/placeholder.svg";
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[rgba(10,9,20,0.55)]" />
      </div>

      <div className="relative z-[2] mx-auto w-full max-w-[1120px] text-center lg:py-2">
        <h1 className="mx-auto max-w-[720px] text-[30px] font-bold leading-[1.1] tracking-[0.3px] text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.35)] sm:text-[38px] lg:text-[48px] lg:leading-[1.06]">
          Find your next few nights in Kenya
        </h1>

        <p className="mx-auto mt-4 max-w-[500px] text-[15px] leading-[1.55] text-white/85 sm:text-base">
          Verified apartments and homes from Nairobi to the coast. Search by
          county, pick your dates and book securely.
        </p>

        <div className="mt-7 flex justify-center">
          <SearchBar
            selectedRoute={selectedRoute}
            onRouteChange={onRouteChange}
            checkIn={checkIn}
            onCheckInChange={onCheckInChange}
            onSearch={onSearch}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 text-[13px] font-medium text-white/70">
            Popular:
          </span>
          {HERO_COUNTIES.map((county) => (
            <Link
              key={county}
              href={`/allListings?location=${encodeURIComponent(county)}`}
              className="rounded-full border border-white/35 bg-white/10 px-4 py-1.5 text-[13px] font-medium text-white no-underline backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {county}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}