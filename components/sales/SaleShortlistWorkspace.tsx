"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { SaleComparison } from "@/components/sales/SaleComparison";
import { SalePropertyCard } from "@/components/sales/SalePropertyCard";
import { SALE_SHORTLIST_CHANGED_EVENT } from "@/components/sales/SaleShortlistButton";
import {
  MAX_SALE_SHORTLIST_PROPERTIES,
  parseSaleShortlistIds,
  parseSaleShortlistOwner,
  SALE_SHORTLIST_OWNER_KEY,
  SALE_SHORTLIST_STORAGE_KEY,
  type SaleShortlistOwner,
} from "@/app/lib/sale-shortlist";
import type { PublicSaleProperty } from "@/app/lib/sale-properties";

type PropertiesResponse = { properties?: PublicSaleProperty[]; error?: string };
type ShareResponse = { sharePath?: string; ownerToken?: string | null; error?: string };
const STORAGE_UNAVAILABLE = "__dominium_storage_unavailable__";

function subscribeToShortlist(onChange: () => void) {
  window.addEventListener(SALE_SHORTLIST_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SALE_SHORTLIST_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getShortlistSnapshot() {
  try {
    return window.localStorage.getItem(SALE_SHORTLIST_STORAGE_KEY) ?? "";
  } catch {
    return STORAGE_UNAVAILABLE;
  }
}

function getOwnerSnapshot() {
  try {
    return window.localStorage.getItem(SALE_SHORTLIST_OWNER_KEY) ?? "";
  } catch {
    return STORAGE_UNAVAILABLE;
  }
}

function getServerSnapshot() {
  return "";
}

function subscribeToBrowserLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function getBrowserOrigin() {
  return window.location.origin;
}

function writeShortlistIds(ids: string[]) {
  window.localStorage.setItem(SALE_SHORTLIST_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(SALE_SHORTLIST_CHANGED_EVENT));
}

function writeOwner(owner: SaleShortlistOwner | null) {
  if (owner) window.localStorage.setItem(SALE_SHORTLIST_OWNER_KEY, JSON.stringify(owner));
  else window.localStorage.removeItem(SALE_SHORTLIST_OWNER_KEY);
  window.dispatchEvent(new Event(SALE_SHORTLIST_CHANGED_EVENT));
}

export function SaleShortlistWorkspace() {
  const shortlistSnapshot = useSyncExternalStore(subscribeToShortlist, getShortlistSnapshot, getServerSnapshot);
  const ownerSnapshot = useSyncExternalStore(subscribeToShortlist, getOwnerSnapshot, getServerSnapshot);
  const browserOrigin = useSyncExternalStore(subscribeToBrowserLocation, getBrowserOrigin, getServerSnapshot);
  const ids = useMemo(() => parseSaleShortlistIds(shortlistSnapshot), [shortlistSnapshot]);
  const owner = useMemo(() => parseSaleShortlistOwner(ownerSnapshot), [ownerSnapshot]);
  const idsKey = ids.join(",");
  const [loaded, setLoaded] = useState<{ key: string; properties: PublicSaleProperty[] } | null>(null);
  const [loadError, setLoadError] = useState<{ key: string; message: string } | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const properties = loaded?.key === idsKey ? loaded.properties : [];
  const loading = ids.length > 0 && loaded?.key !== idsKey && loadError?.key !== idsKey;
  const error = actionError || (loadError?.key === idsKey ? loadError.message : "");
  const storageUnavailable = shortlistSnapshot === STORAGE_UNAVAILABLE || ownerSnapshot === STORAGE_UNAVAILABLE;

  useEffect(() => {
    if (!ids.length) return;
    const controller = new AbortController();
    fetch(`/api/sale-shortlists?ids=${encodeURIComponent(ids.join(","))}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json() as PropertiesResponse;
        if (!response.ok || !Array.isArray(data.properties)) {
          throw new Error(data.error || "Unable to load your shortlist.");
        }
        setLoaded({ key: idsKey, properties: data.properties });
        setLoadError(null);
        const availableIds = new Set(data.properties.map((property) => property.id));
        if (ids.some((id) => !availableIds.has(id))) {
          const current = parseSaleShortlistIds(window.localStorage.getItem(SALE_SHORTLIST_STORAGE_KEY));
          const filtered = current.filter((id) => availableIds.has(id));
          writeShortlistIds(filtered);
          setNotice("Some saved properties are no longer available and were removed.");
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (controller.signal.aborted) return;
        setLoadError({
          key: idsKey,
          message: cause instanceof Error ? cause.message : "Unable to load your shortlist.",
        });
      })
    return () => controller.abort();
  }, [ids, idsKey, loadAttempt]);

  function remove(propertyId: string) {
    const next = ids.filter((id) => id !== propertyId);
    try {
      writeShortlistIds(next);
      setActionError("");
      setNotice("Removed from your shortlist.");
    } catch {
      setActionError("Could not update your shortlist in browser storage.");
    }
  }

  async function updateShareLink() {
    if (!ids.length) return;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch("/api/sale-shortlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyIds: ids, ownerToken: owner?.ownerToken }),
      });
      const data = await response.json() as ShareResponse;
      if (!response.ok || !data.sharePath) {
        if (response.status === 410) {
          writeOwner(null);
        }
        throw new Error(data.error || "Unable to create a share link.");
      }
      const nextOwner = {
        ownerToken: data.ownerToken || owner?.ownerToken || "",
        sharePath: data.sharePath,
      };
      if (!nextOwner.ownerToken) throw new Error("The share link was created but could not be saved on this device.");
      writeOwner(nextOwner);
      setActionError("");
      setNotice("Your link is ready. Your family can view and compare these properties, but they can't change your shortlist.");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to create a share link.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeShareLink() {
    if (!owner) return;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch("/api/sale-shortlists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerToken: owner.ownerToken }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to revoke this link.");
      writeOwner(null);
      setActionError("");
      setNotice("The shared link has been revoked.");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to revoke this link.");
    } finally {
      setBusy(false);
    }
  }

  async function copyShareLink() {
    if (!owner) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${owner.sharePath}`);
      setActionError("");
      setNotice("Share link copied.");
    } catch {
      setActionError("Could not copy automatically. Select and copy the share link below.");
    }
  }

  const absoluteShareUrl = owner ? `${browserOrigin}${owner.sharePath}` : "";
  const whatsappUrl = owner
    ? `https://wa.me/?text=${encodeURIComponent(`Our property shortlist (${properties.length} ${properties.length === 1 ? "property" : "properties"}): ${absoluteShareUrl}`)}`
    : "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#F6EAF0] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#9C2454]">
            <Heart aria-hidden="true" size={13} /> Your decision space
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#1B1A2E] sm:text-3xl">My property shortlist</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5F5D69]">
            A space to weigh your options and decide together.
          </p>
        </div>
        {(ids.length > 0 || owner !== null) && (
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <p className="text-sm font-medium text-[#6B6A78]">{ids.length} of {MAX_SALE_SHORTLIST_PROPERTIES} saved</p>
            <Link href="/for-sale" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#D9D5CF] bg-white px-4 py-2.5 text-sm font-semibold text-[#383746] hover:border-[#9C2454] hover:text-[#9C2454]">
              Browse more <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        )}
      </header>

      {storageUnavailable && (
        <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-white p-3 text-sm text-red-700">
          Browser storage is unavailable. This device cannot save or manage a shortlist.
        </p>
      )}

      {ids.length > 0 && (
        <section className="mt-6 rounded-xl border border-[#E6E2DC] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F6EAF0] text-[#9C2454]">
                <Sparkles aria-hidden="true" size={20} />
              </span>
              <div>
                <h2 className="font-semibold text-[#1B1A2E]">Bring your family into the decision</h2>
                <p className="mt-1 text-sm leading-5 text-[#6B6A78]">
                  Share a link so family can view and compare your saved properties. They won&apos;t need an account or be able to change your shortlist.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={updateShareLink}
              disabled={!ids.length || busy || storageUnavailable}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#9C2454] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7D1D43] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Heart aria-hidden="true" size={17} />
              {busy ? "Preparing link…" : owner ? "Update share link" : "Create share link"}
            </button>
          </div>
          {owner && (
            <div className="mt-4 border-t border-[#EEEAE5] pt-4">
              <label className="block text-xs font-semibold text-[#5F5D69]" htmlFor="sale-shortlist-share-link">Your share link</label>
              <div className="mt-1 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                <input id="sale-shortlist-share-link" readOnly value={absoluteShareUrl} className="min-h-10 min-w-0 rounded-lg border border-[#D9D5CF] px-3 py-2 text-sm text-[#383746]" />
                <button type="button" onClick={copyShareLink} className="min-h-10 rounded-lg border border-[#D9D5CF] px-3 py-2 text-sm font-semibold text-[#383746] hover:bg-[#FAF9F7]">Copy link</button>
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#128C7E] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0F766B]">Share on WhatsApp</a>
                <button type="button" onClick={revokeShareLink} disabled={busy} className="min-h-10 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Revoke link</button>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs leading-5 text-[#6B6A78]">
                <ShieldCheck aria-hidden="true" size={14} className="shrink-0 text-emerald-700" />
                Your private seller and owner details are never included in the shared view.
              </p>
              {ids.length === 0 && (
                <p className="mt-2 text-xs leading-5 text-[#6B6A78]">
                  Your shared snapshot remains available until you revoke this link.
                </p>
              )}
            </div>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="mt-3 text-sm text-emerald-800">{notice}</p>}
        </section>
      )}

      <section className="mt-7">
        {ids.length > 0 && (
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-[#1B1A2E]">Saved properties</h2>
              <p className="mt-1 text-sm text-[#6B6A78]">Your choices, all in one place.</p>
            </div>
            {properties.length > 1 && <span className="text-xs font-medium text-[#6B6A78]">Compare differences below</span>}
          </div>
        )}
        {loading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ids.map((id) => <div key={id} className="aspect-[16/10] animate-pulse rounded-xl bg-[#EAE7E2]" />)}
          </div>
        ) : error && ids.length > 0 && properties.length === 0 ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-white p-6">
            <p className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={() => { setLoadError(null); setLoadAttempt((attempt) => attempt + 1); }} className="mt-3 text-sm font-semibold text-[#9C2454] underline">
              Try loading again
            </button>
          </div>
        ) : properties.length ? (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <SalePropertyCard
                  key={property.id}
                  property={property}
                  onRemove={remove}
                />
              ))}
            </div>
            <SaleComparison properties={properties} />
          </>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-[#E6E2DC] bg-white shadow-sm">
            <div className="grid md:grid-cols-[1.1fr_0.9fr]">
              <div className="flex flex-col items-start justify-center p-6 sm:p-10">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F6EAF0] text-[#9C2454]">
                  <Heart aria-hidden="true" size={23} />
                </span>
                <h2 className="mt-5 max-w-lg text-2xl font-semibold tracking-tight text-[#1B1A2E] sm:text-3xl">
                  Find a few you love. Decide together.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-[#5F5D69]">
                  Tap the heart on any property to save it here. Compare the details that differ, then share your shortlist with family.
                </p>
                <Link href="/for-sale" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#9C2454] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7D1D43]">
                  Explore homes for sale <ArrowRight aria-hidden="true" size={17} />
                </Link>
                <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-[#6B6A78]">
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck aria-hidden="true" size={14} /> No account needed</span>
                  <span className="inline-flex items-center gap-1.5"><Heart aria-hidden="true" size={14} /> Saved on this device</span>
                </div>
              </div>
              <div className="relative hidden min-h-80 overflow-hidden bg-gradient-to-br from-[#4B142F] via-[#7D1D43] to-[#B84872] p-8 text-white md:flex md:flex-col md:justify-between">
                <div aria-hidden="true" className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/15" />
                <div aria-hidden="true" className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-white/15" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <Sparkles aria-hidden="true" size={23} />
                </div>
                <div className="relative">
                  <p className="text-sm font-medium text-white/75">A better way to choose</p>
                  <p className="mt-2 max-w-xs text-2xl font-semibold leading-8">
                    Less scrolling. More clarity on the home that feels right.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {error && properties.length > 0 && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </section>
    </div>
  );
}
