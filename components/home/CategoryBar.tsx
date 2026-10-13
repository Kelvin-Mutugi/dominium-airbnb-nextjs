"use client";

import {
  Building,
  Building2,
  Gem,
  Home as HomeIcon,
  LayoutGrid,
  PawPrint,
  TreePine,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BrowseCategory } from "@/app/lib/listing-categories";

interface CategoryOption {
  id: BrowseCategory;
  label: string;
  icon: LucideIcon;
}

const categories = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "apartments", label: "Apartments", icon: Building2 },
  { id: "beachfront", label: "Beachfront", icon: Waves },
  { id: "villas", label: "Villas", icon: HomeIcon },
  { id: "cabins", label: "Cabins", icon: TreePine },
  { id: "city", label: "City views", icon: Building },
  { id: "pet-friendly", label: "Pet-friendly", icon: PawPrint },
  { id: "rare", label: "Rare finds", icon: Gem },
] as const satisfies readonly CategoryOption[];

export default function CategoryBar({
  activeCategory,
  onChange,
}: {
  activeCategory: BrowseCategory | null;
  onChange: (category: BrowseCategory) => void;
}) {
  const buttonRefs = useRef<Partial<Record<BrowseCategory, HTMLButtonElement>>>(
    {},
  );
  const barRef = useRef<HTMLElement>(null);
  const [navbarHeight, setNavbarHeight] = useState(75);

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
    if (
      activeCategory === null ||
      !window.matchMedia("(max-width: 639px)").matches
    ) {
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
      ref={barRef}
      aria-label="Browse by category"
      className="sticky z-30 border-b border-neutral-200 bg-white"
      style={{ top: navbarHeight }}
    >
      <div className="mx-auto max-w-none px-4 sm:px-[6%]">
        <div className="category-scrollbar category-scrollbar--centered flex snap-x snap-proximity gap-5 overflow-x-auto py-2 pr-8 sm:gap-8 sm:py-3 sm:pr-0">
          {categories.map(({ id, label, icon: Icon }) => {
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
                  <Icon className="size-5 sm:size-[22px]" strokeWidth={1.8} aria-hidden="true" />
                  <span className="whitespace-nowrap text-[11px] leading-4 sm:text-xs">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}