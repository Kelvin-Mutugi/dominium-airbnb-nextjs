"use client";

import Navbar from "@/components/navigationBar";
import HeroSection from "@/components/HeroSection";
import QuickRoutes from "@/components/QuickRoutes";
import FeaturedListings from "@/components/FeaturedListings";
import BookingProcess from "@/components/BookingProcess";
import { useState } from "react";
import { LISTINGS, ROUTES } from "@/components/homeData";

function townFromRoute(route: string): string | null {
  if (route === "All towns") return null;
  const parts = route.split(" — ");
  return parts[1] ?? null;
}

export default function HomePage() {
  const [selectedRoute, setSelectedRoute] = useState<string>(ROUTES[0]);
  const [checkIn, setCheckIn] = useState<string>("");

  const town = townFromRoute(selectedRoute);
  const filteredListings = town
    ? LISTINGS.filter((item) => item.loc.split(",")[0].trim() === town)
    : LISTINGS;

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
      <FeaturedListings listings={filteredListings} />

      <BookingProcess />
    </>
  );
}
