import type { ListingAdditionalCharge } from "@/app/lib/host/types";

export function normalizeListingAdditionalCharges(
  value: unknown,
): ListingAdditionalCharge[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const charge = entry as Record<string, unknown>;
    const name = typeof charge.name === "string" ? charge.name.trim() : "";
    const amount = Number(charge.amount);
    const frequency = charge.frequency;
    const required = charge.required !== false;
    if (
      !name ||
      name.length > 80 ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      (frequency !== "per_night" && frequency !== "per_booking")
    )
      return [];

    return [{ name, amount, frequency, required }];
  });
}

export function calculateListingAdditionalCharges(
  charges: ListingAdditionalCharge[],
  nights: number,
  selectedExtras?: Iterable<string>,
) {
  const normalizedNights = Math.max(0, Math.trunc(nights));
  const hasExplicitSelection = selectedExtras !== undefined;
  const selectedSet = new Set(
    Array.from(selectedExtras ?? [])
      .map((item) => item.trim())
      .filter(Boolean),
  );

  const relevantCharges = charges.filter((charge) => {
    if (charge.required) return true;
    if (!hasExplicitSelection) return true;
    if (!selectedSet.size) return false;
    return selectedSet.has(charge.name);
  });

  const lines = relevantCharges.map((charge) => ({
    ...charge,
    total:
      Math.round(
        charge.amount *
          (charge.frequency === "per_night" ? normalizedNights : 1) *
          100,
      ) / 100,
  }));

  return {
    lines,
    total:
      Math.round(lines.reduce((sum, charge) => sum + charge.total, 0) * 100) /
      100,
  };
}
