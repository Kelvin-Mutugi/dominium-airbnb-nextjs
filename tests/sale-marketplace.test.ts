import test from "node:test";
import assert from "node:assert/strict";

import {
  assertSalePropertyCanPublish,
  getSalePropertyMapCoordinates,
  normalizeKenyanPhone,
  normalizeSaleAmountToMonthly,
  parseOptionalNumber,
  parseRequiredNumber,
  passesSaleRecommendationFilters,
  scoreSalePropertyRecommendation,
  validateSaleInquiryInput,
  type SaleRecommendationCandidate,
} from "../app/lib/sale-marketplace.ts";

test("number parsing does not coerce empty strings or NaN to zero", () => {
  assert.equal(parseOptionalNumber("", "Plot size"), null);
  assert.equal(parseOptionalNumber("  ", "Plot size"), null);
  assert.equal(parseRequiredNumber("1250000", "Asking price"), 1_250_000);
  assert.throws(() => parseRequiredNumber("", "Asking price"), /valid number/);
  assert.throws(() => parseRequiredNumber(Number.NaN, "Asking price"), /valid number/);
});

test("Kenyan phone numbers are normalized to +254", () => {
  assert.equal(normalizeKenyanPhone("0712 345 678"), "+254712345678");
  assert.equal(normalizeKenyanPhone("+254 112-345-678"), "+254112345678");
  assert.equal(normalizeKenyanPhone("254712345678"), "+254712345678");
  assert.equal(normalizeKenyanPhone(""), null);
  assert.throws(() => normalizeKenyanPhone("12345"), /Kenyan phone number/);
});

test("annual sale charges normalize to monthly amounts", () => {
  assert.equal(normalizeSaleAmountToMonthly(12_000, "annual"), 1_000);
  assert.equal(normalizeSaleAmountToMonthly("1500", "monthly"), 1_500);
  assert.equal(normalizeSaleAmountToMonthly(null, "annual"), null);
  assert.throws(() => normalizeSaleAmountToMonthly(-1, "monthly"), /negative/);
  assert.throws(() => normalizeSaleAmountToMonthly("invalid", "annual"), /valid number/);
});

test("sale maps use neighborhood coordinates unless exact location is explicitly public", () => {
  assert.deepEqual(
    getSalePropertyMapCoordinates({
      showExactLocation: false,
      propertyLat: -1.3001,
      propertyLng: 36.8001,
      neighborhoodLat: -1.2921,
      neighborhoodLng: 36.785,
    }),
    { lat: -1.2921, lng: 36.785 },
  );
  assert.deepEqual(
    getSalePropertyMapCoordinates({
      showExactLocation: true,
      propertyLat: -1.3001,
      propertyLng: 36.8001,
      neighborhoodLat: -1.2921,
      neighborhoodLng: 36.785,
    }),
    { lat: -1.3001, lng: 36.8001 },
  );
  assert.deepEqual(
    getSalePropertyMapCoordinates({
      showExactLocation: true,
      propertyLat: 91,
      propertyLng: 36.8,
      neighborhoodLat: -1.2921,
      neighborhoodLng: 36.785,
    }),
    { lat: -1.2921, lng: 36.785 },
  );
});

test("sale inquiries require a phone and validate optional contact preferences", () => {
  const valid = validateSaleInquiryInput({
    propertyId: "123e4567-e89b-42d3-a456-426614174000",
    name: "Buyer Name",
    phone: "0712 345 678",
    email: "",
    message: "Please share more details about this listing.",
    buyerFunding: "cash",
    preferredContact: "phone",
  });
  assert.equal(valid.phone, "+254712345678");
  assert.equal(valid.email, null);
  assert.equal(valid.buyerFunding, "cash");
  assert.throws(
    () => validateSaleInquiryInput({
      propertyId: "123e4567-e89b-42d3-a456-426614174000",
      name: "Buyer Name",
      phone: "",
      message: "Please share more details.",
    }),
    /phone/,
  );
  assert.throws(
    () => validateSaleInquiryInput({
      propertyId: "123e4567-e89b-42d3-a456-426614174000",
      name: "Buyer Name",
      phone: "0712345678",
      email: "",
      message: "Please share more details.",
      preferredContact: "email",
    }),
    /check your name/,
  );
});

test("publishing requires a valid price, location, and at least one photo", () => {
  assert.doesNotThrow(() =>
    assertSalePropertyCanPublish({
      status: "draft",
      photoCount: 0,
      askingPrice: 0,
      locationId: null,
    }),
  );
  assert.throws(() =>
    assertSalePropertyCanPublish({
      status: "published",
      photoCount: 0,
      askingPrice: 100,
      locationId: "neighborhood-id",
    }),
  );
  assert.throws(() =>
    assertSalePropertyCanPublish({
      status: "published",
      photoCount: 1,
      askingPrice: Number.NaN,
      locationId: "neighborhood-id",
    }),
  );
  assert.throws(() =>
    assertSalePropertyCanPublish({
      status: "published",
      photoCount: 1,
      askingPrice: 100,
      locationId: null,
    }),
  );
});

test("recommendation filters are hard constraints and score quality and match", () => {
  const candidate: SaleRecommendationCandidate = {
    id: "p1",
    propertyType: "apartment",
    status: "published",
    price: 10_000_000,
    neighborhoodId: "kilimani",
    townId: "nairobi",
    amenities: ["parking", "balcony"],
    isVerified: true,
    photoCount: 8,
    completeness: 0.9,
    createdAt: "2026-10-25T00:00:00.000Z",
    recentEventCount: 8,
    mostRecentEventAt: "2026-10-31T23:00:00.000Z",
    similarity: 0.8,
  };
  const preferences = {
    propertyType: "apartment",
    minPrice: 8_000_000,
    maxPrice: 12_000_000,
    neighborhoodId: "kilimani",
    townId: "nairobi",
    mustHaves: ["parking", "balcony"],
  };
  assert.equal(passesSaleRecommendationFilters(candidate, preferences), true);
  assert.equal(
    passesSaleRecommendationFilters(candidate, { ...preferences, maxPrice: 9_000_000 }),
    false,
  );
  assert.equal(
    passesSaleRecommendationFilters(candidate, { ...preferences, propertyType: "land" }),
    false,
  );
  assert.ok(scoreSalePropertyRecommendation(candidate, preferences, Date.parse("2026-11-01")) > 0.5);
  assert.ok(
    scoreSalePropertyRecommendation(
      { ...candidate, isVerified: false, amenities: [], photoCount: 1, completeness: 0.2 },
      preferences,
      Date.parse("2026-11-01"),
    ) < scoreSalePropertyRecommendation(candidate, preferences, Date.parse("2026-11-01")),
  );
});
