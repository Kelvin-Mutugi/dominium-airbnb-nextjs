"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navigationBar";
import HeroSection from "@/components/HeroSection";
import FeaturedListings from "@/components/listings/Feartured/FeaturedListings";
import BookingProcess from "@/components/BookingProcess";
import PopularDestinations, { type Home } from "@/components/Populardestinations";
import WhyBookUs from "@/components/WhyBookUs";
import MagicalKenya from "@/components/MagicalKenya";
import { ROUTES, type Listing } from "@/components/homeData";

export default function HomePageClient({
  listings,
  isLoading = false,
  children,
}: {
  listings: Listing[];
  isLoading?: boolean;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [selectedRoute, setSelectedRoute] = useState<string>(ROUTES[0]);
  const [checkIn, setCheckIn] = useState("");

  const featuredListings = listings.slice(0, 8);
  const homes: Home[] = listings
    .map((listing) => ({
      ...listing,
      bookingTerms: listing.bookingTerms ?? "",
      cancelationPolicy: listing.cancelationPolicy ?? "",
      houserules: listing.houserules ?? [],
      refundPolicy: listing.refundPolicy ?? "",
      privacyPolicy: listing.privacyPolicy ?? "",
      cancellationDeadline: listing.cancellationDeadline ?? "",
      latitude: listing.latitude ?? 0,
      longitude: listing.longitude ?? 0,
      rating: listing.rating ?? 0,
      reviewCount: listing.reviewCount ?? 0,
      reviews: listing.reviews ?? [],
      bookedDateRanges: listing.bookedDateRanges ?? [],
      verified: listing.verified ?? false,
      guests: listing.guests ?? listing.maxGuests,
      beds: listing.beds ?? 0,
      baths: listing.baths ?? 0,
      amenities: listing.amenities ?? [],
    }))
    .filter((home) => home.verified)
    .slice(0, 5);

  function scrollToListings() {
    document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" });
  }

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
      <MagicalKenya />
      <FeaturedListings listings={featuredListings} isLoading={isLoading} />
      {children}
      <PopularDestinations
        homes={homes}
        onView={(home) => router.push(`/apartments/${home.id}`)}
      />
      <WhyBookUs />
      <BookingProcess />
    </>
  );
}