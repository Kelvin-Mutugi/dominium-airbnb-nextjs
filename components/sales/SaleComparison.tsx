"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  buildSaleComparisonRows,
  getDifferentSaleComparisonRows,
  saleAcquisitionEstimateNote,
} from "@/app/lib/sale-shortlist";
import { SalePropertyPhotoCarousel } from "@/components/sales/SalePropertyPhotoCarousel";
import type { PublicSaleProperty } from "@/app/lib/sale-properties";

export function SaleComparison({ properties }: { properties: PublicSaleProperty[] }) {
  const [showAll, setShowAll] = useState(false);
  const [activePropertyIndex, setActivePropertyIndex] = useState(0);
  const rows = useMemo(() => buildSaleComparisonRows(properties), [properties]);
  const visibleRows = showAll ? rows : getDifferentSaleComparisonRows(rows);
  const selectedPropertyIndex = Math.min(activePropertyIndex, properties.length - 1);
  const activeProperty = properties[selectedPropertyIndex];

  if (properties.length < 2) return null;

  return (
    <section className="mt-8 rounded-xl border border-[#E6E2DC] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1B1A2E]">Compare your shortlist</h2>
          <p className="mt-1 text-sm text-[#6B6A78]">
            {showAll ? "Showing every detail." : "Showing only details that differ."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="min-h-10 rounded-lg border border-[#D9D5CF] px-3 py-2 text-sm font-semibold text-[#383746] hover:bg-[#FAF9F7]"
        >
          {showAll ? "Show differences only" : "Show everything"}
        </button>
      </div>
      <div className="mt-4 md:hidden">
        {visibleRows.length ? (
          <>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="group" aria-label="Choose a property to compare">
              {properties.map((property, index) => (
                <button
                  key={property.id}
                  type="button"
                  aria-pressed={index === selectedPropertyIndex}
                  onClick={() => setActivePropertyIndex(index)}
                  className={`min-h-10 max-w-[72vw] shrink-0 truncate rounded-full border px-3 py-2 text-xs font-semibold transition ${index === selectedPropertyIndex ? "border-[#9C2454] bg-[#F6EAF0] text-[#7D1D43]" : "border-[#D9D5CF] bg-white text-[#5F5D69]"}`}
                >
                  {index + 1}. {property.title}
                </button>
              ))}
            </div>
            <article className="mt-2 overflow-hidden rounded-xl border border-[#E6E2DC] bg-white">
              {activeProperty && (
                <>
                  <SalePropertyPhotoCarousel
                    images={[
                      ...activeProperty.sale_property_images.filter((image) => image.is_cover),
                      ...activeProperty.sale_property_images.filter((image) => !image.is_cover),
                    ]}
                    propertyTitle={activeProperty.title}
                    propertySlug={activeProperty.slug}
                    className="aspect-[4/3]"
                    noPhotoMessage="No photo available"
                  />
                  <Link href={`/for-sale/${activeProperty.slug}`} className="block p-3.5">
                    <p className="text-base font-semibold text-[#9C2454]">{activeProperty.title}</p>
                    <p className="mt-1 text-lg font-bold text-[#1B1A2E]">
                      KES {Number(activeProperty.asking_price).toLocaleString("en-KE", { maximumFractionDigits: 0 })}
                    </p>
                  </Link>
                  <dl className="divide-y divide-[#EEEAE5] px-3.5">
                    {visibleRows.map((row) => (
                      <div key={row.label} className="flex items-start justify-between gap-4 py-3">
                        <dt className="text-xs font-medium text-[#6B6A78]">{row.label}</dt>
                        <dd className="max-w-[58%] text-right text-xs font-semibold capitalize text-[#383746]">
                          {row.values[selectedPropertyIndex]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </article>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActivePropertyIndex(Math.max(0, selectedPropertyIndex - 1))}
                disabled={selectedPropertyIndex === 0}
                className="min-h-10 rounded-lg border border-[#D9D5CF] px-3 py-2 text-sm font-semibold text-[#383746] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous property
              </button>
              <span className="text-xs font-medium text-[#6B6A78]">
                {selectedPropertyIndex + 1} of {properties.length}
              </span>
              <button
                type="button"
                onClick={() => setActivePropertyIndex(Math.min(properties.length - 1, selectedPropertyIndex + 1))}
                disabled={selectedPropertyIndex === properties.length - 1}
                className="min-h-10 rounded-lg border border-[#D9D5CF] px-3 py-2 text-sm font-semibold text-[#383746] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next property
              </button>
            </div>
          </>
        ) : (
          <p className="rounded-lg bg-[#FAF9F7] p-4 text-sm text-[#6B6A78]">
            Everything shown is the same. Turn on “Show everything” to review each detail.
          </p>
        )}
      </div>
      <div className="mt-4 hidden overflow-x-auto rounded-lg border border-[#E6E2DC] md:block">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#FAF9F7]">
              <th scope="col" className="sticky left-0 z-10 w-32 border-b border-[#E6E2DC] bg-[#FAF9F7] p-3 font-semibold text-[#383746]">
                <span className="sr-only">Comparison details</span>
              </th>
              {properties.map((property) => {
                const images = [
                  ...property.sale_property_images.filter((image) => image.is_cover),
                  ...property.sale_property_images.filter((image) => !image.is_cover),
                ];
                return (
                  <th key={property.id} scope="col" className="min-w-52 border-b border-[#E6E2DC] p-3 align-top">
                    <Link href={`/for-sale/${property.slug}`} className="font-semibold text-[#9C2454] hover:underline">
                      {property.title}
                    </Link>
                    <SalePropertyPhotoCarousel
                      images={images}
                      propertyTitle={property.title}
                      propertySlug={property.slug}
                      className="mt-2 aspect-[4/3] rounded-md"
                      noPhotoMessage="No photo available"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length ? visibleRows.map((row) => (
              <tr key={row.label} className="odd:bg-white even:bg-[#FCFBFA]">
                <th scope="row" className="sticky left-0 border-b border-[#EEEAE5] bg-inherit p-3 font-medium capitalize text-[#5F5D69]">{row.label}</th>
                {row.values.map((value, index) => (
                  <td key={`${properties[index].id}-${row.label}`} className="border-b border-[#EEEAE5] p-3 text-[#383746]">{value}</td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={properties.length + 1} className="p-5 text-center text-sm text-[#6B6A78]">
                  Everything shown is the same. Turn on “Show everything” to review each detail.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <details className="mt-3 text-xs leading-5 text-[#6B6A78]">
        <summary className="cursor-pointer font-semibold">About the purchase-cost estimate</summary>
        <p className="mt-1">{saleAcquisitionEstimateNote}</p>
      </details>
    </section>
  );
}
