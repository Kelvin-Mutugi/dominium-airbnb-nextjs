"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ApartmentDetails from "@/components/ApartmentDetails";
import Navbar from "@/components/navigationBar";
import type { Listing, RelatedListingSummary } from "@/components/homeData";
import type { PublicListingDetail } from "@/app/lib/public-listings";
import { normalizeListingAdditionalCharges } from "@/app/lib/listing-charges";

function normalizeAmenities(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export default function ApartmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCheckIn = searchParams.get("checkIn") ?? "";
  const initialCheckOut = searchParams.get("checkOut") ?? "";
  const requestedGuests = Math.max(1, Number(searchParams.get("guests") ?? 1) || 1);
  const initialChildren = Math.max(0, Math.min(requestedGuests - 1, Number(searchParams.get("children") ?? 0) || 0));
  const initialGuests = requestedGuests;
  const initialPets = Math.max(0, Math.min(10, Number(searchParams.get("pets") ?? 0) || 0));
  const initialBookingId = searchParams.get("bookingId") ?? undefined;
  const [listing, setListing] = useState<Listing | null>(null);
  const [relatedListings, setRelatedListings] = useState<RelatedListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadListing() {
      let data: PublicListingDetail | null;
      try {
        const response = await fetch(`/api/listings/${encodeURIComponent(params.id)}`);
        if (!response.ok) throw new Error(`Listing detail request returned ${response.status}.`);
        data = (await response.json()) as PublicListingDetail;
      } catch (error) {
        console.error("Failed to load listing details:", error);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setIsLoading(false);
        return;
      }

      const [availabilityResult, publishedReviews, publicDetails] = await Promise.all([
        (async () => {
          try {
            const response = await fetch(`/api/listings/${params.id}/availability`, { cache: "no-store" });
            if (!response.ok) throw new Error(`Availability request returned ${response.status}.`);
            const payload = (await response.json()) as { ranges?: Listing["bookedDateRanges"] };
            return { ranges: payload.ranges ?? [], unavailable: false };
          } catch (availabilityError) {
            console.error("Failed to load listing availability:", availabilityError);
            return { ranges: [], unavailable: true };
          }
        })(),
        (async () => {
          try {
            const response = await fetch(`/api/listings/${params.id}/reviews`);
            if (!response.ok) throw new Error(`Reviews request returned ${response.status}.`);
            const payload = (await response.json()) as { reviews?: Listing["reviews"] };
            return payload.reviews ?? [];
          } catch (reviewsError) {
            console.error("Failed to load listing reviews:", reviewsError);
            return [];
          }
        })(),
        (async () => {
          try {
            const response = await fetch(`/api/listings/${params.id}/public-details`);
            if (!response.ok) throw new Error(`Public listing details returned ${response.status}.`);
            return (await response.json()) as {
              host?: Listing["hostProfile"];
              relatedListings?: Array<{ id: string; name: string; location: string; pricePerNight: number; imageUrl: string }>;
            };
          } catch (publicDetailsError) {
            console.error("Failed to load public host and nearby listing details:", publicDetailsError);
            return {};
          }
        })(),
      ]);

      const bookedDateRanges = availabilityResult.ranges;
      const availabilityUnavailable = availabilityResult.unavailable;
      const hostProfile = publicDetails.host;
      const relatedListings: RelatedListingSummary[] = (publicDetails.relatedListings ?? []).map((related) => ({
        id: related.id,
        name: related.name,
        location: related.location,
        price: new Intl.NumberFormat("en-KE", {
          style: "currency",
          currency: "KES",
          maximumFractionDigits: 0,
        }).format(related.pricePerNight),
        gallery: related.imageUrl ? [related.imageUrl] : [],
      }));
      setRelatedListings(relatedListings);

      const gallery = Array.isArray(data.listing_images)
        ? [...data.listing_images]
            .sort((first, second) => first.sort_order - second.sort_order)
            .map((image) => image.url)
            .filter((url): url is string => Boolean(url))
        : [];
      const price = Number(data.price_per_night);

      setListing({
        id: String(data.id),
        name: data.title,
        loc: [data.town, data.county].filter(Boolean).join(", "),
        propertyType: data.property_type ?? undefined,
        additionalCharges: normalizeListingAdditionalCharges(data.additional_charges),
        price: new Intl.NumberFormat("en-KE", {
          style: "currency",
          currency: "KES",
          maximumFractionDigits: 0,
        }).format(price),
        detail: `Max guests: ${data.max_guests}`,
        img: gallery[0] ?? "",
        gallery,
        description: data.description ?? "",
        features: normalizeAmenities(data.features),
        host: hostProfile?.displayName ?? "Host",
        hostProfile,
        bookingTerms: data.booking_terms ?? undefined,
        cancelationPolicy: data.cancellation_policy ?? undefined,
        houserules: normalizeAmenities(data.house_rules),
        refundPolicy: data.refund_policy ?? undefined,
        maxGuests: data.max_guests,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        checkInTime: data.check_in_time ?? "2:00 PM",
        checkOutTime: data.check_out_time ?? "11:00 AM",
        minNights: data.min_nights ?? 1,
        pricePerNight: price,
        serviceFeePercent: 0,
        serviceFeePerNight: data.platform_fee_per_night == null ? undefined : Number(data.platform_fee_per_night),
        latitude: data.latitude == null ? undefined : Number(data.latitude),
        longitude: data.longitude == null ? undefined : Number(data.longitude),
        rating: Number(data.average_rating ?? 0),
        reviewCount: Number(data.review_count ?? publishedReviews.length),
        reviews: publishedReviews,
        verified: Boolean(hostProfile?.verified),
        rareFind: Boolean(data.is_rare_find),
        rareFindNote: data.rare_find_note ?? undefined,
        guests: data.max_guests,
        beds: data.bedrooms,
        baths: data.bathrooms,
        amenities: normalizeAmenities(data.amenities),
        bookedDateRanges,
        availabilityUnavailable,
      });
      setIsLoading(false);
    }

    void loadListing();
  }, [params.id]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <ApartmentDetails key={`loading:${params.id}`} listing={null} isLoading onBack={() => router.push("/")} />
      </>
    );
  }

  if (!listing) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8F7F4] px-6 text-center text-[#1B1A2E]">
          <h1 className="font-display text-4xl">Listing not found</h1>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-lg bg-[#128C7E] px-5 py-3 font-semibold text-white"
          >
            Back home
          </button>
        </div>
      </>
    );
  }

  const handleReserve = ({ checkIn, checkOut, guests, children, pets, bookingId }: { checkIn: Date; checkOut: Date; guests: number; children: number; pets: number; bookingId?: string }) => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    router.push(
      `/booking/${listing.id}?${new URLSearchParams({ checkIn: formatDate(checkIn), checkOut: formatDate(checkOut), guests: String(guests), children: String(children), pets: String(pets), ...(bookingId ? { bookingId } : {}) }).toString()}`,
    );
  };

  return (
    <>
      <Navbar />
      <ApartmentDetails
        key={`${listing.id}:${initialCheckIn}:${initialCheckOut}:${initialGuests}:${initialChildren}:${initialPets}:${initialBookingId ?? ""}`}
        listing={listing}
        initialCheckIn={initialCheckIn}
        initialCheckOut={initialCheckOut}
        initialGuests={initialGuests}
        initialChildren={initialChildren}
        initialPets={initialPets}
        initialBookingId={initialBookingId}
        onReserve={handleReserve}
        relatedListings={relatedListings}
        onBack={() => router.push("/")}
        onSelectListing={(listingId) => router.push(`/apartments/${listingId}`)}
      />
    </>
  );
}
