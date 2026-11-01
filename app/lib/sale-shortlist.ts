import { normalizeSaleAmountToMonthly } from "./sale-marketplace.ts";
import type { PublicSaleProperty } from "./sale-properties.ts";

export const MAX_SALE_SHORTLIST_PROPERTIES = 20;
export const SALE_SHORTLIST_STORAGE_KEY = "dominium-sale-shortlist-v1";
export const SALE_SHORTLIST_OWNER_KEY = "dominium-sale-shortlist-owner-v1";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseSaleShortlistIds(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is string => typeof id === "string" && UUID.test(id)))]
      .slice(0, MAX_SALE_SHORTLIST_PROPERTIES);
  } catch {
    return [];
  }
}

export type SaleShortlistOwner = {
  ownerToken: string;
  sharePath: string;
};

export function parseSaleShortlistOwner(value: string | null): SaleShortlistOwner | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const owner = parsed as Record<string, unknown>;
    if (
      typeof owner.ownerToken !== "string"
      || !/^[A-Za-z0-9_-]{43}$/.test(owner.ownerToken)
      || typeof owner.sharePath !== "string"
      || !/^\/shortlist\/[A-Za-z0-9_-]{43}$/.test(owner.sharePath)
    ) return null;
    return { ownerToken: owner.ownerToken, sharePath: owner.sharePath };
  } catch {
    return null;
  }
}

const COST_ESTIMATE = {
  stampDutyLowRate: 0.02,
  stampDutyHighRate: 0.04,
  legalFeeMinimum: 35_000,
  legalFeeBands: [
    { upperLimit: 5_000_000, rate: 0.02 },
    { upperLimit: 100_000_000, rate: 0.015 },
    { upperLimit: Number.POSITIVE_INFINITY, rate: 0.01 },
  ],
} as const;

function estimateLegalFee(price: number) {
  let previousLimit = 0;
  let remainingPrice = price;
  let fee = 0;

  for (const band of COST_ESTIMATE.legalFeeBands) {
    const bandValue = Math.min(remainingPrice, band.upperLimit - previousLimit);
    if (bandValue <= 0) break;
    fee += bandValue * band.rate;
    remainingPrice -= bandValue;
    previousLimit = band.upperLimit;
  }
  return Math.max(COST_ESTIMATE.legalFeeMinimum, fee);
}

export function formatKes(amount: number) {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

export type SaleComparisonRow = {
  label: string;
  values: string[];
};

function valueText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function valueRow(label: string, values: Array<string | number | null | undefined>): SaleComparisonRow {
  return { label, values: values.map(valueText) };
}

export function buildSaleComparisonRows(properties: PublicSaleProperty[]): SaleComparisonRow[] {
  const prices = properties.map((property) => Number(property.asking_price));
  const location = (property: PublicSaleProperty) =>
    [property.neighborhood, property.town, property.county].filter(Boolean).join(", ");
  const monthlyAmount = (
    amount: number | string | null,
    period: "monthly" | "annual",
  ) => {
    if (amount === null) return null;
    const monthly = normalizeSaleAmountToMonthly(amount, period);
    return monthly === null ? null : formatKes(monthly);
  };
  const acquisitionEstimate = (price: number) => {
    if (!Number.isFinite(price) || price <= 0) return "Unavailable";
    const legalFee = estimateLegalFee(price);
    const lowTotal = price + legalFee + price * COST_ESTIMATE.stampDutyLowRate;
    const highTotal = price + legalFee + price * COST_ESTIMATE.stampDutyHighRate;
    return `${formatKes(lowTotal)}–${formatKes(highTotal)}`;
  };
  const stampDutyEstimate = (price: number) => {
    if (!Number.isFinite(price) || price <= 0) return "Unavailable";
    return `${formatKes(price * COST_ESTIMATE.stampDutyLowRate)}–${formatKes(price * COST_ESTIMATE.stampDutyHighRate)}`;
  };

  return [
    valueRow("Asking price", properties.map((property) => formatKes(Number(property.asking_price)))),
    valueRow("Price per m²", properties.map((property) => {
      const size = Number(property.size_sqm);
      return Number.isFinite(size) && size > 0
        ? `${formatKes(Number(property.asking_price) / size)} / m²`
        : null;
    })),
    valueRow("Stamp duty estimate", prices.map(stampDutyEstimate)),
    valueRow("Estimated conveyancing fee", prices.map((price) =>
      Number.isFinite(price) && price > 0 ? formatKes(estimateLegalFee(price)) : "Unavailable")),
    valueRow("Estimated total to buy", prices.map(acquisitionEstimate)),
    valueRow("Service charge (monthly)", properties.map((property) =>
      monthlyAmount(property.service_charge, property.service_charge_period))),
    valueRow("Land rates (monthly equivalent)", properties.map((property) =>
      monthlyAmount(property.land_rates, property.land_rates_period))),
    valueRow("Verification", properties.map((property) => property.is_verified ? "Verified" : "Not verified")),
    valueRow("Property type", properties.map((property) => property.property_type.replaceAll("_", " "))),
    valueRow("Location", properties.map(location)),
    valueRow("Bedrooms", properties.map((property) => property.property_type === "land" ? null : property.bedrooms)),
    valueRow("Bathrooms", properties.map((property) => property.property_type === "land" ? null : property.bathrooms)),
    valueRow("Floor area", properties.map((property) =>
      property.size_sqm === null ? null : `${Number(property.size_sqm).toLocaleString()} m²`)),
    valueRow("Plot size", properties.map((property) =>
      property.plot_size_acres === null ? null : `${Number(property.plot_size_acres).toLocaleString()} acres`)),
    valueRow("Parking", properties.map((property) => property.parking_spaces)),
    valueRow("Title type", properties.map((property) => property.title_type)),
    valueRow("Title deed status", properties.map((property) => property.title_deed_status)),
    valueRow("Furnishing", properties.map((property) => property.furnished_status)),
    valueRow("Occupancy", properties.map((property) => property.occupancy?.replaceAll("_", " "))),
    valueRow("Completion", properties.map((property) => property.completion_status?.replaceAll("_", " "))),
    valueRow("Year built", properties.map((property) => property.year_built)),
    valueRow("Floor level", properties.map((property) => property.floor_level)),
    valueRow("Zoning", properties.map((property) => property.zoning)),
    valueRow("Road access", properties.map((property) => property.road_access)),
  ];
}

export function getDifferentSaleComparisonRows(rows: SaleComparisonRow[]) {
  return rows.filter((row) => new Set(row.values).size > 1);
}

export const saleAcquisitionEstimateNote =
  "Planning estimate only: stamp duty is shown as a 2–4% range because the applicable rate depends on the property location. Conveyancing fees use an indicative tiered estimate and exclude VAT, valuation, registration, and other disbursements. Confirm the final figures with your advocate.";
