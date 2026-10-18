import test from "node:test";
import assert from "node:assert/strict";

import {
  BROWSE_CATEGORIES,
  BROWSE_CATEGORY_LABELS,
  LISTING_CATEGORY_PROPERTY_TYPE_TERMS,
  isBrowseCategory,
  isListingCategory,
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
