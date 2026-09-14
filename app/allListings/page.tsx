"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navigationBar";
import ActiveFilterChips, {
  type ActiveFilter,
} from "@/components/listings/Activefilterchips";
import EmptyState from "@/components/listings/Emptystate";
import FilterSidebar from "@/components/listings/Filtersidebar";
import ListingCard from "@/components/listings/Listingcard";
import PageHeading from "@/components/listings/Pageheading";
import Pagination from "@/components/listings/Pagination";
import ResultsToolbar, {
  type SortOption,
  type ViewMode,
} from "@/components/listings/Resultstoolbar";
import { LISTINGS } from "@/components/homeData";
import {
  DEFAULT_FILTERS,
  type FilterState,
  type Listing,
} from "@/types/types";

const PAGE_SIZE = 6;

const AMENITY_OPTIONS = [
  { key: "wifi", label: "Wi-Fi", count: LISTINGS.filter((listing) => listing.amenities?.includes("wifi")).length },
  { key: "pool", label: "Pool", count: LISTINGS.filter((listing) => listing.amenities?.includes("pool")).length },
  { key: "parking", label: "Free parking", count: LISTINGS.filter((listing) => listing.amenities?.includes("parking")).length },
  { key: "ac", label: "Air conditioning", count: LISTINGS.filter((listing) => listing.amenities?.includes("ac")).length },
];

function toListingCardShape(): Listing[] {
  return LISTINGS.map((listing) => ({
    id: listing.id,
    title: listing.name,
    location: listing.loc,
    pricePerNight: listing.pricePerNight,
    bedrooms: listing.beds ?? 0,
    sleeps: listing.maxGuests,
    amenities: listing.amenities ?? [],
    description: listing.description,
    rating: listing.rating ?? 0,
    reviewCount: listing.reviewCount ?? 0,
    verified: listing.verified ?? false,
    imageUrl: listing.img,
  }));
}

export default function AllListingsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortOption>("recommended");
  const [view, setView] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const listings = useMemo(() => {
    const source = toListingCardShape();
    const filtered = source.filter((listing) => {
      const bedroomMatch =
        !filters.bedrooms ||
        filters.bedrooms === "Any" ||
        (filters.bedrooms === "4+"
          ? listing.bedrooms >= 4
          : listing.bedrooms === Number(filters.bedrooms));
      const amenityMatch = filters.amenities.every((amenity) =>
        listing.amenities.includes(amenity),
      );

      return (
        listing.pricePerNight >= filters.minPrice &&
        listing.pricePerNight <= filters.maxPrice &&
        bedroomMatch &&
        amenityMatch &&
        (!filters.verifiedOnly || listing.verified) &&
        (!filters.minRating || listing.rating >= filters.minRating)
      );
    });

    return [...filtered].sort((first, second) => {
      if (sort === "price_asc") return first.pricePerNight - second.pricePerNight;
      if (sort === "price_desc") return second.pricePerNight - first.pricePerNight;
      if (sort === "rating") return second.rating - first.rating;
      return 0;
    });
  }, [filters, sort]);

  const totalPages = Math.max(1, Math.ceil(listings.length / PAGE_SIZE));
  const visibleListings = listings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateFilters = (patch: Partial<FilterState>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const activeFilters: ActiveFilter[] = [];
  if (filters.verifiedOnly) activeFilters.push({ key: "verifiedOnly", label: "Verified hosts" });
  if (filters.minPrice > 0 || filters.maxPrice < 50000) {
    activeFilters.push({
      key: "price",
      label: `KES ${filters.minPrice.toLocaleString()} - ${filters.maxPrice.toLocaleString()}`,
    });
  }
  if (filters.bedrooms) activeFilters.push({ key: "bedrooms", label: `${filters.bedrooms} bedrooms` });
  filters.amenities.forEach((amenity) => {
    activeFilters.push({ key: `amenity-${amenity}`, label: amenity });
  });

  const removeFilter = (key: string) => {
    if (key === "verifiedOnly") updateFilters({ verifiedOnly: false });
    if (key === "price") updateFilters({ minPrice: 0, maxPrice: 50000 });
    if (key === "bedrooms") updateFilters({ bedrooms: null });
    if (key.startsWith("amenity-")) {
      updateFilters({ amenities: filters.amenities.filter((amenity) => `amenity-${amenity}` !== key) });
    }
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const toggleSaved = (id: string) => {
    setSavedIds((current) =>
      current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id],
    );
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <PageHeading title="All stays" resultCount={listings.length} />
        <ActiveFilterChips
          filters={activeFilters}
          onRemove={removeFilter}
          onClearAll={resetFilters}
        />

        <div className="grid grid-cols-1 gap-9 md:grid-cols-[260px_1fr]">
          <FilterSidebar
            filters={filters}
            amenityOptions={AMENITY_OPTIONS}
            verifiedCount={LISTINGS.filter((listing) => listing.verified).length}
            instantBookingCount={0}
            onChange={updateFilters}
            onReset={resetFilters}
          />

          <section>
            <ResultsToolbar
              sort={sort}
              view={view}
              onSortChange={(nextSort) => {
                setSort(nextSort);
                setPage(1);
              }}
              onViewChange={setView}
            />

            {view === "map" ? (
              <div className="flex min-h-[420px] items-center justify-center border border-[#E9E6DD] bg-[#F7F7F7] p-8 text-center text-[#36454F]">
                <div>
                  <h2 className="text-lg font-semibold text-[#36454F]">Map view coming soon</h2>
                  <p className="mt-2 text-sm text-[#36454F]/70">
                    Switch back to list view to browse available stays.
                  </p>
                </div>
              </div>
            ) : visibleListings.length === 0 ? (
              <EmptyState onResetFilters={resetFilters} />
            ) : (
              <div className={view === "list" ? "divide-y divide-[#E9E6DD]" : "grid gap-5 sm:grid-cols-2"}>
                {visibleListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    saved={savedIds.includes(listing.id)}
                    onToggleSave={toggleSaved}
                    onView={(id) => router.push(`/apartments/${id}`)}
                  />
                ))}
              </div>
            )}

            {view === "list" && listings.length > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </section>
        </div>
      </main>
    </>
  );
}
