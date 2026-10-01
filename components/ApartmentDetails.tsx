import { useMemo, useState } from "react";
import { ArrowLeft, MapPin, Share2, ShieldCheck, Star } from "lucide-react";
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
import SaveListingButton from "@/components/listings/SaveListingButton";
import { calculateBookingPrice } from "@/app/lib/booking/pricing";

function parseCalendarDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
    ? parsed
    : null;
}

interface ApartmentDetailsProps {
  listing: Listing | null;
  isLoading?: boolean;
  relatedListings?: RelatedListingSummary[];
  onBack: () => void;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  initialChildren?: number;
  initialPets?: number;
  initialBookingId?: string;
  onReserve?: (stayRange: {
    checkIn: Date;
    checkOut: Date;
    guests: number;
    children: number;
    pets: number;
    bookingId?: string;
  }) => void;
  onSelectListing?: (listingId: string) => void;
}

export default function ApartmentDetails({
  listing,
  isLoading = false,
  relatedListings = [],
  onBack,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
  initialChildren = 0,
  initialPets = 0,
  initialBookingId,
  onReserve,
  onSelectListing,
}: ApartmentDetailsProps) {
  const guestCapacity = Math.max(1, listing?.maxGuests ?? initialGuests);
  const safeInitialChildren = Math.max(
    0,
    Math.min(initialChildren, guestCapacity - 1, initialGuests - 1),
  );
  const safeInitialAdults = Math.max(
    1,
    Math.min(
      initialGuests - safeInitialChildren,
      guestCapacity - safeInitialChildren,
    ),
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [stayRange, setStayRange] = useState<{
    checkIn: Date;
    checkOut: Date;
  } | null>(() => {
    const checkIn = parseCalendarDate(initialCheckIn);
    const checkOut = parseCalendarDate(initialCheckOut);
    return checkIn && checkOut && checkOut > checkIn
      ? { checkIn, checkOut }
      : null;
  });
  const [adultCount, setAdultCount] = useState(safeInitialAdults);
  const [childCount, setChildCount] = useState(safeInitialChildren);
  const [petCount, setPetCount] = useState(
    Math.max(0, Math.min(initialPets, 10)),
  );
  const [datePrompt, setDatePrompt] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  async function shareListing() {
    const shareData = {
      title: listing?.name ?? "Stay on Dominium",
      text: listing
        ? `Take a look at ${listing.name} on Dominium.`
        : "Take a look at this stay on Dominium.",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage("");
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      setShareMessage("Link copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(shareData.url);
        setShareMessage("Link copied");
      } catch {
        setShareMessage("Unable to share this link");
      }
    }
  }

  const nights = useMemo(() => {
    if (!stayRange) return 0;
    return Math.round(
      (stayRange.checkOut.getTime() - stayRange.checkIn.getTime()) / 86400000,
    );
  }, [stayRange]);
  const guestCount = adultCount + childCount;

  // --- Loading state ---
  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-white px-[4%] py-8"
        aria-label="Loading listing"
        role="status"
      >
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
  const hostBio = listing.hostProfile?.bio?.trim();
  const bookingPrice = calculateBookingPrice({
    nightlyRate: listing.pricePerNight,
    platformFeePerNight: listing.serviceFeePerNight ?? 0,
    additionalCharges: listing.additionalCharges ?? [],
    nights,
  });
  const tripTotal = bookingPrice.total;
  const formatPrice = (amount: number) =>
    `KES ${amount.toLocaleString("en-KE")}`;
  const dateLabel = stayRange
    ? `${stayRange.checkIn.toLocaleDateString("en-KE", { day: "numeric", month: "short" })} – ${stayRange.checkOut.toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`
    : undefined;

  return (
    <div className="min-h-screen bg-[#FFFFFF] pb-24 text-[#1B1A2E] lg:pb-0">
      <div className="mx-auto w-full max-w-[1500px] px-[3%] py-6 md:px-[4%] md:py-8">
        {/* <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#3A3856] hover:text-[#1B1A2E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E23E85]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to listings
        </button> */}
        <div className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="contents lg:col-start-1 lg:flex lg:flex-col">
            <div className="order-1 lg:order-1">
              <div className="p-4 md:p-5">
                {gallery.length > 0 ? (
                  <div className="grid aspect-[4/3] grid-cols-2 grid-rows-[2fr_1fr] gap-2 overflow-hidden rounded-xl bg-[#F3F1EE] md:aspect-[2/1] md:grid-cols-4 md:grid-rows-2">
                    {gallery.slice(0, 5).map((image, index) => {
                      const isMobileGalleryAction =
                        index === Math.min(gallery.length - 1, 2);
                      const isDesktopGalleryAction =
                        index === gallery.length - 1;
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
                          {gallery.length > 1 &&
                            (isMobileGalleryAction ||
                              isDesktopGalleryAction) && (
                              <span
                                className={`absolute bottom-3 right-3 rounded-md bg-white/95 px-3 py-2 text-xs font-semibold text-[#12231d] shadow-sm ${isMobileGalleryAction ? "md:hidden" : "hidden md:inline-flex"}`}
                              >
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
            </div>

            <div className="order-3 lg:order-3">
              <section className="mt-6 rounded-[24px] bg-white p-6 shadow-[0_2px_50px_rgba(0,0,0,0.08)] md:mt-10">
                <h2 className="mb-4 text-[28px] font-semibold text-[#1B1A2E] md:mb-5">
                  About this place
                </h2>

                <AmenitiesGrid listing={listing} />

                <p className="text-[15px] leading-6 text-[#3A3856]/85 lg:text-[16px] lg:leading-7 lg:text-[#3A3856]">
                  {listing.description}
                </p>

                <ListingPolicies listing={listing} />

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
            </div>

            <div className="contents lg:col-start-2 lg:flex lg:flex-col">
            <div className="order-2 flex flex-col p-4 pt-3 md:p-8 lg:order-2 lg:pb-0">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 font-semibold text-[clamp(24px,6vw,35px)] leading-none">
                    {listing.name}
                  </h3>
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <SaveListingButton
                      listingId={listing.id}
                      showLabel
                      labelClassName="hidden sm:inline"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#E9E6DD] bg-white px-2 py-2 text-sm font-semibold text-[#1B1A2E] shadow-sm transition hover:border-[#E23E85] hover:text-[#E23E85] disabled:opacity-60 sm:h-auto sm:w-auto sm:justify-start sm:rounded-md sm:px-3"
                    />
                    <button
                      type="button"
                      onClick={() => void shareListing()}
                      aria-label="Share this listing"
                      className="inline-flex min-h-10 w-10 items-center justify-center gap-2 rounded-full border border-[#E9E6DD] bg-white px-2 py-2 text-sm font-semibold text-[#1B1A2E] transition hover:border-[#E23E85] hover:text-[#E23E85] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85] sm:w-auto sm:justify-start sm:rounded-md sm:px-3"
                    >
                      <Share2 size={16} aria-hidden="true" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  </div>
                </div>
                {shareMessage && (
                  <p role="status" className="mt-2 text-xs text-[#3A3856]">
                    {shareMessage}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-2 text-[15px] text-[#3A3856]/80 md:mt-3 lg:text-[#3A3856]">
                  <MapPin size={18} className="text-[#1B1A2E]" />
                  {listing.loc}
                </div>
                {listing.propertyType && (
                  <p className="mt-1 text-sm text-[#3A3856]/80 md:mt-2 lg:text-[#3A3856]">
                    {listing.propertyType}
                  </p>
                )}

                {Boolean(listing.reviewCount) && (
                  <a
                    href="#listing-reviews"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#3A3856] underline decoration-[#3A3856]/30 underline-offset-4 hover:decoration-[#3A3856] md:mt-3"
                  >
                    <Star size={15} fill="currentColor" aria-hidden="true" />
                    {Number(listing.rating ?? 0).toFixed(1)} ·{" "}
                    {listing.reviewCount} guest reviews
                  </a>
                )}

                <section
                  className="mt-4 flex items-start gap-3 border-y border-[#EDEBE4] py-3 md:mt-5 md:py-4"
                  aria-label="Host information"
                >
                  <Avatar
                    name={hostName}
                    url={listing.hostProfile?.avatarUrl}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1B1A2E]">
                      Hosted by {hostName}
                    </p>
                    {listing.hostProfile?.verified ? (
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                        <ShieldCheck size={14} aria-hidden="true" /> Identity
                        verified
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-[#3A3856]/70">
                        Host on Dominium
                      </p>
                    )}
                    {hostBio && hostBio !== "Verified Dominium accommodation host." && (
                      <p className="mt-2 line-clamp-3 text-sm leading-5 text-[#3A3856]/80 lg:text-[#3A3856]">
                        {hostBio}
                      </p>
                    )}
                  </div>
                </section>

                <StayDetails listing={listing} />
              </div>

              <section
                className="mt-7 rounded-xl bg-white p-5 shadow-[0_4px_24px_rgba(31,41,55,0.09)]"
                aria-label="Check availability and price"
              >
                {/* <div className="mb-3 text-[12px] font-semibold uppercase tracking-[1px] text-[#3A3856]/70">
                  Price and availability
                </div> */}
                {listing.cancelationPolicy && (
                  <p className="line-clamp-3 text-sm leading-5 text-[#3A3856]/80 lg:text-[#3A3856]">
                    <span className="font-semibold text-[#1B1A2E]">
                      Cancellation:{" "}
                    </span>
                    {listing.cancelationPolicy}
                  </p>
                )}

                <div className="mt-4">
                  <div className="mb-3 grid grid-cols-3 gap-2 sm:mb-4 sm:gap-3">
                    <label
                      htmlFor="listing-adult-count"
                      className="block text-sm font-medium text-[#3A3856]"
                    >
                      Adults
                      <select
                        id="listing-adult-count"
                        value={adultCount}
                        onChange={(event) =>
                          setAdultCount(Number(event.target.value))
                        }
                        className="mt-1 block min-h-11 w-full rounded-md border border-[#D8D6CE] bg-white px-3 text-base text-[#1B1A2E]"
                      >
                        {Array.from(
                          {
                            length: Math.max(1, listing.maxGuests - childCount),
                          },
                          (_, index) => index + 1,
                        ).map((count) => (
                          <option key={count} value={count}>
                            {count}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label
                      htmlFor="listing-child-count"
                      className="block text-sm font-medium text-[#3A3856]"
                    >
                      Kids
                      <select
                        id="listing-child-count"
                        value={childCount}
                        onChange={(event) =>
                          setChildCount(Number(event.target.value))
                        }
                        className="mt-1 block min-h-11 w-full rounded-md border border-[#D8D6CE] bg-white px-3 text-base text-[#1B1A2E]"
                      >
                        {Array.from(
                          {
                            length:
                              Math.max(0, listing.maxGuests - adultCount) + 1,
                          },
                          (_, index) => index,
                        ).map((count) => (
                          <option key={count} value={count}>
                            {count}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label
                      htmlFor="listing-pet-count"
                      className="block text-sm font-medium text-[#3A3856]"
                    >
                      Pets
                      <select
                        id="listing-pet-count"
                        value={petCount}
                        onChange={(event) =>
                          setPetCount(Number(event.target.value))
                        }
                        className="mt-1 block min-h-11 w-full rounded-md border border-[#D8D6CE] bg-white px-3 text-base text-[#1B1A2E]"
                      >
                        {Array.from({ length: 11 }, (_, count) => count).map(
                          (count) => (
                            <option key={count} value={count}>
                              {count}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                  <AvailabilityCalendar
                    prompt={datePrompt}
                    bookedDateRanges={listing.bookedDateRanges}
                    availabilityUnavailable={listing.availabilityUnavailable}
                    minNights={listing.minNights}
                    initialCheckIn={initialCheckIn}
                    initialCheckOut={initialCheckOut}
                    onDateSelectionStart={() => setStayRange(null)}
                    onDatesClear={() => {
                      setStayRange(null);
                      setDatePrompt(false);
                    }}
                    onDateRangeSelect={(checkIn, checkOut) => {
                      setStayRange({ checkIn, checkOut });
                      setDatePrompt(false);
                    }}
                  />
                </div>

                <PriceBreakdown price={bookingPrice} />
                {nights === 0 && (
                  <p className="mt-3 text-xs text-[#3A3856]/70">
                    Choose dates to see the service fee and trip total before
                    continuing.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (stayRange && onReserve) {
                      onReserve({
                        ...stayRange,
                        guests: guestCount,
                        children: childCount,
                        pets: petCount,
                        bookingId: initialBookingId,
                      });
                      return;
                    }

                    setDatePrompt(true);
                    document.getElementById("check-in-date-trigger")?.click();
                    const calendar = document.getElementById(
                      "availability-calendar",
                    );
                    calendar?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                    calendar?.focus({ preventScroll: true });
                  }}
                  className="mt-5 hidden min-h-11 w-full items-center justify-center gap-2 rounded-4xl bg-[#d61a6b] px-5 py-3 font-semibold text-white no-underline transition cursor-pointer hover:bg-[#db1a6d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E23E85] focus-visible:ring-offset-2 lg:inline-flex"
                >
                  {stayRange ? "Reserve" : "Check availability"}
                </button>
              </section>
            </div>

            {onSelectListing && (
              <div className="order-4 mt-6 md:mt-8 lg:mt-0 lg:ml-8">
                <RelatedListings
                  listings={relatedListings}
                  onSelect={onSelectListing}
                />
              </div>
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
        dateLabel={dateLabel}
        guests={guestCount}
        kids={childCount}
        pets={petCount}
        hasSelectedDates={Boolean(stayRange)}
        onReserve={() => {
          if (stayRange && onReserve) {
            onReserve({
              ...stayRange,
              guests: guestCount,
              children: childCount,
              pets: petCount,
              bookingId: initialBookingId,
            });
            return;
          }
          setDatePrompt(true);
          document.getElementById("check-in-date-trigger")?.click();
          const calendar = document.getElementById("availability-calendar");
          calendar?.scrollIntoView({ behavior: "smooth", block: "center" });
          calendar?.focus({ preventScroll: true });
        }}
      />
    </div>
  );
}
