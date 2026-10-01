// appartmentDetails/StickyPriceBar.tsx
interface StickyPriceBarProps {
  price: string;
  total?: string | null;
  nights?: number;
  dateLabel?: string;
  guests?: number;
  kids?: number;
  pets?: number;
  hasSelectedDates?: boolean;
  onReserve: () => void;
}

export function StickyPriceBar({ price, total, nights = 0, dateLabel, guests = 1, kids = 0, pets = 0, hasSelectedDates = false, onReserve }: StickyPriceBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-[#EDEBE4] bg-white p-4 shadow-[0_-2px_20px_rgba(0,0,0,0.08)] lg:hidden">
      <div className="min-w-0 pr-3">
        <p className="text-[18px] font-bold text-[#1B1A2E]">{hasSelectedDates && total ? total : `${price}`} <span className="text-[12px] text-[#3A3856]/70">/ night</span></p>
        <p className="truncate text-[12px] text-[#3A3856]/70">
          {hasSelectedDates ? `${dateLabel} · ${nights} night${nights === 1 ? "" : "s"} · ${guests - kids} adult${guests - kids === 1 ? "" : "s"}${kids ? ` · ${kids} kid${kids === 1 ? "" : "s"}` : ""}${pets ? ` · ${pets} pet${pets === 1 ? "" : "s"}` : ""}` : "Choose dates to see the trip total"}
        </p>
      </div>
      <button
        type="button"
        onClick={onReserve}
        className="shrink-0 rounded-md bg-[#d61a6b] px-6 py-3 font-semibold text-white"
      >
        {hasSelectedDates ? "Reserve" : "Check availability"}
      </button>
    </div>
  );
}