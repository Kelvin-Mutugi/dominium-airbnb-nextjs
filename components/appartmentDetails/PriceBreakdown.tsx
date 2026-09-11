// appartmentDetails/PriceBreakdown.tsx
interface PriceBreakdownProps {
  pricePerNight: number;
  nights: number;
  serviceFeePercent: number;
  currency?: string;
}

export function PriceBreakdown({
  pricePerNight,
  nights,
  serviceFeePercent,
  currency = "KES",
}: PriceBreakdownProps) {
  const subtotal = pricePerNight * nights;
  const serviceFee = Math.round(subtotal * serviceFeePercent);
  const total = subtotal + serviceFee;

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
        <span>Service fee</span>
        <span>{fmt(serviceFee)}</span>
      </div>
      <div className="flex justify-between border-t border-[#EDEBE4] pt-2 text-[15px] font-semibold text-[#1B1A2E]">
        <span>Total</span>
        <span>{fmt(total)}</span>
      </div>
      <p className="pt-1 text-[12px] text-[#3A3856]/60">
        You won't be charged yet
      </p>
    </div>
  );
}