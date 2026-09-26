// appartmentDetails/StickyPriceBar.tsx
interface StickyPriceBarProps {
  price: string;
  total?: string | null;
  nights?: number;
  hasSelectedDates?: boolean;
  onReserve: () => void;
}

export function StickyPriceBar({ price, total, nights = 0, hasSelectedDates = false, onReserve }: StickyPriceBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-[#EDEBE4] bg-white p-4 shadow-[0_-2px_20px_rgba(0,0,0,0.08)] lg:hidden">
      <div>
        <p className="text-[18px] font-bold text-[#1B1A2E]">{hasSelectedDates && total ? total : `${price} / night`}</p>
        <p className="text-[12px] text-[#3A3856]/60">
          {hasSelectedDates ? `${nights} night${nights === 1 ? "" : "s"} · includes service fee` : "Choose dates to see the trip total"}
        </p>
      </div>
      <button
        type="button"
        onClick={onReserve}
        className="rounded-xl bg-[#1B1A2E] px-6 py-3 font-semibold text-white"
      >
        {hasSelectedDates ? "Continue" : "Choose dates"}
      </button>
    </div>
  );
}