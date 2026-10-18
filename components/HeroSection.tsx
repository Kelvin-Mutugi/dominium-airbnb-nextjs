"use client";

import Link from "next/link";
import Image from "next/image";
import unsplashImageLoader from "./unsplash-image-loader";
import { HERO_IMAGES } from "./homeData";
import SearchBar from "./SearchBar";
import { ArrowUpRight, MapPin } from "lucide-react";

// Shortcuts into /allListings. The `location` param matches what the navbar search uses.
const HERO_COUNTIES = [
  "Nairobi",
  "Mombasa",
  "Kilifi",
  "Nakuru",
  "Kisumu",
];

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
  const heroImage = HERO_IMAGES[0];

  return (
    <section
      id="home"
      className="relative flex flex-col items-center justify-center bg-[#000000] px-4 py-6 sm:px-[6%] sm:py-8 lg:min-h-[clamp(280px,36vh,380px)] lg:py-8"
    >
      {/* Sliding background images — clipped to the hero only */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src={heroImage || "/placeholder.svg"}
          alt="Nairobi skyline overview"
          loader={unsplashImageLoader}
          fill
          sizes="100vw"
          quality={85}
          preload
          className="object-cover"
          onError={(event) => {
            event.currentTarget.src = "/placeholder.svg";
          }}
        />
        <div className="absolute inset-0 bg-[rgba(10,9,20,0.68)]" />
      </div>

      <div className="relative z-[2] mx-auto w-full max-w-[1120px] text-center lg:py-2">
        <h1 className="mx-auto hidden max-w-full whitespace-nowrap text-[14px] font-bold leading-[1.1] tracking-[0.3px] text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.35)] sm:block sm:text-[30px] lg:text-[42px] lg:leading-[1.06]">
          Stay somewhere worth remembering
        </h1>
        {/* <h1 className="mx-auto max-w-[720px] text-[30px] font-bold leading-[1.1] tracking-[0.3px] text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.35)] sm:text-[38px] lg:text-[48px] lg:leading-[1.06]">
          This website is under maintenance. Please do not make any Payments
        </h1> */}

        <p className="mt-1.5 hidden text-[13px] text-neutral-400 sm:block sm:text-sm">
          Hand-checked stays · Pay with M-Pesa · Book in minutes
        </p>

        {/* <div className="mt-7 flex justify-center">
          <SearchBar
            selectedRoute={selectedRoute}
            onRouteChange={onRouteChange}
            checkIn={checkIn}
            onCheckInChange={onCheckInChange}
            onSearch={onSearch}
          />
        </div> */}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {/* <span className="mr-1 text-[13px] font-medium text-white/70">
            Popular:
          </span> */}
          {HERO_COUNTIES.map((name, index) => (
            <Link
              key={name}
              href={`/allListings?location=${encodeURIComponent(name)}`}
              className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-white/30 bg-black/20 py-1.5 pl-2 pr-3.5 text-white no-underline backdrop-blur-sm transition-colors hover:border-white/70 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="flex size-6 items-center justify-center text-white">
                <MapPin size={13} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span className="text-[13px] font-medium">{name}</span>
              <span className="border-l border-white/25 pl-2 text-[10px] tabular-nums text-white/55">
                {String(index + 1).padStart(2, "0")}
              </span>
            </Link>
          ))}
          <Link
            href="/allListings"
            className="group inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-neutral-900 no-underline transition-colors hover:bg-[#FBE8EF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            All stays
            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}