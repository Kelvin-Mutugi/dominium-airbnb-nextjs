"use client";

import Image from "next/image";
import Link from "next/link";
import { unsplashCardImageLoader } from "./unsplash-image-loader";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import {
  CarFront,
  Heart,
  Snowflake,
  Sparkles,
  Star,
  Waves,
  Wifi,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase/client";
import ListingPhotoCarousel from "@/components/listings/ListingPhotoCarousel";
import { LISTINGS, type Amenity, type Listing } from "./homeData";

function normalizeAmenities(value: unknown): Amenity[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatRating(rating?: number) {
  if (typeof rating !== "number" || Number.isNaN(rating)) return null;
  return rating.toFixed(1).replace(/\.0$/, "");
}

function getAmenityMeta(amenity: string) {
  const normalized = amenity.toLowerCase();

  if (normalized.includes("wifi")) return { icon: Wifi, label: "Wi‑Fi" };
  if (normalized.includes("park")) return { icon: CarFront, label: "Parking" };
  if (normalized.includes("pool")) return { icon: Waves, label: "Pool" };
  if (normalized.includes("ac") || normalized.includes("air"))
    return { icon: Snowflake, label: "AC" };

  return { icon: Sparkles, label: amenity };
}

interface ListingCardProps {
  item?: Listing;
  id?: string;
  loading?: boolean;
}

export default function ListingCard({ item, id, loading = false }: ListingCardProps) {
  const [dbListing, setDbListing] = useState<Listing | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [failedImageUrls, setFailedImageUrls] = useState<string[]>([]);

  const listing = item ?? dbListing;

  useEffect(() => {
    if (item || !id) return;
    if (!supabase) return;

    const dbClient = supabase;
    let ignore = false;

    async function loadListing() {
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
        .order("sort_order", { foreignTable: "listing_images", ascending: true })
        .eq("id", id)
        .maybeSingle();

      if (ignore) return;

      if (error) {
        console.error("Failed to load listing from Supabase:", error);
        return;
      }

      if (!data) {
        setDbListing(null);
        return;
      }

      const gallery = Array.isArray(data.listing_images)
        ? data.listing_images
            .map((imageRow: { url?: string | null }) => imageRow?.url)
            .filter((url): url is string => Boolean(url))
        : [];

      const amenities = normalizeAmenities(data.amenities);
      const price = Number(data.price_per_night ?? 0);
      const formattedPrice = new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0,
      }).format(price);

      const normalized: Listing = {
        id: String(data.id),
        name: data.title ?? "Untitled listing",
        loc: [data.town, data.county].filter(Boolean).join(", ") || "Location unavailable",
        price: formattedPrice || "Price on request",
        detail: `Max guests: ${data.max_guests ?? 0}${amenities.length ? ` · ${amenities.slice(0, 2).join(" · ")}` : ""}`,
        img: gallery[0] ?? "/placeholder.svg",
        gallery,
        description: data.description ?? "",
        maxGuests:
          typeof data.max_guests === "number" ? data.max_guests : 0,
        checkInTime: "2:00 PM",
        checkOutTime: "11:00 AM",
        minNights: 1,
        pricePerNight: price,
        serviceFeePercent: 0.1,
        features: [
          ...(data.bedrooms ? [`${data.bedrooms} bedroom${data.bedrooms > 1 ? "s" : ""}`] : []),
          ...(data.bathrooms ? [`${data.bathrooms} bathroom${data.bathrooms > 1 ? "s" : ""}`] : []),
          ...amenities,
        ],
        host: "Host",
        rating: undefined,
        reviewCount: undefined,
        verified: false,
        rareFind: false,
        guests: typeof data.max_guests === "number" ? data.max_guests : undefined,
        beds: typeof data.bedrooms === "number" ? data.bedrooms : undefined,
        baths: typeof data.bathrooms === "number" ? data.bathrooms : undefined,
        amenities,
      };

      setDbListing(normalized);
    }

    void loadListing();
    return () => {
      ignore = true;
    };
  }, [id, item]);

  const handleSaveClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsSaved((current) => !current);
  };

  if (loading) {
    return (
      <div className="w-full max-w-[320px] overflow-hidden rounded-[24px] border border-[#E9E6DD] bg-white shadow-sm">
        <div className="animate-pulse">
          <div className="h-[220px] w-full bg-[#E9E5DD]" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-24 rounded bg-[#EEEAE2]" />
            <div className="h-5 w-3/4 rounded bg-[#EEEAE2]" />
            <div className="h-4 w-1/2 rounded bg-[#EEEAE2]" />
            <div className="h-10 w-full rounded bg-[#EEEAE2]" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const galleryImages = (listing.gallery && listing.gallery.length > 0
    ? listing.gallery
    : [listing.img || "/placeholder.svg"]).filter(Boolean);
  const ratingValue = formatRating(listing.rating);
  const amenityChips = (listing.amenities ?? []).slice(0, 3);
  const extraAmenityCount = Math.max((listing.amenities?.length ?? 0) - amenityChips.length, 0);

  const detailParts = [
    listing.guests ? `${listing.guests} guests` : null,
    listing.beds ? `${listing.beds} bed${listing.beds > 1 ? "s" : ""}` : null,
    listing.baths ? `${listing.baths} bath${listing.baths > 1 ? "s" : ""}` : null,
  ].filter(Boolean) as string[];

  return (
    <article className="group relative block max-w-[320px] overflow-hidden rounded-[24px] border border-[#E9E6DD] bg-white text-left shadow-[0_10px_30px_rgba(27,26,46,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(27,26,46,0.12)]">
      <ListingPhotoCarousel
        images={galleryImages}
        listingName={listing.name}
        href={`/apartments/${listing.id}`}
        className="h-[220px] w-full rounded-b-[18px]"
        renderImage={(src, index) => {
          const imageSrc = failedImageUrls.includes(src)
            ? "/placeholder.svg"
            : src;
          return (
            <Image
              src={imageSrc}
              alt={`${listing.name}, photo ${index + 1}`}
              loader={
                imageSrc.includes("images.unsplash.com")
                  ? unsplashCardImageLoader
                  : undefined
              }
              fill
              sizes="(max-width: 320px) 100vw, 320px"
              quality={85}
              unoptimized={
                imageSrc.includes("placehold.co") ||
                imageSrc === "/placeholder.svg"
              }
              onError={() => {
                setFailedImageUrls((current) =>
                  current.includes(src) ? current : [...current, src],
                );
              }}
              className="listing-image object-cover transition-transform duration-700 group-hover:scale-105"
            />
          );
        }}
      >
          <button
            type="button"
            aria-label={isSaved ? "Remove from saved listings" : "Save listing"}
            onClick={handleSaveClick}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/80 text-[#1B1A2E] shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            <Heart
              size={16}
              className={isSaved ? "fill-[#E23E85] text-[#E23E85]" : "text-[#1B1A2E]"}
            />
          </button>
      </ListingPhotoCarousel>

      <Link
        href={`/apartments/${listing.id}`}
        aria-label={`View details for ${listing.name}`}
        className="block p-[16px] text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#E89A1C]"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-[#36454F]/70">
              <span className="truncate font-medium text-[#36454F]">{listing.loc}</span>
            </div>

            {ratingValue && (
              <div className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-[#36454F]">
                <Star size={12} fill="currentColor" className="text-[#F7B500]" />
                <span>{ratingValue}</span>
                {typeof listing.reviewCount === "number" && (
                  <span className="text-[#36454F]/60">({listing.reviewCount})</span>
                )}
              </div>
            )}
          </div>

          <h3 className="line-clamp-1 text-[17px] font-semibold leading-6 text-[#1B1A2E]">
            {listing.name}
          </h3>

          {detailParts.length > 0 && (
            <p className="text-[13px] text-[#36454F]/70">
              {detailParts.join(" · ")}
            </p>
          )}

          {amenityChips.length > 0 && (
            <div className="flex items-center gap-2 text-[#36454F]/70">
              {amenityChips.map((amenity) => {
                const meta = getAmenityMeta(amenity);
                const Icon = meta.icon;
                return (
                  <span
                    key={`${listing.id}-${amenity}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E9E6DD] bg-[#F7F4F0]"
                    title={meta.label}
                    aria-label={meta.label}
                  >
                    <Icon size={14} />
                  </span>
                );
              })}

              {extraAmenityCount > 0 && (
                <span className="text-[11px] font-medium text-[#36454F]/70">
                  +{extraAmenityCount}
                </span>
              )}
            </div>
          )}

          <div className="flex items-end justify-between gap-3 border-t border-[#F0EDE7] pt-3">
            <div className="text-right">
              <div className="text-[12px] font-bold tracking-[-0.03em] text-[#1B1A2E] opacity-70">
                {listing.price}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ListingCardGridPreview() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {LISTINGS.map((listing) => (
        <ListingCard key={listing.id} item={listing} />
      ))}
    </div>
  );
}
