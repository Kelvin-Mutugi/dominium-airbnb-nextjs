import { useMemo, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Listing } from "./homeData";
import AmenitiesGrid from "./appartmentDetails/amenities";
import { ListingPolicies } from "./appartmentDetails/ListingPolicies";
import { StayDetails } from "./appartmentDetails/StayDetails";
import { AvailabilityCalendar } from "./appartmentDetails/AvailabilityCalendar";
import { PriceBreakdown } from "./appartmentDetails/PriceBreakdown";
import { ReviewsSection } from "./appartmentDetails/ReviewsSection";
import { LocationMap } from "./appartmentDetails/LocationMap";
import { PhotoLightbox } from "./appartmentDetails/PhotoLightbox";
import { StickyPriceBar } from "./appartmentDetails/StickyPriceBar";
import { RelatedListings } from "./appartmentDetails/RelatedListings";

interface ApartmentDetailsProps {
  listing: Listing | null;
  isLoading?: boolean;
  relatedListings?: Listing[];
  onBack: () => void;
  onSelectListing?: (listing: Listing) => void;
}

export default function ApartmentDetails({
  listing,
  isLoading = false,
  relatedListings = [],
  onBack,
  onSelectListing,
}: ApartmentDetailsProps) {
  const [selectedImage, setSelectedImage] = useState<string>(
    listing?.gallery[0] ?? "",
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [stayRange, setStayRange] = useState<{ checkIn: Date; checkOut: Date } | null>(
    null,
  );

  const nights = useMemo(() => {
    if (!stayRange) return 0;
    return Math.round(
      (stayRange.checkOut.getTime() - stayRange.checkIn.getTime()) / 86400000,
    );
  }, [stayRange]);

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[15px] text-[#3A3856]">Loading listing...</p>
      </div>
    );
  }

  // --- Not-found state ---
  if (!listing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-[18px] font-semibold text-[#1B1A2E]">
          This listing isn&apos;t available anymore
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] pb-24 text-[#1B1A2E] lg:pb-0">
      <div className="mx-auto w-full max-w-[1500px] px-[3%] py-6 md:px-[4%] md:py-8">
        <div className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div>
              <div className="p-4 md:p-5">
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex(listing.gallery.indexOf(selectedImage))
                  }
                  className="block w-full overflow-hidden bg-[#F3F1EE]"
                >
                  <img
                    src={selectedImage}
                    alt={listing.name}
                    className="h-[430px] w-full object-cover md:h-[560px] lg:h-[640px]"
                  />
                </button>

                <div className="mt-4 grid grid-cols-4 gap-3">
                  {listing.gallery.map((image, index) => (
                    <button
                      key={`${listing.id}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(image)}
                      className={`overflow-hidden rounded-xl border-2 ${
                        selectedImage === image
                          ? "border-[#E89A1C]"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${listing.name} view ${index + 1}`}
                        className="h-[90px] w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <section className="mt-10 rounded-[24px] bg-white p-6 shadow-[0_2px_50px_rgba(0,0,0,0.08)]">
                <h2 className="mb-5 font-['Anton',sans-serif] text-[28px] font-normal">
                  About this place
                </h2>

                <AmenitiesGrid listing={listing} />
                <ListingPolicies listing={listing} />

                <p className="text-[16px] leading-7 text-[#3A3856]">
                  {listing.description}
                </p>

                <ReviewsSection
                  rating={listing.rating}
                  reviewCount={listing.reviewCount}
                  reviews={listing.reviews}
                />

                <LocationMap
                  latitude={listing.latitude}
                  longitude={listing.longitude}
                  loc={listing.loc}
                />
              </section>
            </div>

            <div className="flex flex-col p-6 md:p-8">
              <div>
                <h1 className="font-['Anton',sans-serif] text-[clamp(28px,4vw,44px)] leading-none">
                  {listing.name}
                </h1>

                <div className="mt-6 flex items-center gap-2 text-[15px] text-[#3A3856]">
                  <MapPin size={18} className="text-[#1B1A2E]" />
                  {listing.loc}
                </div>

                <div className="mt-3 flex items-center gap-2 text-[15px] text-[#3A3856]">
                  <ShieldCheck size={18} className="text-[#1B1A2E]" />
                  {listing.host}
                </div>

                <StayDetails listing={listing} />

                <p className="mt-5 text-[16px] leading-7 text-[#3A3856]">
                  {listing.description}
                </p>
              </div>

              <div className="mt-8 rounded-[20px] shadow-[0_2px_50px_rgba(0,0,0,0.08)] p-5">
                <div className="mb-3 text-[12px] font-semibold uppercase tracking-[1px] text-[#3A3856]/70">
                  Price
                </div>
                <div className="text-[28px] font-bold text-[#1B1A2E]">
                  {listing.price}
                </div>

                {listing.cancellationDeadline && (
                  <p className="mt-2 text-[13px] text-[#3A3856]">
                    Free cancellation before{" "}
                    {new Date(listing.cancellationDeadline).toLocaleDateString()}
                  </p>
                )}

                <div className="mt-4">
                  <AvailabilityCalendar
                    bookedDateRanges={listing.bookedDateRanges}
                    minNights={listing.minNights}
                    onDateRangeSelect={(checkIn, checkOut) =>
                      setStayRange({ checkIn, checkOut })
                    }
                  />
                </div>

                <PriceBreakdown
                  pricePerNight={listing.pricePerNight}
                  nights={nights}
                  serviceFeePercent={listing.serviceFeePercent}
                />

                <a
                  href="#contact"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B1A2E] px-5 py-3 font-semibold text-white no-underline"
                >
                  Reserve
                </a>
              </div>

              {onSelectListing && (
                <RelatedListings
                  listings={relatedListings}
                  onSelect={onSelectListing}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          images={listing.gallery}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <StickyPriceBar
        price={listing.price}
        onReserve={() => document.getElementById("contact")?.scrollIntoView()}
      />
    </div>
  );
}