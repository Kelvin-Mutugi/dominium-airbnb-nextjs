"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import {
  MAX_SALE_SHORTLIST_PROPERTIES,
  parseSaleShortlistIds,
  SALE_SHORTLIST_STORAGE_KEY,
} from "@/app/lib/sale-shortlist";

export const SALE_SHORTLIST_CHANGED_EVENT = "dominium-sale-shortlist-changed";

type Props = {
  propertyId: string;
  className?: string;
  iconOnly?: boolean;
};

export function SaleShortlistButton({ propertyId, className = "", iconOnly = false }: Props) {
  const [saved, setSaved] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    const refresh = () => {
      try {
        const ids = parseSaleShortlistIds(window.localStorage.getItem(SALE_SHORTLIST_STORAGE_KEY));
        setSaved(ids.includes(propertyId));
        setLimitReached(ids.length >= MAX_SALE_SHORTLIST_PROPERTIES);
        setStorageError("");
      } catch {
        setStorageError("Shortlist storage is unavailable in this browser.");
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(SALE_SHORTLIST_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(SALE_SHORTLIST_CHANGED_EVENT, refresh);
    };
  }, [propertyId]);

  function toggle() {
    try {
      const ids = parseSaleShortlistIds(window.localStorage.getItem(SALE_SHORTLIST_STORAGE_KEY));
      const next = ids.includes(propertyId)
        ? ids.filter((id) => id !== propertyId)
        : ids.length < MAX_SALE_SHORTLIST_PROPERTIES
          ? [...ids, propertyId]
          : ids;
      window.localStorage.setItem(SALE_SHORTLIST_STORAGE_KEY, JSON.stringify(next));
      setSaved(next.includes(propertyId));
      setLimitReached(next.length >= MAX_SALE_SHORTLIST_PROPERTIES);
      setStorageError("");
      window.dispatchEvent(new Event(SALE_SHORTLIST_CHANGED_EVENT));
    } catch {
      setStorageError("Could not save this property in browser storage.");
    }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={toggle}
        disabled={limitReached && !saved}
        aria-pressed={saved}
        aria-label={saved ? "Remove from shortlist" : limitReached ? "Shortlist is full" : "Add to shortlist"}
        title={limitReached && !saved ? `Shortlists can contain up to ${MAX_SALE_SHORTLIST_PROPERTIES} properties` : undefined}
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#E6E2DC] bg-white/95 px-3 text-sm font-semibold text-[#383746] shadow-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9C2454] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <Heart aria-hidden="true" size={18} className={saved ? "fill-[#9C2454] text-[#9C2454]" : "text-[#6B6A78]"} />
        {!iconOnly && <span>{saved ? "Saved" : "Shortlist"}</span>}
      </button>
      {storageError && <span role="alert" className="mt-1 max-w-36 rounded bg-white px-1 text-[10px] leading-4 text-red-700">{storageError}</span>}
    </span>
  );
}
