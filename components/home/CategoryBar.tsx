"use client";

import {
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  Droplets,
  Home as HomeIcon,
  Laptop,
  LayoutGrid,
  ShieldCheck,
  Sprout,
  Tent,
  TreePine,
  Users,
  Wallet,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BROWSE_CATEGORY_LABELS,
  getVisibleBarCategories,
  isBrowseCategory,
  type BrowseCategory,
  type BrowseCategoryCounts,
} from "@/app/lib/listing-categories";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const categoryIcons: Record<BrowseCategory, LucideIcon> = {
  all: LayoutGrid,
  apartments: Building2,
  beachfront: Waves,
  villas: HomeIcon,
  cabins: TreePine,
  city: Building2,
  "pet-friendly": ShieldCheck,
  rare: HomeIcon,
  budget: Wallet,
  weekend: Tent,
  family: Users,
  pool: Droplets,
  work: Laptop,
  "business-travel": BriefcaseBusiness,
  secure: ShieldCheck,
  "long-stays": CalendarDays,
  safari: TreePine,
  "farm-stay": Sprout,
};

export default function CategoryBar({
  activeCategory,
  onChange,
  location = "",
  guests = 0,
}: {
  activeCategory: BrowseCategory;
  onChange: (category: BrowseCategory) => void;
  location?: string;
  guests?: number;
}) {
  const buttonRefs = useRef<Partial<Record<BrowseCategory, HTMLButtonElement>>>(
    {},
  );
  const [navbarHeight, setNavbarHeight] = useState(75);
  const countsKey = JSON.stringify({ location, guests });
  const [countsState, setCountsState] = useState<{
    key: string;
    counts: BrowseCategoryCounts;
  } | null>(null);

  const counts =
    countsState?.key === countsKey ? countsState.counts : undefined;
  const visibleCategories = useMemo(
    () => getVisibleBarCategories(counts, activeCategory),
    [counts, activeCategory],
  );

  useEffect(() => {
    const controller = new AbortController();
    async function loadCategoryCounts() {
      const params = new URLSearchParams({ location, guests: String(guests) });
      try {
        const response = await fetch(
          `/api/listings/category-counts?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Unable to load category counts.");
        const result: unknown = await response.json();
        if (!isRecord(result) || !isRecord(result.counts)) {
          throw new Error("The category count response was invalid.");
        }
        const counts = Object.fromEntries(
          Object.entries(result.counts).filter(
            (entry): entry is [BrowseCategory, number] =>
              isBrowseCategory(entry[0]) &&
              typeof entry[1] === "number" &&
              Number.isFinite(entry[1]),
          ),
        ) as BrowseCategoryCounts;
        if (
          Array.isArray(result.unavailableCategories) &&
          result.unavailableCategories.some(isBrowseCategory)
        ) {
          console.warn(
            "Some stay categories are hidden because their listing fields are not available in the database yet. Apply the Kenya stay discovery migration and refresh the Supabase schema cache.",
          );
        }
        setCountsState({ key: countsKey, counts });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load listing category counts:", error);
        setCountsState({ key: countsKey, counts: {} });
      }
    }

    void loadCategoryCounts();
    return () => controller.abort();
  }, [countsKey, guests, location]);

  useEffect(() => {
    const navbar = document.querySelector<HTMLElement>("[data-site-navbar]");
    if (!navbar) return;

    const updateNavbarHeight = () => {
      setNavbarHeight(navbar.getBoundingClientRect().height);
    };
    const resizeObserver = new ResizeObserver(updateNavbarHeight);
    resizeObserver.observe(navbar);
    window.addEventListener("resize", updateNavbarHeight);
    updateNavbarHeight();

    return () => {
      window.removeEventListener("resize", updateNavbarHeight);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 639px)").matches) {
      return;
    }
    buttonRefs.current[activeCategory]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeCategory]);

  return (
    <nav
      aria-label="Browse by category"
      className="sticky z-30 border-b border-neutral-200 bg-white"
      style={{ top: navbarHeight }}
    >
      <div className="mx-auto max-w-none px-4 sm:px-[6%]">
        <div className="category-scrollbar category-scrollbar--centered flex snap-x snap-proximity gap-5 overflow-x-auto py-2 pr-8 sm:gap-8 sm:py-3 sm:pr-0">
          {visibleCategories.map((id) => {
            const Icon = categoryIcons[id];
            const label = BROWSE_CATEGORY_LABELS[id];
            const active = activeCategory === id;
            return (
              <button
                key={id}
                ref={(element) => {
                  if (element) buttonRefs.current[id] = element;
                  else delete buttonRefs.current[id];
                }}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(id)}
                className={`flex min-h-14 min-w-14 shrink-0 snap-start flex-col hover:cursor-pointer items-center justify-center gap-1 border-b-2 px-1 pb-1 text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85] sm:px-1.5 sm:pb-2 ${
                  active
                    ? "border-[#E23E85] text-neutral-900"
                    : "border-transparent"
                }`}
              >
                <Icon
                  className="size-5 sm:size-[22px]"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                <span className="whitespace-nowrap text-[11px] leading-4 sm:text-xs">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}