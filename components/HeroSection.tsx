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
      className="relative flex min-h-[88vh] items-center overflow-hidden bg-[#1B1A2E] px-[6%] py-[90px] pb-[70px]"
      id="home"
    >
      <div className="absolute inset-0 z-0">
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
      </div>

      <div className="absolute inset-0 z-[1] bg-[rgba(10,9,20,0.55)]" />

      <div className="relative z-[2] max-w-[760px]">
        <h1 className="font-display text-[clamp(38px,6vw,62px)] font-normal leading-[1.06] tracking-[0.3px] text-white">
          Find your next{" "}
          <em className="not-italic text-[#E89A1C]">few nights</em> in Kenya
        </h1>

        <p className="mb-[40px] mt-[22px] max-w-[480px] text-[17px] leading-[1.6] text-white/80">
          Personally verified apartments across the country. Message the host
          directly on WhatsApp to book in minutes.
        </p>

        <SearchBar
          selectedRoute={selectedRoute}
          onRouteChange={onRouteChange}
          checkIn={checkIn}
          onCheckInChange={onCheckInChange}
          onSearch={onSearch}
        />
      </div>
    </section>
  );
}
