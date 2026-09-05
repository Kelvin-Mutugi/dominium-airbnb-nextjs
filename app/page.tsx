"use client";

import Navbar from "@/components/navigationBar";
import HeroSection from "@/components/HeroSection";
import QuickRoutes from "@/components/QuickRoutes";
import FeaturedListings from "@/components/FeaturedListings";
import BookingProcess from "@/components/BookingProcess";
import Footer from "@/components/footer";

import { useEffect, useState } from "react";
import {
  LISTINGS,
  ROUTES,
  type Amenity,
  type Listing,
} from "@/components/homeData";
import { supabase } from "@/app/lib/supabase";

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

function townFromRoute(route: string): string | null {
  if (route === "All towns") return null;
  const parts = route.split(" — ");
  return parts[1] ?? null;
}

export default function HomePage() {
  const [selectedRoute, setSelectedRoute] = useState<string>(ROUTES[0]);
  const [checkIn, setCheckIn] = useState<string>("");
  const [listings, setListings] = useState<Listing[]>(LISTINGS);

  const town = townFromRoute(selectedRoute);

  const filteredListings = town
    ? listings.filter((item) => item.loc.split(",")[0].trim() === town)
    : listings;

  const scrollToListings = () => {
    document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    async function getListings() {
      if (!supabase) return;

      const dbClient = supabase!;

      const { data, error } = await dbClient
        .from("listings")
        .select(
          `
            id,
            title,
            description,
            county,
            town,
            address,
            price_per_night,
            max_guests,
            bedrooms,
            bathrooms,
            amenities,
            listing_images ( url, sort_order )
          `,
        )
        .order("sort_order", {
          foreignTable: "listing_images",
          ascending: true,
        });

      if (error) {
        console.error("Failed to load listings from Supabase:", error);
        return;
      }

      if (data && data.length > 0) {
        const normalizedListings: Listing[] = data.map((listing) => {
          const gallery = Array.isArray(listing.listing_images)
            ? listing.listing_images
                .map((imageRow: { url?: string | null }) => imageRow?.url)
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
          const detail = `Sleeps ${listing.max_guests ?? 0}${amenities.length ? ` · ${amenities.slice(0, 2).join(" · ")}` : ""}`;

          return {
            id: String(listing.id),
            name: listing.title ?? "Untitled listing",
            loc: loc || "Location unavailable",
            price: formattedPrice || "Price on request",
            detail,
            img: gallery[0] ?? "",
            gallery: gallery,
            video: "",
            description: listing.description ?? "",
            features: [
              ...(listing.bedrooms ? [`${listing.bedrooms} bedrooms`] : []),
              ...(listing.bathrooms ? [`${listing.bathrooms} bathrooms`] : []),
              ...amenities,
            ],
            host: "Host",
            rating: undefined,
            reviewCount: undefined,
            verified: false,
            rareFind: false,
            guests:
              typeof listing.max_guests === "number"
                ? listing.max_guests
                : undefined,
            beds:
              typeof listing.bedrooms === "number"
                ? listing.bedrooms
                : undefined,
            baths:
              typeof listing.bathrooms === "number"
                ? listing.bathrooms
                : undefined,
            amenities,
          };
        });

        setListings(normalizedListings);
      }
    }

    getListings();
  }, []);

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
      <Footer />
    </>
  );
}
