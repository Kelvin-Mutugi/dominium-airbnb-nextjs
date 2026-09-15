"use client";

import Navbar from "@/components/navigationBar";
import HeroSection from "@/components/HeroSection";
import QuickRoutes from "@/components/QuickRoutes";
import FeaturedListings from "@/components/listings/Feartured/FeaturedListings";
import NairobiListings from "@/components/listings/Nairobi/Listings";
import MombasaListings from "@/components/listings/Mombasa/Listings";
import BookingProcess from "@/components/BookingProcess";
import PopularDestinations from "@/components/Populardestinations";
import type { Home } from "@/components/Populardestinations";
import WhyBookUs from "@/components/WhyBookUs";
import CountyDirectory from "@/components/Countydirectory";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ROUTES,
  type Amenity,
  type Listing,
} from "@/components/homeData";
import { supabase } from "@/app/lib/supabase/client";

const HOME_PAGE_SIZE = 8;

interface DatabaseListing {
  id: string;
  title: string;
  description: string;
  county: string;
  town: string;
  price_per_night: number | string;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: unknown;
  listing_images?: { url?: string | null; sort_order: number }[] | null;
}

function normalizeAmenities(value: unknown): Amenity[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowed = new Set<Amenity>(["wifi", "ac", "pool", "parking"]);

  return value.filter(
    (item): item is Amenity =>
      typeof item === "string" && allowed.has(item as Amenity),
  );
}

function normalizeListing(listing: DatabaseListing): Listing {
  const gallery = Array.isArray(listing.listing_images)
    ? [...listing.listing_images]
        .sort((first, second) => first.sort_order - second.sort_order)
        .map((imageRow) => imageRow.url)
        .filter((url): url is string => Boolean(url))
    : [];
  const amenities = normalizeAmenities(listing.amenities);
  const price = Number(listing.price_per_night ?? 0);
  const formattedPrice = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(price);
  const loc = [listing.town, listing.county].filter(Boolean).join(", ");

  return {
    id: String(listing.id),
    name: listing.title ?? "Untitled listing",
    loc: loc || "Location unavailable",
    price: formattedPrice || "Price on request",
    detail: `Max guests: ${listing.max_guests ?? 0}${amenities.length ? ` · ${amenities.slice(0, 2).join(" · ")}` : ""}`,
    img: gallery[0] ?? "",
    gallery,
    description: listing.description ?? "",
    maxGuests: listing.max_guests ?? 0,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    minNights: 1,
    pricePerNight: price,
    serviceFeePercent: 0.1,
    features: [
      ...(listing.bedrooms ? [`${listing.bedrooms} bedrooms`] : []),
      ...(listing.bathrooms ? [`${listing.bathrooms} bathrooms`] : []),
      ...amenities,
    ],
    host: "Host",
    rating: undefined,
    reviewCount: undefined,
    verified: true,
    rareFind: false,
    guests: listing.max_guests,
    beds: listing.bedrooms,
    baths: listing.bathrooms,
    amenities,
  };
}

async function fetchHomepageListings(from: number, to: number) {
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
        id, title, description, county, town, price_per_night,
        max_guests, bedrooms, bathrooms, amenities,
        listing_images ( url, sort_order )
      `,
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("sort_order", {
      foreignTable: "listing_images",
      ascending: true,
    })
    .range(from, to);

  if (error) throw error;
  return ((data ?? []) as DatabaseListing[]).map(normalizeListing);
}

export default function HomePage() {
  const router = useRouter();
  const [selectedRoute, setSelectedRoute] = useState<string>(ROUTES[0]);
  const [checkIn, setCheckIn] = useState<string>("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreListings, setHasMoreListings] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const featuredListings = listings.slice(0, 5);
  const nairobiListings = listings
    .filter((item) => item.loc.toLowerCase().includes("nairobi"))
    .slice(0, 5);
  const mombasaListings = listings
    .filter((item) => item.loc.toLowerCase().includes("mombasa"))
    .slice(0, 5);
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

  const scrollToListings = () => {
    document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    async function getListings() {
      try {
        const firstListings = await fetchHomepageListings(0, HOME_PAGE_SIZE - 1);
        setListings(firstListings);
        setHasMoreListings(firstListings.length === HOME_PAGE_SIZE);
      } catch (error) {
        console.error("Failed to load listings from Supabase:", error);
      } finally {
        setIsLoadingListings(false);
      }
    }

    void getListings();
  }, []);

  const loadMoreListings = useCallback(async () => {
    if (isLoadingMore || !hasMoreListings) return;

    setIsLoadingMore(true);
    try {
      const nextListings = await fetchHomepageListings(
        listings.length,
        listings.length + HOME_PAGE_SIZE - 1,
      );
      setListings((current) => [...current, ...nextListings]);
      setHasMoreListings(nextListings.length === HOME_PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load more homepage listings:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMoreListings, isLoadingMore, listings.length]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMoreListings || isLoadingListings) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMoreListings();
      },
      { rootMargin: "500px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreListings, isLoadingListings, loadMoreListings]);

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
      <CountyDirectory />
      <FeaturedListings listings={featuredListings} isLoading={isLoadingListings} />
      {/* <QuickRoutes /> */}
      <PopularDestinations
        homes={homes}
        onView={(home) => router.push(`/apartments/${home.id}`)}
      />
      <div ref={loadMoreRef} aria-hidden="true" className="h-px" />
      <NairobiListings
        listings={nairobiListings}
        isLoading={isLoadingListings || (isLoadingMore && nairobiListings.length === 0)}
      />
      <MombasaListings
        listings={mombasaListings}
        isLoading={isLoadingListings || (isLoadingMore && mombasaListings.length === 0)}
      />
      <WhyBookUs />
      <BookingProcess />
    </>
  );
}
