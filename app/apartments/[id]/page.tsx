"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ApartmentDetails from "@/components/ApartmentDetails";
import Navbar from "@/components/navigationBar";
import type { Listing, RelatedListingSummary } from "@/components/homeData";
import { supabase } from "@/app/lib/supabase/client";

function normalizeAmenities(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export default function ApartmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [relatedListings, setRelatedListings] = useState<RelatedListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadListing() {
      const { data, error } = await supabase
        .from("listings")
        .select(
          `
            id,
            title,
            description,
            county,
            town,
            price_per_night,
            max_guests,
            bedrooms,
            bathrooms,
            amenities,
            features,
            house_rules,
            booking_terms,
            cancellation_policy,
            refund_policy,
            latitude,
            longitude,
            check_in_time,
            check_out_time,
            min_nights,
            service_fee_percent,
            is_rare_find,
            rare_find_note,
            average_rating,
            review_count,
            listing_images ( url, sort_order )
          `,
        )
        .eq("id", params.id)
        .eq("status", "published")
        .order("sort_order", {
          foreignTable: "listing_images",
          ascending: true,
        })
        .maybeSingle();

      if (error) {
        console.error("Failed to load listing from Supabase:", error);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setIsLoading(false);
        return;
      }

      let bookedDateRanges: NonNullable<Listing["bookedDateRanges"]> = [];
      let availabilityUnavailable = false;
      try {
        const availabilityResponse = await fetch(`/api/listings/${params.id}/availability`, { cache: "no-store" });
        if (!availabilityResponse.ok) throw new Error("Availability lookup failed.");
        const availabilityPayload = (await availabilityResponse.json()) as { ranges?: Listing["bookedDateRanges"] };
        bookedDateRanges = availabilityPayload.ranges ?? [];
      } catch (availabilityError) {
        console.error("Failed to load listing availability:", availabilityError);
        availabilityUnavailable = true;
      }

      let publishedReviews: Listing["reviews"] = [];
      try {
        const response = await fetch(`/api/listings/${params.id}/reviews`, { cache: "no-store" });
        if (response.ok) {
          const reviewPayload = (await response.json()) as { reviews?: Listing["reviews"] };
          publishedReviews = reviewPayload.reviews ?? [];
        } else {
          console.error("Failed to load listing reviews:", response.status);
        }
      } catch (reviewsError) {
        console.error("Failed to load listing reviews:", reviewsError);
      }

      let hostProfile: Listing["hostProfile"];
      let relatedListings: RelatedListingSummary[] = [];
      try {
        const response = await fetch(`/api/listings/${params.id}/public-details`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Public listing details returned ${response.status}.`);
        const publicDetails = (await response.json()) as {
          host?: Listing["hostProfile"];
          relatedListings?: Array<{ id: string; name: string; location: string; pricePerNight: number; imageUrl: string }>;
        };
        hostProfile = publicDetails.host;
        relatedListings = (publicDetails.relatedListings ?? []).map((related) => ({
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
      } catch (publicDetailsError) {
        console.error("Failed to load public host and nearby listing details:", publicDetailsError);
      }
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
        price: new Intl.NumberFormat("en-KE", {
          style: "currency",
          currency: "KES",
          maximumFractionDigits: 0,
        }).format(price),
        detail: `Max guests: ${data.max_guests}`,
        img: gallery[0] ?? "",
        gallery,
        description: data.description,
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
        checkInTime: data.check_in_time,
        checkOutTime: data.check_out_time,
        minNights: data.min_nights,
        pricePerNight: price,
        serviceFeePercent: Number(data.service_fee_percent),
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
        <ApartmentDetails listing={null} isLoading onBack={() => router.push("/")} />
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

  const handleReserve = ({ checkIn, checkOut }: { checkIn: Date; checkOut: Date }) => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    router.push(
      `/booking/${listing.id}?checkIn=${formatDate(checkIn)}&checkOut=${formatDate(checkOut)}`,
    );
  };

  return (
    <>
      <Navbar />
      <ApartmentDetails
        listing={listing}
        onReserve={handleReserve}
        relatedListings={relatedListings}
        onBack={() => router.push("/")}
        onSelectListing={(listingId) => router.push(`/apartments/${listingId}`)}
      />
    </>
  );
}
