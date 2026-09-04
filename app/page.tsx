"use client";

import Navbar from "@/components/navigationBar";
import HeroSection from "@/components/HeroSection";
import QuickRoutes from "@/components/QuickRoutes";
import FeaturedListings from "@/components/FeaturedListings";
import BookingProcess from "@/components/BookingProcess";
import { useState } from "react";
import { X, MessageCircle } from "lucide-react";
import { LISTINGS, ROUTES, Listing } from "@/components/homeData";

function townFromRoute(route: string): string | null {
  if (route === "All towns") return null;
  const parts = route.split(" — ");
  return parts[1] ?? null;
}

export default function HomePage() {
  const [selectedListingId, setSelectedListingId] = useState<
    Listing["id"] | null
  >(null);
  const [selectedRoute, setSelectedRoute] = useState<string>(ROUTES[0]);
  const [checkIn, setCheckIn] = useState<string>("");

  const town = townFromRoute(selectedRoute);
  const filteredListings: Listing[] = town
    ? LISTINGS.filter((item) => item.loc.split(",")[0].trim() === town)
    : LISTINGS;

  const selectedListing: Listing | undefined = LISTINGS.find(
    (item) => item.id === selectedListingId,
  );

  const scrollToListings = () => {
    document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Navbar />
      <HeroSection
        selectedRoute={selectedRoute}
        onRouteChange={setSelectedRoute}
        checkIn={checkIn}
        onCheckInChange={setCheckIn}
        onSearch={scrollToListings}
      />
      <QuickRoutes />
      <FeaturedListings
        listings={filteredListings}
        onSelectListing={setSelectedListingId}
      />

      <BookingProcess />

      {selectedListing && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(10,9,20,0.6)] px-[6%]"
          onClick={() => setSelectedListingId(null)}
        >
          <div
            className="relative w-full max-w-[480px] overflow-hidden rounded-2xl bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setSelectedListingId(null)}
              aria-label="Close"
              className="absolute right-[14px] top-[14px] z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#1B1A2E]"
            >
              <X size={18} />
            </button>

            <img
              src={selectedListing.img}
              alt={selectedListing.name}
              className="block h-[220px] w-full object-cover"
            />

            <div className="p-[22px]">
              <h3 className="font-display text-[22px] font-normal">
                {selectedListing.name}
              </h3>

              <div className="mt-1 text-[13px] text-[#3A3856]/65">
                {selectedListing.loc}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="font-mono text-[16px] font-bold">
                  {selectedListing.detail}
                </div>

                <a
                  href="#"
                  className="flex items-center gap-[6px] rounded-lg bg-[#128C7E] px-[16px] py-[10px] text-[13px] font-semibold text-white no-underline"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
