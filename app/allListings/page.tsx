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
import { supabase } from "@/app/lib/supabase/client";

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
  let query = supabase
    .from("listings")
    .select(
      `
        id,
        title,
        description,
        county,
        town,
        price_per_night,
        max_guests,
        bedrooms,
        amenities,
        average_rating,
        review_count,
        listing_images ( url, sort_order )
      `,
    )
    .eq("status", "published")
    .gte("max_guests", searchQuery.guests || 0);

  const location = cleanSearchTerm(searchQuery.location);
  if (location) {
    const locationTerms = location
      .split(/\s+[—-]\s+|\s*,\s*/)
      .map((term) => term.trim())
      .filter(Boolean);
    const clauses = locationTerms.flatMap((term) => [
      `county.ilike.%${term}%`,
      `town.ilike.%${term}%`,
      `title.ilike.%${term}%`,
    ]);
    query = query.or(clauses.join(","));
  }

  const { data: filteredData, error: filteredError } = await query
    .order("created_at", { ascending: false })
    .order("sort_order", {
      foreignTable: "listing_images",
      ascending: true,
    })
    .range(from, to);

  if (filteredError) throw filteredError;

  return (filteredData ?? []).map((listing) => {
    const images = Array.isArray(listing.listing_images)
      ? [...listing.listing_images].sort(
          (first, second) => first.sort_order - second.sort_order,
        )
      : [];
    const amenities = Array.isArray(listing.amenities)
      ? listing.amenities.filter(
          (amenity): amenity is string => typeof amenity === "string",
        )
      : [];

    return {
      id: String(listing.id),
      title: listing.title,
      location: [listing.town, listing.county].filter(Boolean).join(", "),
      pricePerNight: Number(listing.price_per_night),
      bedrooms: listing.bedrooms ?? 0,
      guests: listing.max_guests,
      amenities,
      description: listing.description,
      rating: Number(listing.average_rating ?? 0),
      reviewCount: listing.review_count ?? 0,
      verified: true,
      imageUrl: images[0]?.url ?? "",
    } satisfies Listing;
  });
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
  const [savedIds, setSavedIds] = useState<string[]>([]);
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

  const toggleSaved = (id: string) => {
    setSavedIds((current) =>
      current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id],
    );
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
                    saved={savedIds.includes(listing.id)}
                    onToggleSave={toggleSaved}
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
