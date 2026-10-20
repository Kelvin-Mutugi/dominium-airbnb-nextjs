export interface AccommodationRate {
  hostSubtotal: number;
  effectiveNightlyRate: number;
  monthlyRateApplied: boolean;
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateAccommodationRate(
  nightlyRate: number,
  monthlyRate: number,
  nights: number,
): AccommodationRate {
  const monthlyRateApplied = nights >= 28 && monthlyRate > 0;
  const hostSubtotal = money(
    monthlyRateApplied
      ? (monthlyRate * nights) / 30
      : nightlyRate * nights,
  );

  return {
    hostSubtotal,
    effectiveNightlyRate:
      monthlyRateApplied && nights > 0 ? hostSubtotal / nights : nightlyRate,
    monthlyRateApplied,
  };
}
