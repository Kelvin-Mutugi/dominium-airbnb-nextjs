import Link from "next/link";
import { Heart } from "lucide-react";
import Navbar from "@/components/navigationBar";
import { SalePropertyResults } from "@/components/sales/SalePropertyResults";
import { getCachedPublicSalePage } from "@/app/lib/sale-properties";

const PROPERTY_TYPES = [
  ["", "Any type"],
  ["apartment", "Apartments"],
  ["unit", "Residential units"],
  ["house", "Houses"],
  ["land", "Land"],
  ["commercial", "Commercial"],
];

const FURNISHED_OPTIONS = [
  ["", "Any furnishing"],
  ["unfurnished", "Unfurnished"],
  ["semi", "Semi-furnished"],
  ["furnished", "Furnished"],
];

function price(value: number | string) {
  return `KES ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function positiveInteger(value: string | string[] | undefined, maximum: number) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : null;
}

function pageHref(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  if (page > 1) next.set("page", String(page));
  else next.delete("page");
  return `/for-sale${next.size ? `?${next.toString()}` : ""}`;
}

export default async function ForSalePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const location = typeof raw.location === "string" ? raw.location.trim().slice(0, 100) : "";
  const requestedType = typeof raw.type === "string" ? raw.type : "";
  const propertyType = PROPERTY_TYPES.some(([value]) => value === requestedType) ? requestedType : "";
  const minRaw = typeof raw.min === "string" ? Number(raw.min) : NaN;
  const maxRaw = typeof raw.max === "string" ? Number(raw.max) : NaN;
  const minPrice = Number.isFinite(minRaw) && minRaw > 0 && minRaw <= 1_000_000_000_000 ? minRaw : null;
  const maxPrice = Number.isFinite(maxRaw) && maxRaw > 0 && maxRaw <= 1_000_000_000_000 ? maxRaw : null;
  const minBedrooms = positiveInteger(raw.beds, 20);
  const minBathrooms = positiveInteger(raw.baths, 20);
  const furnishedStatus = typeof raw.furnished === "string"
    && FURNISHED_OPTIONS.some(([value]) => value === raw.furnished)
    ? raw.furnished
    : "";
  const verifiedOnly = raw.verified === "true";
  const pageRaw = typeof raw.page === "string" ? Number(raw.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 && pageRaw <= 10000 ? pageRaw : 1;
  const result = await getCachedPublicSalePage(
    location,
    propertyType,
    minPrice,
    maxPrice,
    minBedrooms,
    minBathrooms,
    furnishedStatus,
    verifiedOnly,
    page,
  );
  const params = new URLSearchParams();
  if (location) params.set("location", location);
  if (propertyType) params.set("type", propertyType);
  if (minPrice !== null) params.set("min", String(minPrice));
  if (maxPrice !== null) params.set("max", String(maxPrice));
  if (minBedrooms !== null) params.set("beds", String(minBedrooms));
  if (minBathrooms !== null) params.set("baths", String(minBathrooms));
  if (furnishedStatus) params.set("furnished", furnishedStatus);
  if (verifiedOnly) params.set("verified", "true");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#FAF9F7]">
        

        <section className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5 sm:py-8 lg:px-6">
          {/* <header className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9C2454]">Property sales</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#1B1A2E] sm:text-3xl">Find a property</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5F5D69]">Homes, land and commercial listings.</p>
          </header> */}

          <form action="/for-sale" className="mb-6 grid grid-cols-2 items-end gap-2.5 rounded-xl border border-[#E6E2DC] bg-white p-3 shadow-sm sm:gap-3 sm:p-4 lg:hidden">
            <label className="col-span-2 text-sm font-medium text-[#383746] lg:col-span-1">
              Location
              <input name="location" defaultValue={location} maxLength={100} placeholder="Town, county or estate" className="mt-1 min-h-11 w-full rounded-lg border border-[#D9D5CF] px-3 py-2.5 text-base sm:text-sm" />
            </label>
            <label className="col-span-1 text-sm font-medium text-[#383746] lg:col-span-1">
              Property type
              <select name="type" defaultValue={propertyType} className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-[#D9D5CF] bg-white px-3 py-2.5 text-sm">
                {PROPERTY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <button type="submit" className="col-span-1 min-h-11 rounded-lg bg-[#9C2454] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] hover:bg-[#7D1D43] sm:px-4 lg:col-span-1">Search</button>
            <details className="col-span-2 rounded-lg border border-[#E6E2DC] px-3 py-2 lg:col-span-2" open={minPrice !== null || maxPrice !== null}>
              <summary className="min-h-6 cursor-pointer text-sm font-semibold text-[#383746]">
                Price range
                {(minPrice !== null || maxPrice !== null) && (
                  <span className="ml-2 font-normal text-[#6B6A78]">
                    {[minPrice, maxPrice]
                      .flatMap((value) => value === null ? [] : [price(value)])
                      .join(" – ")}
                  </span>
                )}
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-xs font-medium text-[#5F5D69]">
                  Minimum (KES)
                  <input name="min" type="number" min="1" inputMode="numeric" defaultValue={minPrice ?? ""} className="mt-1 min-h-11 w-full rounded-lg border border-[#D9D5CF] px-3 py-2.5 text-base sm:text-sm" />
                </label>
                <label className="text-xs font-medium text-[#5F5D69]">
                  Maximum (KES)
                  <input name="max" type="number" min="1" inputMode="numeric" defaultValue={maxPrice ?? ""} className="mt-1 min-h-11 w-full rounded-lg border border-[#D9D5CF] px-3 py-2.5 text-base sm:text-sm" />
                </label>
              </div>
            </details>
            <details className="col-span-2 rounded-lg border border-[#E6E2DC] px-3 py-2">
              <summary className="min-h-6 cursor-pointer text-sm font-semibold text-[#383746]">More filters</summary>
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-[#5F5D69]">
                    Bedrooms (min)
                    <input name="beds" type="number" min="1" max="20" inputMode="numeric" defaultValue={minBedrooms ?? ""} className="mt-1 min-h-11 w-full rounded-lg border border-[#D9D5CF] px-3 py-2.5 text-base sm:text-sm" />
                  </label>
                  <label className="text-xs font-medium text-[#5F5D69]">
                    Bathrooms (min)
                    <input name="baths" type="number" min="1" max="20" inputMode="numeric" defaultValue={minBathrooms ?? ""} className="mt-1 min-h-11 w-full rounded-lg border border-[#D9D5CF] px-3 py-2.5 text-base sm:text-sm" />
                  </label>
                </div>
                <label className="block text-xs font-medium text-[#5F5D69]">
                  Furnishing
                  <select name="furnished" defaultValue={furnishedStatus} className="mt-1 min-h-11 w-full rounded-lg border border-[#D9D5CF] bg-white px-3 py-2.5 text-sm">
                    {FURNISHED_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-[#383746]">
                  <input name="verified" type="checkbox" value="true" defaultChecked={verifiedOnly} className="h-4 w-4 accent-[#9C2454]" />
                  Verified properties only
                </label>
              </div>
            </details>
          </form>

          <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)] xl:gap-6">
            <aside className="hidden lg:block">
              <form action="/for-sale" className="sticky top-24 max-h-[calc(100dvh-112px)] space-y-4 overflow-y-auto rounded-2xl border border-[#E6E2DC] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-[#EEEAE5] pb-3">
                  <h2 className="text-lg font-semibold text-[#1B1A2E]">Filters</h2>
                  <Link href="/for-sale" className="text-xs font-semibold text-[#9C2454] underline">Clear all</Link>
                </div>
                <label className="block text-sm font-medium text-[#383746]">
                  Location
                  <input name="location" defaultValue={location} maxLength={100} placeholder="Town, county or estate" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#D9D5CF] px-3 py-2.5 text-sm" />
                </label>
                <label className="block text-sm font-medium text-[#383746]">
                  Property type
                  <select name="type" defaultValue={propertyType} className="mt-1.5 min-h-11 w-full rounded-lg border border-[#D9D5CF] bg-white px-3 py-2.5 text-sm">
                    {PROPERTY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <fieldset className="border-t border-[#EEEAE5] pt-3">
                  <legend className="mb-2 text-sm font-semibold text-[#383746]">Price range</legend>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs font-medium text-[#5F5D69]">
                      Minimum (KES)
                      <input name="min" type="number" min="1" inputMode="numeric" defaultValue={minPrice ?? ""} className="mt-1 min-h-10 w-full rounded-lg border border-[#D9D5CF] px-3 py-2 text-sm" />
                    </label>
                    <label className="text-xs font-medium text-[#5F5D69]">
                      Maximum (KES)
                      <input name="max" type="number" min="1" inputMode="numeric" defaultValue={maxPrice ?? ""} className="mt-1 min-h-10 w-full rounded-lg border border-[#D9D5CF] px-3 py-2 text-sm" />
                    </label>
                  </div>
                </fieldset>
                <fieldset className="border-t border-[#EEEAE5] pt-3">
                  <legend className="mb-2 text-sm font-semibold text-[#383746]">Rooms</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-medium text-[#5F5D69]">
                      Bedrooms (min)
                      <input name="beds" type="number" min="1" max="20" inputMode="numeric" defaultValue={minBedrooms ?? ""} className="mt-1 min-h-10 w-full rounded-lg border border-[#D9D5CF] px-3 py-2 text-sm" />
                    </label>
                    <label className="text-xs font-medium text-[#5F5D69]">
                      Bathrooms (min)
                      <input name="baths" type="number" min="1" max="20" inputMode="numeric" defaultValue={minBathrooms ?? ""} className="mt-1 min-h-10 w-full rounded-lg border border-[#D9D5CF] px-3 py-2 text-sm" />
                    </label>
                  </div>
                </fieldset>
                <label className="block border-t border-[#EEEAE5] pt-3 text-sm font-medium text-[#383746]">
                  Furnishing
                  <select name="furnished" defaultValue={furnishedStatus} className="mt-1.5 min-h-11 w-full rounded-lg border border-[#D9D5CF] bg-white px-3 py-2.5 text-sm">
                    {FURNISHED_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="flex min-h-11 items-center gap-2 border-t border-[#EEEAE5] pt-3 text-sm font-medium text-[#383746]">
                  <input name="verified" type="checkbox" value="true" defaultChecked={verifiedOnly} className="h-4 w-4 accent-[#9C2454]" />
                  Verified properties only
                </label>
                <div className="sticky bottom-0 bg-white pt-2">
                  <button type="submit" className="min-h-11 w-full rounded-lg bg-[#9C2454] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7D1D43]">Apply filters</button>
                </div>
              </form>
            </aside>

            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#1B1A2E] sm:text-xl">Properties for sale</h2>
                  <p className="mt-1 text-sm text-[#6B6A78]">{result.properties.length} {result.properties.length === 1 ? "property" : "properties"} shown · Page {result.page}</p>
                </div>
                <Link href="/shortlist" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#E6E2DC] bg-white px-3 py-2 text-sm font-semibold text-[#383746] shadow-sm hover:border-[#9C2454] hover:text-[#9C2454]">
                  <Heart aria-hidden="true" size={16} />
                  Shortlist
                </Link>
              </div>

              <SalePropertyResults
                properties={result.properties}
                page={result.page}
                hasNextPage={result.hasNextPage}
                previousPageHref={pageHref(params, page - 1)}
                nextPageHref={pageHref(params, page + 1)}
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
