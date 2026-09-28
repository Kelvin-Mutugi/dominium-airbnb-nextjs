// appartmentDetails/PriceBreakdown.tsx
import type { ListingAdditionalCharge } from "@/app/lib/host/types";
import { calculateListingAdditionalCharges } from "@/app/lib/listing-charges";

interface PriceBreakdownProps {
  pricePerNight: number;
  nights: number;
  serviceFeePercent: number;
  serviceFeePerNight?: number;
  additionalCharges: ListingAdditionalCharge[];
  currency?: string;
}

export function PriceBreakdown({
  pricePerNight,
  nights,
  serviceFeePercent,
  serviceFeePerNight,
  additionalCharges,
  currency = "KES",
}: PriceBreakdownProps) {
  const subtotal = pricePerNight * nights;
  const serviceFee = serviceFeePerNight == null
    ? Math.round(subtotal * serviceFeePercent)
    : Math.round(serviceFeePerNight * nights * 100) / 100;
  const customCharges = calculateListingAdditionalCharges(additionalCharges, nights);
  const total = subtotal + serviceFee + customCharges.total;

  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`;

  if (nights <= 0) return null;

  return (
    <div className="mt-4 space-y-2 border-t border-[#EDEBE4] pt-4 text-[14px] text-[#3A3856]">
      <div className="flex justify-between">
        <span>
          {fmt(pricePerNight)} × {nights} night{nights > 1 ? "s" : ""}
        </span>
        <span>{fmt(subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>Platform service fee</span>
        <span>{fmt(serviceFee)}</span>
      </div>
      {customCharges.lines.map((charge, index) => (
        <div key={`${charge.name}-${charge.frequency}-${index}`} className="flex justify-between gap-4">
          <span>{charge.name}{charge.frequency === "per_night" ? ` · ${fmt(charge.amount)} × ${nights} nights` : " · per booking"}</span>
          <span className="shrink-0">{fmt(charge.total)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-[#EDEBE4] pt-2 text-[15px] font-semibold text-[#1B1A2E]">
        <span>Total</span>
        <span>{fmt(total)}</span>
      </div>
      <p className="pt-1 text-[12px] text-[#3A3856]/60">
        You will not be charged yet
      </p>
    </div>
  );
}