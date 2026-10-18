"use client";

import Link from "next/link";
import Image from "next/image";
import unsplashImageLoader from "./unsplash-image-loader";
import { HERO_IMAGES } from "./homeData";

const HERO_COUNTIES = ["Nairobi", "Mombasa", "Kilifi", "Nakuru", "Kisumu"];

// Kept so the parent doesn't break. Search lives in the navbar now.
interface HeroSectionProps {
  selectedRoute?: string;
  onRouteChange?: (route: string) => void;
  checkIn?: string;
  onCheckInChange?: (value: string) => void;
  onSearch?: () => void;
}

const chip =
  "shrink-0 rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-[13px] font-medium text-neutral-800 no-underline transition-colors hover:border-neutral-900 hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900";

export default function HeroSection(_props: HeroSectionProps) {
  const heroImage = HERO_IMAGES[0];

  return (
    <section
      id="home"
      // Same 6% side padding as the category row and listings below,
      // so the text lines up with "Our Top Unique Properties".
      className="relative bg-white px-4 pt-6 sm:px-[6%] lg:pt-8"
    >
      {/* Photo on the right, washed out by a white overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src={heroImage || "/placeholder.svg"}
          alt=""
          loader={unsplashImageLoader}
          fill
          sizes="100vw"
          quality={80}
          preload
          className="object-cover object-right"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
        {/* Mobile: even wash so text stays readable */}
        <div className="absolute inset-0 bg-white/90 sm:hidden" />
        {/* sm+: solid white on the left, photo shows through on the right */}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-white from-45% via-white/90 to-white/30 sm:block" />
      </div>

      <div className="relative z-[2] pb-6 lg:pb-8">
        <h1 className="max-w-[720px] text-[45px] font-semibold leading-tight text-neutral-900 sm:text-[30px] lg:text-[34px]">
          Stay somewhere{" "}
          <span className="text-[#e0245e]">worth remembering</span>
        </h1>

        <p className="mt-1.5 text-[13px] text-neutral-600 sm:text-sm">
          Hand-checked stays · Pay with M-Pesa · Book in minutes
        </p>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
          {HERO_COUNTIES.map((county) => (
            <Link
              key={county}
              href={`/allListings?location=${encodeURIComponent(county)}`}
              className={chip}
            >
              {county}
            </Link>
          ))}
          <Link
            href="/allListings"
            className="shrink-0 px-2 py-1.5 text-[13px] font-semibold text-[#e0245e] no-underline hover:underline"
          >
            Browse all →
          </Link>
        </div>
      </div>
    </section>
  );
}