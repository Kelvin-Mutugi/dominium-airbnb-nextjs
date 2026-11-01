"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { List, Map as MapIcon } from "lucide-react";
import { SalePropertyCard } from "@/components/sales/SalePropertyCard";
import type { PublicSaleProperty } from "@/app/lib/sale-properties";

const SalePropertyMap = dynamic(
  () => import("@/components/sales/SalePropertyMap").then((module) => module.SalePropertyMap),
  {
    ssr: false,
    loading: () => <div aria-label="Loading property map" className="h-full min-h-[420px] animate-pulse bg-[#E8EDF0]" />,
  },
);

function scrollToCard(container: HTMLElement | null, id: string) {
  if (!container) return;
  const card = document.getElementById(`sale-card-${id}`);
  if (!card) return;
  const containerRect = container.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  if (cardRect.top < containerRect.top || cardRect.bottom > containerRect.bottom) {
    container.scrollTo({
      top: container.scrollTop + cardRect.top - containerRect.top - 12,
      behavior: "smooth",
    });
  }
}

export function SalePropertyResults({
  properties,
  page,
  hasNextPage,
  previousPageHref,
  nextPageHref,
}: {
  properties: PublicSaleProperty[];
  page: number;
  hasNextPage: boolean;
  previousPageHref: string;
  nextPageHref: string;
}) {
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const listSectionRef = useRef<HTMLElement>(null);
  const hasMapPoints = properties.some((property) =>
    typeof property.map_lat === "number" && typeof property.map_lng === "number");
  const missingMapCount = properties.length - properties.filter((property) =>
    typeof property.map_lat === "number" && typeof property.map_lng === "number").length;

  function selectProperty(id: string | null) {
    setSelectedId(id);
    if (!id) return;
    scrollToCard(listRef.current, id);
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <>
      <div className="mb-4 flex min-h-11 items-center justify-between gap-3 lg:hidden">
        <p className="text-xs text-[#6B6A78]">
          {hasMapPoints ? "Browse properties or explore by location." : "Map pins appear as listing locations become available."}
        </p>
        <div className="inline-flex shrink-0 rounded-full border border-[#D9D5CF] bg-white p-1 shadow-sm" aria-label="Choose results view">
          <button
            type="button"
            aria-pressed={mobileView === "list"}
            onClick={() => setMobileView("list")}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${mobileView === "list" ? "bg-[#1B1A2E] text-white" : "text-[#5F5D69]"}`}
          >
            <List aria-hidden="true" size={15} /> List
          </button>
          <button
            type="button"
            aria-pressed={mobileView === "map"}
            onClick={() => setMobileView("map")}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${mobileView === "map" ? "bg-[#1B1A2E] text-white" : "text-[#5F5D69]"}`}
          >
            <MapIcon aria-hidden="true" size={15} /> Map
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)] xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.7fr)] xl:gap-6">
        <section
          ref={listSectionRef}
          aria-label="Properties for sale"
          className={`min-w-0 ${mobileView === "map" ? "hidden lg:block" : ""}`}
        >
          {properties.length ? (
            <div
              ref={listRef}
              className="grid grid-cols-1 gap-4 pb-8 sm:grid-cols-2 sm:gap-5 lg:max-h-[calc(100dvh-180px)] lg:grid-cols-2 lg:overflow-y-auto lg:pb-4 lg:pr-2"
            >
              {properties.map((property) => (
                <SalePropertyCard
                  key={property.id}
                  property={property}
                  selected={property.id === selectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#D9D5CF] bg-white px-5 py-14 text-center">
              <h3 className="text-lg font-semibold text-[#1B1A2E]">No properties found</h3>
              <p className="mt-2 text-sm text-[#6B6A78]">Try a broader location or adjust your price range.</p>
            </div>
          )}

          {(page > 1 || hasNextPage) && (
            <nav aria-label="Property pages" className="mt-5 flex justify-center gap-3 lg:pb-4">
              {page > 1 && <Link href={previousPageHref} className="rounded-lg border border-[#D9D5CF] bg-white px-4 py-2 text-sm font-semibold text-[#383746]">Previous</Link>}
              {hasNextPage && <Link href={nextPageHref} className="rounded-lg bg-[#9C2454] px-4 py-2 text-sm font-semibold text-white">Next properties</Link>}
            </nav>
          )}
          {missingMapCount > 0 && properties.length > 0 && (
            <p className="mt-3 text-xs text-[#6B6A78] lg:pb-4">
              {missingMapCount} {missingMapCount === 1 ? "listing has" : "listings have"} no neighborhood pin yet.
            </p>
          )}
        </section>

        <section
          ref={mapRef}
          aria-label="Map of properties for sale"
          className={`relative isolate h-[calc(100dvh-170px)] min-h-[420px] overflow-hidden rounded-xl border border-[#E6E2DC] bg-[#E8EDF0] lg:sticky lg:top-24 lg:aspect-square lg:h-auto lg:min-h-0 lg:self-start ${mobileView === "list" ? "hidden lg:block" : ""}`}
        >
          <SalePropertyMap
            properties={properties}
            selectedId={selectedId}
            onSelect={selectProperty}
          />
        </section>
      </div>
    </>
  );
}
