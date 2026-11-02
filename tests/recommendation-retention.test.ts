import assert from "node:assert/strict";
import test from "node:test";
import {
  listingAlertSchema,
  savedSearchSchema,
  unsubscribeSchema,
} from "../app/lib/recs/retention-schema.ts";
import {
  buildAlertMessage,
  buildUnsubscribeUrl,
} from "../app/lib/recs/notifications.ts";

const validContact = {
  contactChannel: "email",
  contactValue: "guest@example.com",
  consent: true,
} as const;

const validFilters = {
  location: "Nairobi",
  checkIn: "",
  checkOut: "",
  guests: 2,
  category: "all",
  minPrice: 0,
  maxPrice: 50_000,
  propertyType: null,
  bedrooms: null,
  amenities: [],
  petFriendly: false,
  groupStayOnly: false,
  instantBooking: false,
  minRating: null,
};

test("saved searches require valid filters and explicit contact consent", () => {
  assert.equal(
    savedSearchSchema.safeParse({
      filters: validFilters,
      contact: validContact,
    }).success,
    true,
  );
  assert.equal(
    savedSearchSchema.safeParse({
      filters: validFilters,
      contact: { ...validContact, consent: false },
    }).success,
    false,
  );
  assert.equal(
    savedSearchSchema.safeParse({
      filters: { ...validFilters, maxPrice: -1 },
      contact: validContact,
    }).success,
    false,
  );
});

test("WhatsApp contact validation accepts Kenyan numbers and rejects invalid values", () => {
  const whatsappSearch = {
    filters: validFilters,
    contact: {
      contactChannel: "whatsapp",
      contactValue: "+254 712 345 678",
      consent: true,
    },
  };
  assert.equal(savedSearchSchema.safeParse(whatsappSearch).success, true);
  assert.equal(
    savedSearchSchema.safeParse({
      ...whatsappSearch,
      contact: { ...whatsappSearch.contact, contactValue: "not a phone" },
    }).success,
    false,
  );
});

test("availability alerts require an ordered date range", () => {
  const alertBase = {
    listingId: "123e4567-e89b-42d3-a456-426614174000",
    alertType: "availability",
    contact: validContact,
  };
  assert.equal(
    listingAlertSchema.safeParse({
      ...alertBase,
      checkIn: "2026-12-10",
      checkOut: "2026-12-12",
    }).success,
    true,
  );
  assert.equal(
    listingAlertSchema.safeParse({
      ...alertBase,
      checkIn: "2026-12-12",
      checkOut: "2026-12-10",
    }).success,
    false,
  );
  assert.equal(
    listingAlertSchema.safeParse({
      ...alertBase,
      checkIn: "2026-12-10",
    }).success,
    false,
  );
});

test("unsubscribe tokens and alert messages are validated and actionable", () => {
  const token = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(unsubscribeSchema.safeParse({ token }).success, true);
  assert.equal(unsubscribeSchema.safeParse({ token: "bad-token" }).success, false);

  const unsubscribeUrl = buildUnsubscribeUrl(token, "https://example.test");
  assert.equal(
    unsubscribeUrl,
    `https://example.test/recs/unsubscribe?token=${token}`,
  );
  const message = buildAlertMessage({
    alertType: "price_drop",
    listingTitle: "Nairobi stay",
    previousPrice: 8000,
    currentPrice: 7000,
    unsubscribeUrl,
  });
  assert.match(message, /KES 7,000/);
  assert.match(message, new RegExp(unsubscribeUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
