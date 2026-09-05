"use client";

import { Search } from "lucide-react";
import { HERO_IMAGES, ROUTES } from "./homeData";

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

        <div className="relative flex max-w-[640px] flex-wrap items-end gap-[14px] rounded-[14px] border-[1.5px] border-[#1B1A2E] bg-white p-[22px] shadow-[0_20px_44px_rgba(0,0,0,0.35)]">
          <div className="flex min-w-[160px] flex-1 flex-col gap-[6px]">
            <label className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#3A3856]/65">
              Location
            </label>

            <select
              value={selectedRoute}
              onChange={(event) => onRouteChange(event.target.value)}
              className="w-full border-0 border-b-2 border-[#1B1A2E] bg-transparent px-[2px] py-[6px] font-sans text-[15px] font-semibold text-[#1B1A2E] outline-none"
            >
              {ROUTES.map((route: string) => (
                <option key={route}>{route}</option>
              ))}
            </select>
          </div>

          <div className="flex min-w-[130px] flex-1 flex-col gap-[6px]">
            <label className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#3A3856]/65">
              Check-in
            </label>

            <input
              type="text"
              placeholder="Any date"
              value={checkIn}
              onChange={(event) => onCheckInChange(event.target.value)}
              className="w-full border-0 border-b-2 border-[#1B1A2E] bg-transparent px-[2px] py-[6px] font-sans text-[15px] font-semibold text-[#1B1A2E] outline-none"
            />
          </div>

          <button
            onClick={onSearch}
            className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border-0 bg-[#E23E85] px-[22px] py-[14px] font-display text-[15px] tracking-[1px] text-white"
          >
            <Search size={16} />
            SEARCH
          </button>
        </div>
      </div>
    </section>
  );
}
