import test from "node:test";
import assert from "node:assert/strict";

import {
  BROWSE_CATEGORIES,
  BROWSE_CATEGORY_LABELS,
  LISTING_CATEGORY_PROPERTY_TYPE_TERMS,
  getVisibleBarCategories,
  isBrowseCategory,
  isListingCategory,
  matchesDerivedCategory,
} from "../app/lib/listing-categories.ts";

test("browse category labels and validation share one category list", () => {
  for (const { id, label } of BROWSE_CATEGORIES) {
    assert.equal(isBrowseCategory(id), true);
    assert.equal(BROWSE_CATEGORY_LABELS[id], label);
  }

  assert.equal(isBrowseCategory(null), false);
  assert.equal(isBrowseCategory("unknown"), false);
});

test("only host-assigned listing categories are accepted as listing tags", () => {
  assert.equal(isListingCategory("apartments"), true);
  assert.equal(isListingCategory("rare"), false);
  assert.equal(isListingCategory("all"), false);
});

test("home categories also map to legacy property-type values", () => {
  assert.deepEqual(LISTING_CATEGORY_PROPERTY_TYPE_TERMS.apartments, [
    "apartment",
    "flat",
  ]);
  assert.deepEqual(LISTING_CATEGORY_PROPERTY_TYPE_TERMS.villas, ["villa"]);
  assert.deepEqual(LISTING_CATEGORY_PROPERTY_TYPE_TERMS.cabins, ["cabin"]);
});

test("the category bar shows business travel and hides other sparse categories", () => {
  assert.deepEqual(
    getVisibleBarCategories({ budget: 5, family: 4, work: 0 }),
    ["all", "budget", "business-travel"],
  );
  assert.deepEqual(
    getVisibleBarCategories({ budget: 1 }, "work"),
    ["all", "work", "business-travel"],
  );
  assert.deepEqual(
    getVisibleBarCategories({
      work: 5,
      "business-travel": 5,
      secure: 5,
    }).slice(1, 4),
    ["work", "business-travel", "secure"],
  );
  assert.equal(
    getVisibleBarCategories({
      city: 10,
      "pet-friendly": 10,
    }).some((category) => ["city", "pet-friendly"].includes(category)),
    false,
  );
  const categoriesWithPicks = getVisibleBarCategories({ rare: 5 });
  assert.equal(categoriesWithPicks.at(-1), "rare");
  assert.equal(BROWSE_CATEGORY_LABELS.rare, "Dominium picks");
  assert.equal(getVisibleBarCategories({ rare: 4 }).includes("rare"), false);
  assert.equal(
    getVisibleBarCategories({ "business-travel": 0 }).includes(
      "business-travel",
    ),
    true,
  );
});

test("derived categories use the Kenya stay-discovery rules", () => {
  assert.equal(matchesDerivedCategory({ pricePerNight: 4999 }, "budget"), true);
  assert.equal(matchesDerivedCategory({ pricePerNight: 5000 }, "budget"), false);
  assert.equal(
    matchesDerivedCategory({ loc: "Naivasha, Nakuru" }, "weekend"),
    true,
  );
  assert.equal(
    matchesDerivedCategory(
      { hasWorkspace: true, wifiMbps: 20, backupPower: "solar" },
      "work",
    ),
    true,
  );
  const businessStay = {
    hasWorkspace: true,
    wifiMbps: 20,
    backupPower: "solar" as const,
    instantBook: true,
  };
  assert.equal(
    matchesDerivedCategory(businessStay, "business-travel"),
    true,
  );
  assert.equal(
    matchesDerivedCategory(
      { ...businessStay, instantBook: false },
      "business-travel",
    ),
    false,
  );
  assert.equal(
    matchesDerivedCategory(
      { ...businessStay, backupPower: "none" },
      "business-travel",
    ),
    false,
  );
  assert.equal(
    matchesDerivedCategory(
      { securityFeatures: ["gated", "guard_24h"] },
      "secure",
    ),
    true,
  );
  assert.equal(matchesDerivedCategory({ monthlyRate: 1 }, "long-stays"), true);
  assert.equal(
    matchesDerivedCategory({ parkDistanceKm: 20 }, "safari"),
    true,
  );
  assert.equal(
    matchesDerivedCategory({ parkDistanceKm: 20.1 }, "safari"),
    false,
  );
});
