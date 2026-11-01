"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { SaleShareButton } from "@/components/sales/SaleShareButton";
import { SaleShortlistButton } from "@/components/sales/SaleShortlistButton";
import { SalePropertyPhotoCarousel } from "@/components/sales/SalePropertyPhotoCarousel";
import type { PublicSaleProperty } from "@/app/lib/sale-properties";

function price(value: number | string) {
  return `KES ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export function SalePropertyCard({
  property,
  selected = false,
  onSelect,
  onRemove,
}: {
  property: PublicSaleProperty;
  selected?: boolean;
  onSelect?: (id: string | null) => void;
  onRemove?: (id: string) => void;
}) {
  return (
    <article
      id={`sale-card-${property.id}`}
      className={`group relative min-w-0 overflow-hidden rounded-xl border bg-white shadow-sm ${selected ? "border-[#9C2454] ring-2 ring-[#9C2454]/15" : "border-[#E6E2DC]"}`}
    >
      <div className="relative">
        <SalePropertyPhotoCarousel
          images={property.sale_property_images}
          propertyTitle={property.title}
          propertySlug={property.slug}
          initialImageIndex={Math.max(0, property.sale_property_images.findIndex((image) => image.is_cover))}
          onFocus={onSelect ? () => onSelect(property.id) : undefined}
          onBlur={onSelect ? () => onSelect(null) : undefined}
        />
        {property.is_verified && (
          <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
            Verified
          </span>
        )}
      </div>
      <Link
        href={`/for-sale/${property.slug}`}
        onFocus={onSelect ? () => onSelect(property.id) : undefined}
        onBlur={onSelect ? () => onSelect(null) : undefined}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9C2454]"
      >
        <div className="p-3.5 sm:p-4">
          <p className="text-lg font-bold text-[#9C2454]">{price(property.asking_price)}</p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-6 text-[#1B1A2E]">{property.title}</h3>
          <p className="mt-1 line-clamp-1 text-sm text-[#6B6A78]">
            {[property.neighborhood, property.town, property.county].filter(Boolean).join(", ")}
          </p>
          <p className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-[#4B4A5A]">
            <span className="capitalize">{property.property_type.replaceAll("_", " ")}</span>
            {property.property_type !== "land" && property.property_type !== "commercial" && (
              <>
                <span>· {property.bedrooms} bed</span>
                <span>· {property.bathrooms} bath</span>
              </>
            )}
            {property.size_sqm && <span>· {Number(property.size_sqm).toLocaleString()} m²</span>}
            {property.plot_size_acres && <span>· {Number(property.plot_size_acres).toLocaleString()} acres</span>}
          </p>
        </div>
      </Link>
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        {onRemove ? (
          <button
            type="button"
            onClick={() => onRemove(property.id)}
            aria-label="Remove from shortlist"
            title="Remove from shortlist"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#E6E2DC] bg-white/95 text-[#6B6A78] shadow-sm transition hover:border-[#9C2454] hover:text-[#9C2454] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9C2454]"
          >
            <Trash2 aria-hidden="true" size={17} />
          </button>
        ) : (
          <SaleShortlistButton propertyId={property.id} iconOnly />
        )}
        <SaleShareButton title={property.title} url={`/for-sale/${property.slug}`} iconOnly />
      </div>
    </article>
  );
}
