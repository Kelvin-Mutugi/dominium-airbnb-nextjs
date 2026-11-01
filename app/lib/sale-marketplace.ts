export const MAX_SALE_PROPERTY_IMAGES = 15;
export const MAX_SALE_PROPERTY_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_SALE_PROPERTY_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function parseRequiredNumber(value: unknown, label: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a valid number.`);
  return parsed;
}

export function parseOptionalNumber(value: unknown, label: string): number | null {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  return parseRequiredNumber(value, label);
}

export type SaleAmountPeriod = "monthly" | "annual";

export function normalizeSaleAmountToMonthly(
  amount: number | string | null,
  period: SaleAmountPeriod,
): number | null {
  if (amount === null) return null;
  const parsed = parseRequiredNumber(amount, "Amount");
  if (parsed < 0) throw new Error("Amount cannot be negative.");
  return period === "annual" ? parsed / 12 : parsed;
}

export function getSalePropertyMapCoordinates(input: {
  showExactLocation: boolean;
  propertyLat: number | null;
  propertyLng: number | null;
  neighborhoodLat: number | null;
  neighborhoodLng: number | null;
}) {
  const isValidPair = (lat: number | null, lng: number | null) =>
    lat !== null
    && lng !== null
    && Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180;

  if (input.showExactLocation && isValidPair(input.propertyLat, input.propertyLng)) {
    return { lat: input.propertyLat, lng: input.propertyLng };
  }
  if (isValidPair(input.neighborhoodLat, input.neighborhoodLng)) {
    return { lat: input.neighborhoodLat, lng: input.neighborhoodLng };
  }
  return { lat: null, lng: null };
}

export function normalizeKenyanPhone(value: unknown): string | null {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  if (typeof value !== "string") throw new Error("Enter a valid Kenyan phone number.");

  const compact = value.trim().replace(/[\s().-]/g, "");
  let national: string;
  if (/^\+254[17]\d{8}$/.test(compact)) {
    national = compact.slice(4);
  } else if (/^254[17]\d{8}$/.test(compact)) {
    national = compact.slice(3);
  } else if (/^0[17]\d{8}$/.test(compact)) {
    national = compact.slice(1);
  } else if (/^[17]\d{8}$/.test(compact)) {
    national = compact;
  } else {
    throw new Error("Enter a valid Kenyan phone number.");
  }
  return `+254${national}`;
}

export type SaleInquiryInput = {
  propertyId: string;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  interestType: string | null;
  buyerFunding: "cash" | "mortgage" | "unsure" | null;
  timeline: string | null;
  preferredContact: "phone" | "email" | "whatsapp" | null;
  source: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

function optionalShortText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) || null : null;
}

export function validateSaleInquiryInput(input: Record<string, unknown>): SaleInquiryInput {
  const propertyId = typeof input.propertyId === "string" ? input.propertyId : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = optionalShortText(input.email, 254)?.toLowerCase() ?? null;
  const phone = normalizeKenyanPhone(input.phone);
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const interestType = optionalShortText(input.interestType, 60);
  const rawFunding = optionalShortText(input.buyerFunding, 20);
  const buyerFunding =
    rawFunding === "cash" || rawFunding === "mortgage" || rawFunding === "unsure"
      ? rawFunding
      : null;
  const timeline = optionalShortText(input.timeline, 100);
  const rawPreferredContact = optionalShortText(input.preferredContact, 20);
  const preferredContact =
    rawPreferredContact === "phone" || rawPreferredContact === "email" || rawPreferredContact === "whatsapp"
      ? rawPreferredContact
      : null;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(propertyId) ||
    name.length < 2 ||
    name.length > 100 ||
    !phone ||
    (email !== null && (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254)) ||
    message.length < 10 ||
    message.length > 1200 ||
    (rawFunding !== null && buyerFunding === null) ||
    (rawPreferredContact !== null && preferredContact === null) ||
    (preferredContact === "email" && !email)
  ) {
    throw new Error("Please check your name, phone, email, and message.");
  }

  return {
    propertyId,
    name,
    phone,
    email,
    message,
    interestType,
    buyerFunding,
    timeline,
    preferredContact,
    source: optionalShortText(input.source, 100),
    utmSource: optionalShortText(input.utmSource, 100),
    utmMedium: optionalShortText(input.utmMedium, 100),
    utmCampaign: optionalShortText(input.utmCampaign, 100),
  };
}

export function assertSalePropertyCanPublish(input: {
  status: string;
  photoCount: number;
  askingPrice: number;
  locationId: string | null;
}) {
  if (input.status !== "published") return;
  if (!Number.isFinite(input.askingPrice) || input.askingPrice <= 0) {
    throw new Error("Enter a valid asking price before publishing.");
  }
  if (!input.locationId) throw new Error("Choose a neighborhood before publishing.");
  if (!Number.isInteger(input.photoCount) || input.photoCount < 1) {
    throw new Error("Add at least one photo before publishing.");
  }
}

export const SALE_RECOMMENDATION_WEIGHTS = {
  budget: 0.2,
  neighborhood: 0.15,
  mustHaves: 0.2,
  similarity: 0.18,
  popularity: 0.1,
  freshness: 0.08,
  quality: 0.09,
  nearMissPenalty: 0.15,
} as const;

export type SaleRecommendationCandidate = {
  id: string;
  propertyType: string;
  status: string;
  price: number;
  neighborhoodId: string | null;
  townId: string | null;
  amenities: readonly string[];
  isVerified: boolean;
  photoCount: number;
  completeness: number;
  createdAt: string;
  recentEventCount: number;
  mostRecentEventAt: string | null;
  similarity: number;
};

export type SaleRecommendationPreferences = {
  propertyType?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  locationIds?: readonly string[];
  neighborhoodId?: string | null;
  townId?: string | null;
  mustHaves?: readonly string[];
};

export function passesSaleRecommendationFilters(
  candidate: SaleRecommendationCandidate,
  preferences: SaleRecommendationPreferences,
) {
  if (candidate.status !== "published") return false;
  if (preferences.propertyType && candidate.propertyType !== preferences.propertyType) return false;
  if (preferences.minPrice != null && candidate.price < preferences.minPrice) return false;
  if (preferences.maxPrice != null && candidate.price > preferences.maxPrice) return false;
  if (preferences.locationIds?.length) {
    const candidateLocationIds = [candidate.neighborhoodId, candidate.townId];
    if (!candidateLocationIds.some((id) => id && preferences.locationIds?.includes(id))) return false;
  }
  return true;
}

function boundedFraction(numerator: number, denominator: number) {
  return denominator <= 0 ? 1 : Math.max(0, Math.min(1, numerator / denominator));
}

export function scoreSalePropertyRecommendation(
  candidate: SaleRecommendationCandidate,
  preferences: SaleRecommendationPreferences,
  now = Date.now(),
) {
  const weights = SALE_RECOMMENDATION_WEIGHTS;
  const minPrice = preferences.minPrice ?? 0;
  const maxPrice = preferences.maxPrice ?? Number.POSITIVE_INFINITY;
  const budgetSpan = Number.isFinite(maxPrice) ? Math.max(maxPrice - minPrice, 1) : Math.max(candidate.price, 1);
  const budgetDistance =
    candidate.price < minPrice
      ? minPrice - candidate.price
      : candidate.price > maxPrice
        ? candidate.price - maxPrice
        : 0;
  const budget = budgetDistance === 0 ? 1 : Math.max(0, 1 - budgetDistance / budgetSpan);
  const sameNeighborhood = Boolean(
    preferences.neighborhoodId && candidate.neighborhoodId === preferences.neighborhoodId,
  );
  const sameTown = Boolean(preferences.townId && candidate.townId === preferences.townId);
  const neighborhood = sameNeighborhood ? 1 : sameTown ? 0.6 : 0;

  const mustHaves = preferences.mustHaves ?? [];
  const matchedMustHaves = mustHaves.filter((item) => candidate.amenities.includes(item)).length;
  const mustHaveMatch = mustHaves.length ? matchedMustHaves / mustHaves.length : 1;
  const nearMiss = mustHaves.length ? (mustHaves.length - matchedMustHaves) / mustHaves.length : 0;

  const createdAt = Date.parse(candidate.createdAt);
  const ageDays = Number.isFinite(createdAt) ? Math.max(0, (now - createdAt) / 86_400_000) : 365;
  const freshness = Math.exp(-ageDays / 30);
  const eventTime = candidate.mostRecentEventAt ? Date.parse(candidate.mostRecentEventAt) : Number.NaN;
  const eventAgeDays = Number.isFinite(eventTime) ? Math.max(0, (now - eventTime) / 86_400_000) : 365;
  const popularity = Math.min(candidate.recentEventCount / 10, 1) * Math.exp(-eventAgeDays / 14);
  const quality =
    (candidate.isVerified ? 0.45 : 0) +
    0.3 * boundedFraction(candidate.photoCount, MAX_SALE_PROPERTY_IMAGES) +
    0.25 * Math.max(0, Math.min(1, candidate.completeness));
  const boundedSimilarity = Math.max(0, Math.min(1, candidate.similarity));

  return (
    weights.budget * budget +
    weights.neighborhood * neighborhood +
    weights.mustHaves * mustHaveMatch +
    weights.similarity * boundedSimilarity +
    weights.popularity * popularity +
    weights.freshness * freshness +
    weights.quality * quality -
    weights.nearMissPenalty * nearMiss
  );
}
