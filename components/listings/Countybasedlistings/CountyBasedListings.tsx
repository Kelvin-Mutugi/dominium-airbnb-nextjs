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

import { DEFAULT_FILTERS, type FilterState, type Listing } from "@/types/types";

type ListingsClientProps = {
  county: string;
  initialListings: Listing[];
  pageSize: number;
};

export default function CountyBasedListings({
  county,
  initialListings,
  pageSize,
}: ListingsClientProps) {
  const router = useRouter();

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const [sort, setSort] = useState<SortOption>("recommended");

  const [view, setView] = useState<ViewMode>("list");

  const [page, setPage] = useState(1);

  const [savedIds, setSavedIds] = useState<string[]>([]);

  const [databaseListings, setDatabaseListings] =
    useState<Listing[]>(initialListings);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [hasMore, setHasMore] = useState(initialListings.length === pageSize);

  /*
   * Load more listings.
   *
   * The first page was already fetched by the
   * server component. This function fetches the
   * next pages when the user clicks Next.
   */
  const loadMoreListings = async () => {
    if (isLoadingMore || !hasMore) {
      return false;
    }

    setIsLoadingMore(true);

    try {
      const response = await fetch(
        `/api/listings?county=${encodeURIComponent(county)}&from=${databaseListings.length}&to=${databaseListings.length + pageSize - 1}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load listings");
      }

      const nextListings: Listing[] = await response.json();

      setDatabaseListings((current) => [...current, ...nextListings]);

      setHasMore(nextListings.length === pageSize);

      return nextListings.length > 0;
    } catch (error) {
      console.error("Failed to load more listings:", error);

      return false;
    } finally {
      setIsLoadingMore(false);
    }
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
      count: databaseListings.filter((listing) =>
        listing.amenities.includes(key),
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
      if (sort === "price_asc") {
        return first.pricePerNight - second.pricePerNight;
      }

      if (sort === "price_desc") {
        return second.pricePerNight - first.pricePerNight;
      }

      if (sort === "rating") {
        return second.rating - first.rating;
      }

      return 0;
    });
  }, [databaseListings, filters, sort]);

  const totalPages = Math.max(1, Math.ceil(listings.length / pageSize));

  const visibleListings = listings.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const updateFilters = (patch: Partial<FilterState>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
    }));

    setPage(1);
  };

  const activeFilters: ActiveFilter[] = [];

  if (filters.verifiedOnly) {
    activeFilters.push({
      key: "verifiedOnly",
      label: "Verified hosts",
    });
  }

  if (filters.minPrice > 0 || filters.maxPrice < 50000) {
    activeFilters.push({
      key: "price",
      label: `KES ${filters.minPrice.toLocaleString()} - KES ${filters.maxPrice.toLocaleString()}`,
    });
  }

  if (filters.bedrooms) {
    activeFilters.push({
      key: "bedrooms",
      label: `${filters.bedrooms} bedrooms`,
    });
  }

  filters.amenities.forEach((amenity) => {
    activeFilters.push({
      key: `amenity-${amenity}`,
      label: amenity,
    });
  });

  const removeFilter = (key: string) => {
    if (key === "verifiedOnly") {
      updateFilters({
        verifiedOnly: false,
      });
    }

    if (key === "price") {
      updateFilters({
        minPrice: 0,
        maxPrice: 50000,
      });
    }

    if (key === "bedrooms") {
      updateFilters({
        bedrooms: null,
      });
    }

    if (key.startsWith("amenity-")) {
      updateFilters({
        amenities: filters.amenities.filter(
          (amenity) => `amenity-${amenity}` !== key,
        ),
      });
    }
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const toggleSaved = (id: string) => {
    setSavedIds((current) =>
      current.includes(id)
        ? current.filter((savedId) => savedId !== id)
        : [...current, id],
    );
  };

  const handleNextPage = async () => {
    if (page !== totalPages) {
      setPage((current) => current + 1);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    if (await loadMoreListings()) {
      setPage((current) => current + 1);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <PageHeading
          title={`Stays in ${county}`}
          resultCount={listings.length}
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

            {view === "map" ? (
              <div className="flex min-h-[420px] items-center justify-center border border-[#E9E6DD] bg-[#F7F7F7] p-8 text-center text-[#36454F]">
                <div>
                  <h2 className="text-lg font-semibold">
                    Map view coming soon
                  </h2>

                  <p className="mt-2 text-sm">
                    Switch back to list view to browse available stays.
                  </p>
                </div>
              </div>
            ) : visibleListings.length === 0 ? (
              <EmptyState onResetFilters={resetFilters} />
            ) : (
              <div
                className={
                  view === "list"
                    ? "divide-y divide-[#E9E6DD]"
                    : "grid gap-5 sm:grid-cols-2"
                }
              >
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

            {listings.length > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onLoadMore={() => void handleNextPage()}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
              />
            )}
          </section>
        </div>
      </main>
    </>
  );
}
