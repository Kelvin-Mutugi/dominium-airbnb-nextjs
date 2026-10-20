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
import {
  BROWSE_CATEGORY_LABELS,
  isBrowseCategory,
  type BrowseCategory,
} from "@/app/lib/listing-categories";
import CategoryBar from "@/components/home/CategoryBar";

const PAGE_SIZE = 6;

interface SearchQuery {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  category: BrowseCategory;
}

interface CatalogState {
  searchKey: string;
  listings: Listing[];
  hasMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  isLoadingMore: boolean;
}

function cleanSearchTerm(value: string) {
  return value.replace(/[%,]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeAmenity(value: string) {
  const key = value.trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
  if (key === "ac" || key === "aircon") return "airconditioning";
  if (key === "freeparking") return "parking";
  return key;
}

function amenityLabel(value: string) {
  const labels: Record<string, string> = {
    wifi: "Wi-Fi",
    pool: "Pool",
    parking: "Free parking",
    airconditioning: "Air conditioning",
    kitchen: "Kitchen",
    washer: "Washer",
    tv: "TV",
    hotwater: "Hot water",
    backupgenerator: "Backup generator",
    securityguard: "Security guard",
    balcony: "Balcony",
    gym: "Gym",
  };
  return labels[normalizeAmenity(value)] ?? value.trim();
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

async function fetchListingPage(
  from: number,
  to: number,
  searchQuery: SearchQuery,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    location: cleanSearchTerm(searchQuery.location),
    guests: String(searchQuery.guests || 0),
    category: searchQuery.category,
    from: String(from),
    to: String(to),
  });
  const response = await fetch(`/api/listings/catalog?${query}`, { signal });
  if (!response.ok) throw new Error("Unable to load listings.");
  return (await response.json()) as Listing[];
}

function AllListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const locationParam = searchParams.get("location") ?? "";
  const checkInParam = searchParams.get("checkIn") ?? "";
  const checkOutParam = searchParams.get("checkOut") ?? "";
  const guestsParam = Math.max(
    0,
    Number(searchParams.get("guests") ?? 0) || 0,
  );
  const searchQuery = useMemo<SearchQuery>(
    () => ({
      location: locationParam,
      checkIn: checkInParam,
      checkOut: checkOutParam,
      guests: guestsParam,
      category: isBrowseCategory(categoryParam)
        ? categoryParam
        : "all",
    }),
    [categoryParam, checkInParam, checkOutParam, guestsParam, locationParam],
  );
  const searchKey = JSON.stringify(searchQuery);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortOption>("recommended");
  const [view, setView] = useState<ViewMode>("list");
  const [comparison, setComparison] = useState<Listing[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [pageState, setPageState] = useState({ searchKey: "", page: 1 });
  const page = pageState.searchKey === searchKey ? pageState.page : 1;
  const [catalogState, setCatalogState] = useState<CatalogState>({
    searchKey: "",
    listings: [],
    hasMore: true,
    error: null,
    loadMoreError: null,
    isLoadingMore: false,
  });
  const isLoading = catalogState.searchKey !== searchKey;
  const databaseListings = useMemo(
    () => (isLoading ? [] : catalogState.listings),
    [catalogState.listings, isLoading],
  );
  const loadError = isLoading ? null : catalogState.error;
  const loadMoreError = isLoading ? null : catalogState.loadMoreError;
  const hasMore = !isLoading && catalogState.hasMore;
  const isLoadingMore = !isLoading && catalogState.isLoadingMore;

  const setPage = (nextPage: number | ((currentPage: number) => number)) => {
    setPageState((current) => ({
      searchKey,
      page:
        typeof nextPage === "function"
          ? nextPage(current.searchKey === searchKey ? current.page : 1)
          : nextPage,
    }));
  };

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadListings() {
      try {
        const normalizedListings = await fetchListingPage(
          0,
          PAGE_SIZE - 1,
          searchQuery,
          controller.signal,
        );
        if (!active) return;
        setCatalogState({
          searchKey,
          listings: normalizedListings,
          hasMore: normalizedListings.length === PAGE_SIZE,
          error: null,
          loadMoreError: null,
          isLoadingMore: false,
        });
      } catch (error) {
        if (active && !controller.signal.aborted) {
          console.error("Failed to load listings from Supabase:", error);
          setCatalogState({
            searchKey,
            listings: [],
            hasMore: false,
            error: "We couldn’t load stays for these filters. Please try again.",
            loadMoreError: null,
            isLoadingMore: false,
          });
        }
      }
    }

    void loadListings();
    return () => {
      active = false;
      controller.abort();
    };
  }, [searchKey, searchQuery]);

  const loadMoreListings = async () => {
    if (isLoadingMore || !hasMore) return false;

    const requestSearchKey = searchKey;
    setCatalogState((current) =>
      current.searchKey === requestSearchKey
        ? { ...current, isLoadingMore: true, loadMoreError: null }
        : current,
    );
    try {
      const nextListings = await fetchListingPage(
        databaseListings.length,
        databaseListings.length + PAGE_SIZE - 1,
        searchQuery,
      );
      setCatalogState((current) =>
        current.searchKey === requestSearchKey
          ? {
              ...current,
              listings: [...current.listings, ...nextListings],
              hasMore: nextListings.length === PAGE_SIZE,
              loadMoreError: null,
              isLoadingMore: false,
            }
          : current,
      );
      return nextListings.length > 0;
    } catch (error) {
      console.error("Failed to load more listings from Supabase:", error);
      setCatalogState((current) =>
        current.searchKey === requestSearchKey
          ? {
              ...current,
              loadMoreError: "We couldn’t load more stays. Use Next to retry.",
              isLoadingMore: false,
            }
          : current,
      );
      return false;
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
    const labelsByKey = new Map<string, string>();
    databaseListings.forEach((listing) => {
      listing.amenities.forEach((amenity) => {
        const key = normalizeAmenity(amenity);
        if (key && !labelsByKey.has(key)) labelsByKey.set(key, amenityLabel(amenity));
      });
    });

    return [...labelsByKey].map(([key, label]) => ({
      key,
      label,
      count: databaseListings.filter((listing) =>
        listing.amenities.some((amenity) => normalizeAmenity(amenity) === key),
      ).length,
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
      const listingAmenities = new Set(listing.amenities.map(normalizeAmenity));
      const amenityMatch = filters.amenities.every((amenity) => listingAmenities.has(amenity));

      return (
        listing.pricePerNight >= filters.minPrice &&
        listing.pricePerNight <= filters.maxPrice &&
        bedroomMatch &&
        amenityMatch &&
        (!filters.petFriendly ||
          (listing.categories ?? []).includes("pet-friendly")) &&
        (!filters.groupStayOnly || listing.guests >= 4) &&
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
  if (searchQuery.category !== "all") {
    activeFilters.push({
      key: "category",
      label: BROWSE_CATEGORY_LABELS[searchQuery.category],
    });
  }
  if (filters.petFriendly) {
    activeFilters.push({ key: "petFriendly", label: "Pet-friendly" });
  }
  if (filters.groupStayOnly) activeFilters.push({ key: "groupStayOnly", label: "Sleeps 4+ guests" });
  if (filters.minPrice > 0 || filters.maxPrice < 50000) {
    activeFilters.push({
      key: "price",
      label: `KES ${filters.minPrice.toLocaleString()} - ${filters.maxPrice.toLocaleString()}`,
    });
  }
  if (filters.bedrooms) activeFilters.push({ key: "bedrooms", label: `${filters.bedrooms} bedrooms` });
  filters.amenities.forEach((amenity) => {
    activeFilters.push({
      key: `amenity-${amenity}`,
      label: amenityOptions.find((option) => option.key === amenity)?.label ?? amenity,
    });
  });

  const removeFilter = (key: string) => {
    if (key === "category") updateCategory("all");
    if (key === "petFriendly") updateFilters({ petFriendly: false });
    if (key === "groupStayOnly") updateFilters({ groupStayOnly: false });
    if (key === "price") updateFilters({ minPrice: 0, maxPrice: 50000 });
    if (key === "bedrooms") updateFilters({ bedrooms: null });
    if (key.startsWith("amenity-")) {
      updateFilters({ amenities: filters.amenities.filter((amenity) => `amenity-${amenity}` !== key) });
    }
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    if (searchQuery.category !== "all") updateCategory("all");
  };

  const updateCategory = (category: BrowseCategory) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", category);
    router.replace(`/allListings?${params.toString()}`, { scroll: false });
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

  const quickAmenities = [
    { key: "wifi", label: "Wi-Fi" },
    { key: "pool", label: "Pool" },
    { key: "parking", label: "Free parking" },
    { key: "airconditioning", label: "Air conditioning" },
  ];
  const filterSidebarProps = {
    filters,
    amenityOptions,
    groupStayCount: databaseListings.filter((listing) => listing.guests >= 4).length,
    instantBookingCount: 0,
    petFriendlyCount: databaseListings.filter((listing) =>
      (listing.categories ?? []).includes("pet-friendly"),
    ).length,
    onChange: updateFilters,
    onReset: resetFilters,
    soft: true,
  };

  return (
    <>
      <Navbar />
      <CategoryBar
        activeCategory={searchQuery.category}
        onChange={updateCategory}
        location={searchQuery.location}
        guests={searchQuery.guests}
      />
      <main className="min-h-screen bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <PageHeading
          title={
            searchQuery.category !== "all"
              ? searchQuery.location
                ? `${BROWSE_CATEGORY_LABELS[searchQuery.category]} in ${searchQuery.location}`
                : BROWSE_CATEGORY_LABELS[searchQuery.category]
              : searchQuery.location
                ? `Stays in ${searchQuery.location}`
                : "All stays"
          }
          dateRangeLabel={formatDateRange(searchQuery.checkIn, searchQuery.checkOut)}
          soft
        />
        <div className="mb-4 grid grid-cols-1 gap-3 border-y border-neutral-200 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <FilterSidebar {...filterSidebarProps} />
            <div
              className="flex min-w-0 flex-1 flex-nowrap gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Quick filters"
            >
              <button
                type="button"
                aria-pressed={filters.bedrooms === "2"}
                onClick={() => updateFilters({ bedrooms: filters.bedrooms === "2" ? null : "2" })}
                className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${filters.bedrooms === "2" ? "border-neutral-800 bg-neutral-800 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"}`}
              >
                2 bedrooms
              </button>
              {quickAmenities.map((amenity) => {
                const active = filters.amenities.includes(amenity.key);
                return (
                  <button
                    key={amenity.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateFilters({
                      amenities: active
                        ? filters.amenities.filter((selected) => selected !== amenity.key)
                        : [...filters.amenities, amenity.key],
                    })}
                    className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-neutral-800 bg-neutral-800 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"}`}
                  >
                    {amenity.label}
                  </button>
                );
              })}
            </div>
          </div>
          <ResultsToolbar
            sort={sort}
            view={view}
            soft
            onSortChange={(nextSort) => {
              setSort(nextSort);
              setPage(1);
            }}
            onViewChange={setView}
          />
        </div>
        <ActiveFilterChips
          filters={activeFilters}
          onRemove={removeFilter}
          onClearAll={resetFilters}
          soft
        />

        <div>
          <section>
            {isLoading ? (
              <div aria-label="Loading available stays" className="divide-y divide-[#E9E6DD]">
                {Array.from({ length: PAGE_SIZE }, (_, index) => (
                  <ListingCardSkeleton key={index} />
                ))}
              </div>
            ) : loadError ? (
              <div role="alert" className="py-16 text-center text-sm text-red-700">
                {loadError}
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
              <EmptyState
                title={
                  searchQuery.category === "all"
                    ? undefined
                    : "No stays found for this category"
                }
                message={
                  searchQuery.category === "all"
                    ? undefined
                    : `We couldn’t find stays in ${BROWSE_CATEGORY_LABELS[searchQuery.category]}. Try another category or clear the filters.`
                }
                onResetFilters={resetFilters}
              />
            ) : (
              <div className={view === "list" ? "divide-y divide-[#E9E6DD]" : "grid gap-5 sm:grid-cols-2"}>
                {visibleListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    soft
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
                {loadMoreError && (
                  <p role="alert" className="mt-3 text-center text-sm text-red-700">
                    {loadMoreError}
                  </p>
                )}
              </>
            )}
          </section>
        </div>
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
