// appartmentDetails/AvailabilityCalendar.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import { rangesOverlap, type DateRange } from "@/app/lib/booking/availability";

interface AvailabilityCalendarProps {
  bookedDateRanges?: DateRange[];
  minNights: number;
  prompt?: boolean;
  availabilityUnavailable?: boolean;
  initialCheckIn?: string;
  initialCheckOut?: string;
  onDateSelectionStart?: () => void;
  onDateRangeSelect?: (checkIn: Date, checkOut: Date) => void;
  onDatesClear?: () => void;
}

function isDateBooked(date: Date, ranges: DateRange[]) {
  const dateKey = formatDateKey(date);
  return ranges.some((r) => {
    return dateKey >= r.start && dateKey < r.end;
  });
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
    ? parsed
    : null;
}

function formatDateLabel(date: Date | null): string {
  if (!date) return "Add date";
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function stayOverlapsBookedDates(checkIn: Date, checkOut: Date, ranges: DateRange[]) {
  return ranges.some((range) =>
    rangesOverlap(
      { start: formatDateKey(checkIn), end: formatDateKey(checkOut) },
      range,
    ),
  );
}

export function AvailabilityCalendar({
  bookedDateRanges = [],
  minNights,
  prompt = false,
  availabilityUnavailable = false,
  initialCheckIn,
  initialCheckOut,
  onDateSelectionStart,
  onDateRangeSelect,
  onDatesClear,
}: AvailabilityCalendarProps) {
  const initialStart = parseDateKey(initialCheckIn);
  const initialEnd = parseDateKey(initialCheckOut);
  const rootRef = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(() => {
    const selected = initialStart ?? new Date();
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });
  const [checkIn, setCheckIn] = useState<Date | null>(initialStart);
  const [checkOut, setCheckOut] = useState<Date | null>(initialEnd);
  const [expanded, setExpanded] = useState(false);
  const [selecting, setSelecting] = useState<"checkIn" | "checkOut">("checkIn");
  const calendarOpen = expanded;

  // On phones, keep the opened calendar in view (clear of the sticky price bar).
  useEffect(() => {
    if (!expanded) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [expanded]);

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();

    const cells: (Date | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push(new Date(year, month, d));
    }
    return cells;
  }, [viewDate]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function handleDayClick(day: Date) {
    if (availabilityUnavailable || day < today) return;

    if (selecting === "checkIn" || !checkIn) {
      if (isDateBooked(day, bookedDateRanges)) return;
      setCheckIn(day);
      setCheckOut(null);
      setSelecting("checkOut");
      return;
    }

    if (day <= checkIn) {
      if (selecting === "checkOut") return;
      if (isDateBooked(day, bookedDateRanges)) return;
      setCheckIn(day);
      return;
    }

    const nights = Math.round((day.getTime() - checkIn.getTime()) / 86400000);
    if (nights < minNights) return; // enforce minimum stay
    if (stayOverlapsBookedDates(checkIn, day, bookedDateRanges)) return;

    setCheckOut(day);
    onDateRangeSelect?.(checkIn, day);
    setExpanded(false);
    setSelecting("checkIn");
  }

  function isInSelectedRange(day: Date) {
    if (!checkIn || !checkOut) return false;
    return day > checkIn && day < checkOut;
  }

  function clearDates() {
    setCheckIn(null);
    setCheckOut(null);
    setSelecting("checkIn");
    onDatesClear?.();
  }

  return (
    <div
      ref={rootRef}
      id="availability-calendar"
      tabIndex={-1}
      className={`w-full min-w-0 max-w-full scroll-mb-28 overflow-hidden rounded-lg border outline-none transition-colors ${
        prompt ? "border-[#E23E85]/50 ring-2 ring-[#E23E85]/10" : "border-[#F0EEE9]"
      }`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 p-2">
        <button
          type="button"
          id="check-in-date-trigger"
          aria-expanded={calendarOpen}
          aria-pressed={calendarOpen && selecting === "checkIn"}
          onClick={() => {
            setSelecting("checkIn");
            setExpanded(true);
            onDateSelectionStart?.();
          }}
          className={`min-h-12 min-w-0 rounded-md border border-transparent bg-[#FAF9F7] px-3 py-2 text-left transition-colors ${calendarOpen && selecting === "checkIn" ? "border-[#1769AA]/50 bg-white ring-1 ring-[#1769AA]/25" : "hover:bg-[#F4F3F0]"}`}
        >
          <span className="block text-[11px] font-semibold uppercase text-[#6B6A78]">Check-in</span>
          <span className="mt-0.5 block truncate text-sm font-medium text-[#1B1A2E]">{formatDateLabel(checkIn)}</span>
        </button>
        <button
          type="button"
          aria-expanded={calendarOpen}
          aria-pressed={calendarOpen && selecting === "checkOut"}
          onClick={() => {
            setSelecting(checkIn ? "checkOut" : "checkIn");
            setExpanded(true);
          }}
          className={`min-h-12 min-w-0 rounded-md border border-transparent bg-[#FAF9F7] px-3 py-2 text-left transition-colors ${calendarOpen && selecting === "checkOut" ? "border-[#1769AA]/50 bg-white ring-1 ring-[#1769AA]/25" : "hover:bg-[#F4F3F0]"}`}
        >
          <span className="block text-[11px] font-semibold uppercase text-[#6B6A78]">Check-out</span>
          <span className="mt-0.5 block truncate text-sm font-medium text-[#1B1A2E]">{formatDateLabel(checkOut)}</span>
        </button>
      </div>

      {calendarOpen && <div className="max-w-full overflow-x-auto overscroll-x-contain border-t border-[#E9E6DD] p-2 sm:p-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-sm font-medium text-[#3A3856]">
          {availabilityUnavailable
            ? "Availability is temporarily unavailable."
            : selecting === "checkIn"
              ? "Select your check-in date"
              : `Select your check-out date${minNights > 1 ? ` · min ${minNights} nights` : ""}`}
        </p>
        <div className="flex shrink-0 items-center justify-end gap-1">
          {(checkIn || checkOut) && (
            <button
              type="button"
              onClick={clearDates}
              className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[#3A3856] hover:bg-[#F4F3F0]"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Clear dates
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Close calendar"
            className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[#3A3856] hover:bg-[#F4F3F0]"
          >
            <X size={16} aria-hidden="true" />
            Close
          </button>
        </div>
      </div>
      {minNights > 1 && (
        <p className="mb-3 text-xs font-medium text-[#3A3856]">Minimum stay: {minNights} nights</p>
      )}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
          }
          aria-label="Previous month"
          className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-[#FAF9F6]"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-[15px] font-semibold text-[#1B1A2E]">
          {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() =>
            setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
          }
          aria-label="Next month"
          className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-[#FAF9F6]"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid min-w-0 grid-cols-7 text-center text-[12px] text-[#3A3856]/60 lg:min-w-[308px]">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="mt-1 grid min-w-0 grid-cols-7 lg:min-w-[308px]">
        {days.map((day, i) => {
          if (!day) return <div key={i} />;

          const booked = isDateBooked(day, bookedDateRanges);
          const past = day < today;
          const choosingCheckout = Boolean(checkIn && selecting === "checkOut" && day > checkIn);
          const checkoutOverlap = choosingCheckout && stayOverlapsBookedDates(checkIn!, day, bookedDateRanges);
          const checkoutNights = checkIn ? Math.round((day.getTime() - checkIn.getTime()) / 86_400_000) : 0;
          const tooShortCheckout = choosingCheckout && checkoutNights < minNights;
          const beforeCheckIn = selecting === "checkOut" && Boolean(checkIn && day <= checkIn);
          const disabled = past || beforeCheckIn || (booked && !choosingCheckout) || checkoutOverlap || tooShortCheckout;
          const isCheckIn = checkIn && day.getTime() === checkIn.getTime();
          const isCheckOut = checkOut && day.getTime() === checkOut.getTime();
          const inRange = isInSelectedRange(day);

          return (
            <button
              key={i}
              type="button"
              disabled={availabilityUnavailable || disabled}
              onClick={() => handleDayClick(day)}
              className={`aspect-square w-full min-w-0 text-[13px] transition-colors lg:min-h-11 lg:min-w-11 ${
                (booked && !choosingCheckout) || past || beforeCheckIn || checkoutOverlap || tooShortCheckout
                  ? "cursor-not-allowed text-[#3A3856]/25 line-through"
                  : isCheckIn || isCheckOut
                  ? "bg-[#1B1A2E] text-white"
                  : inRange
                  ? "bg-[#FAF9F6] text-[#1B1A2E]"
                  : "text-[#1B1A2E] hover:bg-[#FAF9F6]"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      </div>}
    </div>
  );
}