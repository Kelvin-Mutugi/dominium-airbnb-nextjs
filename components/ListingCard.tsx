"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { supabase } from "@/app/lib/supabase";
import type { Amenity, Listing } from "./homeData";

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

interface ListingCardProps {
  item?: Listing;
  id?: string;
}

export default function ListingCard({ item, id }: ListingCardProps) {
  const [dbListing, setDbListing] = useState<Listing | null>(null);
  const listing = item ?? dbListing;

  useEffect(() => {
    if (item || !id) {
      return;
    }

    if (!supabase) {
      return;
    }

    const dbClient = supabase!;
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
        .order("sort_order", {
          foreignTable: "listing_images",
          ascending: true,
        })
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

      const normalizedListing: Listing = {
        id: String(data.id),
        name: data.title ?? "Untitled listing",
        loc:
          [data.town, data.county].filter(Boolean).join(", ") ||
          "Location unavailable",
        price: formattedPrice || "Price on request",
        detail: `Sleeps ${data.max_guests ?? 0}${amenities.length ? ` · ${amenities.slice(0, 2).join(" · ")}` : ""}`,
        img: gallery[0] ?? "",
        gallery,
        video: "",
        description: data.description ?? "",
        features: [
          ...(data.bedrooms ? [`${data.bedrooms} bedrooms`] : []),
          ...(data.bathrooms ? [`${data.bathrooms} bathrooms`] : []),
          ...amenities,
        ],
        host: "Host",
        rating: undefined,
        reviewCount: undefined,
        verified: false,
        rareFind: false,
        guests:
          typeof data.max_guests === "number" ? data.max_guests : undefined,
        beds: typeof data.bedrooms === "number" ? data.bedrooms : undefined,
        baths: typeof data.bathrooms === "number" ? data.bathrooms : undefined,
        amenities,
      };

      setDbListing(normalizedListing);
    }

    void loadListing();

    return () => {
      ignore = true;
    };
  }, [id, item]);

  const handleWhatsAppClick = (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
  };

  if (!listing) {
    return null;
  }

  return (
    <Link
      href={`/apartments/${listing.id}`}
      className="block max-w-[320px] overflow-hidden rounded-2xl border border-[#E9E6DD] bg-white transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#E89A1C]"
    >
      <article className="relative flex h-full flex-col cursor-pointer">
        <div className="absolute left-[14px] top-[14px] z-10 rounded-md border border-[#E9E6DD] bg-white px-[10px] py-[6px] font-mono text-[12px] tracking-[1px] text-[#1B1A2E]">
          {listing.price}
        </div>

        <div className="relative h-[260px] w-full overflow-hidden">
          <Image
            src={listing.img || "/placeholder.svg"}
            alt={listing.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 320px"
          />
        </div>

        <div className="p-[18px]">
          <h4 className="mb-1 text-[17px] text-[#36454F]">{listing.name}</h4>

          <div className="mb-3 text-[13px] text-[#36454F]/65">
            {listing.loc}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-[15px] font-bold text-[#D3D3D3]">
              {listing.detail}
            </div>

            <span
              onClick={handleWhatsAppClick}
              className="flex items-center gap-[6px] rounded-lg bg-[#128C7E] px-[14px] py-[9px] text-[12px] font-semibold text-white no-underline"
            >
              <MessageCircle size={13} />
              Reserve
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
