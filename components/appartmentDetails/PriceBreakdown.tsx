// appartmentDetails/PriceBreakdown.tsx
import type { BookingPrice } from "@/app/lib/booking/pricing";

interface PriceBreakdownProps {
  price: BookingPrice;
  currency?: string;
}

export function PriceBreakdown({
  price,
  currency = "KES",
}: PriceBreakdownProps) {
  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`;

  if (price.nights <= 0) return null;

  return (
    <div className="mt-4 space-y-2 border-t border-[#EDEBE4] pt-4 text-[14px] text-[#3A3856]/80 lg:text-[#3A3856]">
      <div className="flex justify-between">
        <span>
          {fmt(price.nightlyRate)} × {price.nights} night
          {price.nights > 1 ? "s" : ""}
        </span>
        <span>{fmt(price.subtotal)}</span>
      </div>
      {price.additionalChargeLines.map((charge, index) => (
        <div
          key={`${charge.name}-${charge.frequency}-${index}`}
          className="flex justify-between gap-4"
        >
          <span>
            {charge.name} ·{" "}
            {charge.required === false ? "optional" : "mandatory"}
            {charge.frequency === "per_night"
              ? ` · ${fmt(charge.amount)} × ${price.nights} nights`
              : " · per booking"}
          </span>
          <span className="shrink-0">{fmt(charge.total)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-[#EDEBE4] pt-2 text-[15px] font-semibold text-[#1B1A2E]">
        <span>Total</span>
        <span>{fmt(price.total)}</span>
      </div>
      <p className="pt-1 text-[12px] text-[#3A3856]/60">
        You will not be charged yet
      </p>
    </div>
  );
}
