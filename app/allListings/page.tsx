"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/navigationBar";
import ActiveFilterChips, {
  type ActiveFilter,
} from "@/components/listings/Activefilterchips";
import EmptyState from "@/components/listings/Emptystate";
import FilterSidebar from "@/components/listings/Filtersidebar";
import ListingCard from "@/components/listings/Listingcard";
import ListingCardSkeleton from "@/components/listings/ListingCardSkeleton";
import PageHeading from "@/components/listings/Pageheading";
import Pagination from "@/components/listings/Pagination";
import ResultsToolbar, {
  type SortOption,
  type ViewMode,
} from "@/components/listings/Resultstoolbar";
import {
  DEFAULT_FILTERS,
  type FilterState,
  type Listing,
} from "@/types/types";

const PAGE_SIZE = 6;

interface SearchQuery {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

function cleanSearchTerm(value: string) {
  return value.replace(/[%,]/g, " ").replace(/\s+/g, " ").trim();
}

function formatDateRange(checkIn: string, checkOut: string) {
  const format = (value: string) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
      new Date(`${value}T00:00:00`),
    );

  if (checkIn && checkOut) return `${format(checkIn)} – ${format(checkOut)}`;
  if (checkIn) return `From ${format(checkIn)}`;
  if (checkOut) return `Until ${format(checkOut)}`;
  return undefined;
}

async function fetchListingPage(from: number, to: number, searchQuery: SearchQuery) {
  const query = new URLSearchParams({
    location: cleanSearchTerm(searchQuery.location),
    guests: String(searchQuery.guests || 0),
    from: String(from),
    to: String(to),
  });
  const response = await fetch(`/api/listings/catalog?${query}`);
  if (!response.ok) throw new Error("Unable to load listings.");
  return (await response.json()) as Listing[];
}

function AllListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = useMemo<SearchQuery>(
    () => ({
      location: searchParams.get("location") ?? "",
      checkIn: searchParams.get("checkIn") ?? "",
      checkOut: searchParams.get("checkOut") ?? "",
      guests: Math.max(0, Number(searchParams.get("guests") ?? 0) || 0),
    }),
    [searchParams],
  );
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortOption>("recommended");
  const [view, setView] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const [comparison, setComparison] = useState<Listing[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [databaseListings, setDatabaseListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    async function loadListings() {
      try {
        const normalizedListings = await fetchListingPage(0, PAGE_SIZE - 1, searchQuery);
        setDatabaseListings(normalizedListings);
        setHasMore(normalizedListings.length === PAGE_SIZE);
      } catch (error) {
        console.error("Failed to load listings from Supabase:", error);
      }
      setIsLoading(false);
    }

    void loadListings();
  }, [searchQuery]);

  const loadMoreListings = async () => {
    if (isLoadingMore || !hasMore) return false;

    setIsLoadingMore(true);
    try {
      const nextListings = await fetchListingPage(
        databaseListings.length,
        databaseListings.length + PAGE_SIZE - 1,
        searchQuery,
      );
      setDatabaseListings((current) => [...current, ...nextListings]);
      setHasMore(nextListings.length === PAGE_SIZE);
      return nextListings.length > 0;
    } catch (error) {
      console.error("Failed to load more listings from Supabase:", error);
      return false;
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleNextPage = async () => {
    if (page !== totalPages) {
      setPage((current) => current + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (await loadMoreListings()) {
      setPage((current) => current + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const amenityOptions = useMemo(() => {
    const labels: Record<string, string> = {
      wifi: "Wi-Fi",
      pool: "Pool",
      parking: "Free parking",
      ac: "Air conditioning",
    };

    return Object.entries(labels).map(([key, label]) => ({
      key,
      label,
      count: databaseListings.filter((listing) => listing.amenities.includes(key)).length,
    }));
  }, [databaseListings]);

  const listings = useMemo(() => {
    const filtered = databaseListings.filter((listing) => {
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
  }, [databaseListings, filters, sort]);

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

  const toggleCompare = (listing: Listing) => {
    setComparison((current) => {
      if (current.some((selected) => selected.id === listing.id)) {
        return current.filter((selected) => selected.id !== listing.id);
      }
      if (current.length >= 3) return current;
      return [...current, listing];
    });
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <PageHeading
          title={searchQuery.location ? `Stays in ${searchQuery.location}` : "All stays"}
          resultCount={listings.length}
          dateRangeLabel={formatDateRange(searchQuery.checkIn, searchQuery.checkOut)}
        />
        <ActiveFilterChips
          filters={activeFilters}
          onRemove={removeFilter}
          onClearAll={resetFilters}
        />

        <div className="grid grid-cols-1 gap-9 md:grid-cols-[260px_1fr]">
          <FilterSidebar
            filters={filters}
            amenityOptions={amenityOptions}
            verifiedCount={databaseListings.length}
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

            {isLoading ? (
              <div aria-label="Loading available stays" className="divide-y divide-[#E9E6DD]">
                {Array.from({ length: PAGE_SIZE }, (_, index) => (
                  <ListingCardSkeleton key={index} />
                ))}
              </div>
            ) : view === "map" ? (
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
                    comparing={comparison.some((selected) => selected.id === listing.id)}
                    onToggleCompare={toggleCompare}
                    onView={(id) => router.push(`/apartments/${id}`)}
                  />
                ))}
              </div>
            )}

            {view === "list" && listings.length > 0 && (
              <>
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  onLoadMore={() => void handleNextPage()}
                  hasMore={hasMore}
                  isLoadingMore={isLoadingMore}
                />
              </>
            )}
          </section>
        </div>
      </main>

      {comparison.length > 0 && (
        <>
          <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white px-4 py-3 shadow-[0_-8px_30px_rgba(27,26,46,0.12)] sm:px-6">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#1B1A2E]">
                  {comparison.length} of 3 stays selected
                </p>
                <p className="text-xs text-neutral-500">
                  {comparison.length < 2 ? "Select one more stay to compare" : "Compare price, space, ratings, and amenities"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {comparison.map((listing) => (
                  <button
                    key={listing.id}
                    type="button"
                    onClick={() => toggleCompare(listing)}
                    className="hidden max-w-36 truncate text-xs text-neutral-600 underline underline-offset-2 sm:block"
                    aria-label={`Remove ${listing.title} from comparison`}
                  >
                    {listing.title} ×
                  </button>
                ))}
                <button
                  type="button"
                  disabled={comparison.length < 2}
                  onClick={() => setIsComparisonOpen(true)}
                  className="rounded-md bg-[#1B1A2E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#35344A] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Compare stays
                </button>
                <button
                  type="button"
                  onClick={() => setComparison([])}
                  className="px-2 py-2 text-sm text-neutral-600 hover:text-neutral-950"
                  aria-label="Clear selected stays"
                >
                  Clear
                </button>
              </div>
            </div>
          </aside>

          {isComparisonOpen && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6">
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="compare-heading"
                className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-t-xl bg-white shadow-2xl sm:rounded-xl"
              >
                <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 sm:px-7">
                  <div>
                    <h2 id="compare-heading" className="text-lg font-semibold text-[#1B1A2E]">Compare stays</h2>
                    <p className="mt-0.5 text-sm text-neutral-500">A side-by-side look at your shortlist.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsComparisonOpen(false)}
                    className="rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
                  >
                    Close
                  </button>
                </header>
                <div className="overflow-auto p-5 sm:p-7">
                  <table className="w-full min-w-[680px] table-fixed text-left text-sm">
                    <thead>
                      <tr>
                        <th className="w-32 pb-4 pr-4 font-medium text-neutral-500">Stay</th>
                        {comparison.map((listing) => (
                          <th key={listing.id} className="min-w-44 pb-4 px-3 align-top">
                            <p className="line-clamp-2 font-semibold text-[#1B1A2E]">{listing.title}</p>
                            <p className="mt-1 truncate text-xs font-normal text-neutral-500">{listing.location}</p>
                            <button
                              type="button"
                              onClick={() => toggleCompare(listing)}
                              className="mt-2 text-xs font-medium text-rose-700 underline underline-offset-2"
                            >
                              Remove
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      <tr><th className="py-3 pr-4 font-medium text-neutral-500">Price / night</th>{comparison.map((listing) => <td key={listing.id} className="px-3 py-3 font-semibold text-[#1B1A2E]">KES {listing.pricePerNight.toLocaleString()}</td>)}</tr>
                      <tr><th className="py-3 pr-4 font-medium text-neutral-500">Bedrooms</th>{comparison.map((listing) => <td key={listing.id} className="px-3 py-3 text-[#1B1A2E]">{listing.bedrooms}</td>)}</tr>
                      <tr><th className="py-3 pr-4 font-medium text-neutral-500">Guests</th>{comparison.map((listing) => <td key={listing.id} className="px-3 py-3 text-[#1B1A2E]">{listing.guests}</td>)}</tr>
                      <tr><th className="py-3 pr-4 font-medium text-neutral-500">Rating</th>{comparison.map((listing) => <td key={listing.id} className="px-3 py-3 text-[#1B1A2E]">{listing.rating.toFixed(1)} ({listing.reviewCount})</td>)}</tr>
                      <tr><th className="py-3 pr-4 align-top font-medium text-neutral-500">Amenities</th>{comparison.map((listing) => <td key={listing.id} className="px-3 py-3 align-top text-[#1B1A2E]">{listing.amenities.slice(0, 6).join(", ") || "Not listed"}</td>)}</tr>
                      <tr><th className="py-3 pr-4 font-medium text-neutral-500">Location</th>{comparison.map((listing) => <td key={listing.id} className="px-3 py-3 text-[#1B1A2E]">{listing.location || "Not listed"}</td>)}</tr>
                      <tr><th className="py-3 pr-4" />{comparison.map((listing) => <td key={listing.id} className="px-3 py-4"><button type="button" onClick={() => router.push(`/apartments/${listing.id}`)} className="font-semibold text-rose-700 underline underline-offset-4">View stay</button></td>)}</tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function AllListingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F5F2]" aria-label="Loading listings" />
      }
    >
      <AllListingsContent />
    </Suspense>
  );
}
