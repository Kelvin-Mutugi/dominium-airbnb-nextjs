"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navigationBar";
import HeroSection from "@/components/HeroSection";
import FeaturedListings from "@/components/listings/Feartured/FeaturedListings";
import DestinationListings from "@/components/listings/DestinationListings";
import BookingProcess from "@/components/BookingProcess";
import PopularDestinations, { type Home } from "@/components/Populardestinations";
import WhyBookUs from "@/components/WhyBookUs";
import { HOMEPAGE_DESTINATIONS } from "@/app/homepageSections";
import { ROUTES, type Listing } from "@/components/homeData";

function uniqueListings(listings: Listing[]) {
  return listings.filter(
    (listing, index, allListings) => allListings.findIndex((candidate) => candidate.id === listing.id) === index,
  );
}

export default function HomePageClient({
  listings,
  isLoading = false,
}: {
  listings: Listing[];
  isLoading?: boolean;
}) {
  const router = useRouter();
  const [selectedRoute, setSelectedRoute] = useState<string>(ROUTES[0]);
  const [checkIn, setCheckIn] = useState("");

  const featuredListings = listings.slice(0, 8);
  const destinationSections = HOMEPAGE_DESTINATIONS.map((destination) => ({
    ...destination,
    listings: uniqueListings(
      listings.filter((listing) => {
        const location = listing.loc.toLowerCase();
        return destination.searchTerms.some((term) => location.includes(term));
      }),
    ).slice(0, 10),
  })).filter((destination) => isLoading || destination.listings.length > 0);
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
      <FeaturedListings listings={featuredListings} isLoading={isLoading} />
      {destinationSections.map((destination) => (
        <DestinationListings
          key={destination.slug}
          label={destination.label}
          slug={destination.slug}
          listings={destination.listings}
          isLoading={isLoading}
        />
      ))}
      <PopularDestinations
        homes={homes}
        onView={(home) => router.push(`/apartments/${home.id}`)}
      />
      <WhyBookUs />
      <BookingProcess />
    </>
  );
}