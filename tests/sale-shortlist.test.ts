import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSaleComparisonRows,
  getDifferentSaleComparisonRows,
  parseSaleShortlistIds,
  parseSaleShortlistOwner,
  type SaleShortlistOwner,
} from "../app/lib/sale-shortlist.ts";
import type { PublicSaleProperty } from "../app/lib/sale-properties.ts";

function property(overrides: Partial<PublicSaleProperty> = {}): PublicSaleProperty {
  return {
    id: "123e4567-e89b-42d3-a456-426614174000",
    slug: "sample-property",
    title: "Sample property",
    description: "A sample property for comparison.",
    property_type: "apartment",
    asking_price: 10_000_000,
    county: "Nairobi",
    town: "Nairobi",
    neighborhood: "Kilimani",
    location_id: null,
    lat: null,
    lng: null,
    show_exact_location: false,
    bedrooms: 2,
    bathrooms: 2,
    size_sqm: 100,
    parking_spaces: 1,
    title_type: "leasehold",
    title_deed_status: "Available",
    service_charge: 12_000,
    service_charge_period: "monthly",
    land_rates: null,
    land_rates_period: "annual",
    furnished_status: "unfurnished",
    occupancy: "vacant",
    completion_status: "ready",
    year_built: 2020,
    floor_level: 3,
    plot_size_acres: null,
    zoning: null,
    road_access: null,
    is_verified: true,
    amenities: [],
    sale_property_images: [],
    ...overrides,
  };
}

test("shortlist IDs are validated, de-duplicated, and capped", () => {
  const ids = Array.from({ length: 22 }, (_, index) =>
    `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
  assert.deepEqual(parseSaleShortlistIds(JSON.stringify([ids[0], ids[0], "invalid"])), [ids[0]]);
  assert.equal(parseSaleShortlistIds(JSON.stringify(ids)).length, 20);
  assert.deepEqual(parseSaleShortlistIds("not-json"), []);
  assert.deepEqual(parseSaleShortlistIds(JSON.stringify({ ids })), []);
});

test("owner capability data is accepted only in the expected shape", () => {
  const owner: SaleShortlistOwner = {
    ownerToken: "a".repeat(43),
    sharePath: `/shortlist/${"b".repeat(43)}`,
  };
  assert.deepEqual(parseSaleShortlistOwner(JSON.stringify(owner)), owner);
  assert.equal(parseSaleShortlistOwner(JSON.stringify({ ...owner, sharePath: "https://example.com" })), null);
  assert.equal(parseSaleShortlistOwner("not-json"), null);
});

test("comparison exposes differences and converts annual costs to monthly equivalents", () => {
  const first = property();
  const second = property({
    id: "123e4567-e89b-42d3-a456-426614174001",
    slug: "other-property",
    title: "Other property",
    asking_price: 12_000_000,
    size_sqm: 120,
    neighborhood: "Kileleshwa",
    service_charge: 24_000,
    service_charge_period: "annual",
    is_verified: false,
  });
  const rows = buildSaleComparisonRows([first, second]);
  const monthlyCharge = rows.find((row) => row.label === "Service charge (monthly)");
  assert.deepEqual(monthlyCharge?.values, ["KES 12,000", "KES 2,000"]);
  assert.ok(rows.some((row) => row.label === "Stamp duty estimate"));
  assert.ok(rows.some((row) => row.label === "Estimated conveyancing fee"));
  assert.ok(rows.some((row) => row.label === "Estimated total to buy"));
  assert.ok(rows.some((row) => row.label === "Price per m²"));
  assert.ok(rows.some((row) => row.label === "Verification"));

  const differenceRows = getDifferentSaleComparisonRows(rows);
  assert.ok(differenceRows.some((row) => row.label === "Asking price"));
  assert.ok(!differenceRows.some((row) => row.label === "Bathrooms"));
});

test("identical details are hidden by the difference-only comparison", () => {
  const first = property();
  const second = property({
    id: "123e4567-e89b-42d3-a456-426614174001",
    slug: "another-sample",
  });
  const differenceRows = getDifferentSaleComparisonRows(buildSaleComparisonRows([first, second]));
  assert.ok(!differenceRows.some((row) => row.label === "Bedrooms"));
  assert.ok(!differenceRows.some((row) => row.label === "Verification"));
  assert.ok(differenceRows.some((row) => row.label === "Asking price") === false);
});
