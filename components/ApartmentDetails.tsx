import { useMemo, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Listing, RelatedListingSummary } from "./homeData";
import { Avatar } from "@/components/account/ui";
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
  relatedListings?: RelatedListingSummary[];
  onBack: () => void;
  onReserve?: (stayRange: { checkIn: Date; checkOut: Date }) => void;
  onSelectListing?: (listingId: string) => void;
}

export default function ApartmentDetails({
  listing,
  isLoading = false,
  relatedListings = [],
  onBack,
  onReserve,
  onSelectListing,
}: ApartmentDetailsProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [stayRange, setStayRange] = useState<{ checkIn: Date; checkOut: Date } | null>(
    null,
  );
  const [datePrompt, setDatePrompt] = useState(false);

  const nights = useMemo(() => {
    if (!stayRange) return 0;
    return Math.round(
      (stayRange.checkOut.getTime() - stayRange.checkIn.getTime()) / 86400000,
    );
  }, [stayRange]);

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white px-[4%] py-8" aria-label="Loading listing" role="status">
        <div className="mx-auto grid max-w-[1500px] gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="aspect-[4/3] animate-pulse rounded-xl bg-gray-200 md:aspect-[2/1]" />
          <div className="space-y-5 py-2">
            <div className="h-9 w-4/5 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-2/5 animate-pulse rounded bg-gray-200" />
            <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-8 w-1/2 animate-pulse rounded bg-gray-200" />
            <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </div>
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

  const gallery = listing.gallery.filter(Boolean);
  const hostName = listing.hostProfile?.displayName || listing.host || "Host";
  const staySubtotal = listing.pricePerNight * nights;
  const tripTotal = staySubtotal + Math.round(staySubtotal * listing.serviceFeePercent);
  const formatPrice = (amount: number) => `KES ${amount.toLocaleString("en-KE")}`;

  return (
    <div className="min-h-screen bg-[#FFFFFF] pb-24 text-[#1B1A2E] lg:pb-0">
      <div className="mx-auto w-full max-w-[1500px] px-[3%] py-6 md:px-[4%] md:py-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#3A3856] hover:text-[#1B1A2E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E23E85]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to listings
        </button>
        <div className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div>
              <div className="p-4 md:p-5">
                {gallery.length > 0 ? (
                  <div className="grid aspect-[4/3] grid-cols-2 grid-rows-[2fr_1fr] gap-2 overflow-hidden rounded-xl bg-[#F3F1EE] md:aspect-[2/1] md:grid-cols-4 md:grid-rows-2">
                    {gallery.slice(0, 5).map((image, index) => {
                      const isMobileGalleryAction = index === Math.min(gallery.length - 1, 2);
                      const isDesktopGalleryAction = index === gallery.length - 1;
                      return (
                        <button
                          key={`${listing.id}-photo-${index}`}
                          type="button"
                          onClick={() => setLightboxIndex(index)}
                          aria-label={`View photo ${index + 1} of ${gallery.length}`}
                          className={`group relative min-h-0 overflow-hidden bg-[#F3F1EE] focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E23E85] ${
                            index === 0
                              ? "col-span-2 row-span-1 md:row-span-2"
                              : index > 2
                                ? "hidden md:block"
                                : ""
                          }`}
                        >
                          <img
                            src={image}
                            alt={`${listing.name}, photo ${index + 1}`}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                          {gallery.length > 1 && (isMobileGalleryAction || isDesktopGalleryAction) && (
                            <span className={`absolute bottom-3 right-3 rounded-md bg-white/95 px-3 py-2 text-xs font-semibold text-[#12231d] shadow-sm ${isMobileGalleryAction ? "md:hidden" : "hidden md:inline-flex"}`}>
                              View all {gallery.length} photos
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[#F3F1EE] text-sm text-gray-500 md:aspect-[2/1]">
                    Photos are not available for this listing.
                  </div>
                )}
              </div>

              <section className="mt-10 rounded-[24px] bg-white p-6 shadow-[0_2px_50px_rgba(0,0,0,0.08)]">
                <h2 className="mb-5 text-[28px] font-semibold text-[#1B1A2E]">
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
                <h1 className="font-semibold text-[clamp(28px,4vw,44px)] leading-none">
                  {listing.name}
                </h1>

                <div className="mt-3 flex items-center gap-2 text-[15px] text-[#3A3856]">
                  <MapPin size={18} className="text-[#1B1A2E]" />
                  {listing.loc}
                </div>

                {Boolean(listing.reviewCount) && (
                  <a href="#listing-reviews" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#3A3856] underline decoration-[#3A3856]/30 underline-offset-4 hover:decoration-[#3A3856]">
                    <Star size={15} fill="currentColor" aria-hidden="true" />
                    {Number(listing.rating ?? 0).toFixed(1)} · {listing.reviewCount} guest reviews
                  </a>
                )}

                <section className="mt-5 flex items-start gap-3 border-y border-[#EDEBE4] py-4" aria-label="Host information">
                  <Avatar name={hostName} url={listing.hostProfile?.avatarUrl} />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1B1A2E]">Hosted by {hostName}</p>
                    {listing.hostProfile?.verified ? (
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                        <ShieldCheck size={14} aria-hidden="true" /> Identity verified
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-[#3A3856]/70">Host on Dominium</p>
                    )}
                    {listing.hostProfile?.bio && (
                      <p className="mt-2 line-clamp-3 text-sm leading-5 text-[#3A3856]">{listing.hostProfile.bio}</p>
                    )}
                  </div>
                </section>

                <StayDetails listing={listing} />
              </div>

              <section className="mt-7 rounded-xl border border-[#EDEBE4] bg-white p-5" aria-label="Check availability and price">
                <div className="mb-3 text-[12px] font-semibold uppercase tracking-[1px] text-[#3A3856]/70">
                  Price and availability
                </div>
                <div className="text-[28px] font-bold text-[#1B1A2E]">
                  {formatPrice(listing.pricePerNight)} <span className="text-sm font-normal text-[#3A3856]">/ night</span>
                </div>

                {listing.cancelationPolicy && (
                  <p className="mt-2 line-clamp-3 text-sm leading-5 text-[#3A3856]">
                    <span className="font-semibold text-[#1B1A2E]">Cancellation: </span>
                    {listing.cancelationPolicy}
                  </p>
                )}

                <div className="mt-4">
                  <AvailabilityCalendar
                    prompt={datePrompt}
                    bookedDateRanges={listing.bookedDateRanges}
                    availabilityUnavailable={listing.availabilityUnavailable}
                    minNights={listing.minNights}
                    onDateRangeSelect={(checkIn, checkOut) => {
                      setStayRange({ checkIn, checkOut });
                      setDatePrompt(false);
                    }}
                  />
                </div>

                <PriceBreakdown
                  pricePerNight={listing.pricePerNight}
                  nights={nights}
                  serviceFeePercent={listing.serviceFeePercent}
                />
                {nights === 0 && (
                  <p className="mt-3 text-xs text-[#3A3856]/70">Choose dates to see the service fee and trip total before continuing.</p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (stayRange && onReserve) {
                      onReserve(stayRange);
                      return;
                    }

                    setDatePrompt(true);
                    const calendar = document.getElementById("availability-calendar");
                    calendar?.scrollIntoView({ behavior: "smooth", block: "center" });
                    calendar?.focus({ preventScroll: true });
                  }}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1B1A2E] px-5 py-3 font-semibold text-white no-underline transition hover:cursor-pointer hover:bg-[#302f48] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E23E85] focus-visible:ring-offset-2"
                >
                  {stayRange ? "Continue to booking" : "Check availability"}
                </button>
              </section>

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

      {lightboxIndex !== null && gallery.length > 0 && (
        <PhotoLightbox
          images={gallery}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <StickyPriceBar
        price={formatPrice(listing.pricePerNight)}
        total={formatPrice(tripTotal)}
        nights={nights}
        hasSelectedDates={Boolean(stayRange)}
        onReserve={() => {
          if (stayRange && onReserve) {
            onReserve(stayRange);
            return;
          }
          setDatePrompt(true);
          const calendar = document.getElementById("availability-calendar");
          calendar?.scrollIntoView({ behavior: "smooth", block: "center" });
          calendar?.focus({ preventScroll: true });
        }}
      />
    </div>
  );
}