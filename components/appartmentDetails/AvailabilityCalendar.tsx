// appartmentDetails/AvailabilityCalendar.tsx
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateRange {
  start: string;
  end: string;
}

interface AvailabilityCalendarProps {
  bookedDateRanges?: DateRange[];
  minNights: number;
  prompt?: boolean;
  availabilityUnavailable?: boolean;
  onDateRangeSelect?: (checkIn: Date, checkOut: Date) => void;
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

function stayOverlapsBookedDates(checkIn: Date, checkOut: Date, ranges: DateRange[]) {
  const checkInKey = formatDateKey(checkIn);
  const checkOutKey = formatDateKey(checkOut);
  return ranges.some((range) => range.start < checkOutKey && range.end > checkInKey);
}

export function AvailabilityCalendar({
  bookedDateRanges = [],
  minNights,
  prompt = false,
  availabilityUnavailable = false,
  onDateRangeSelect,
}: AvailabilityCalendarProps) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

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

    if (!checkIn || (checkIn && checkOut)) {
      if (isDateBooked(day, bookedDateRanges)) return;
      setCheckIn(day);
      setCheckOut(null);
      return;
    }

    if (day <= checkIn) {
      if (isDateBooked(day, bookedDateRanges)) return;
      setCheckIn(day);
      return;
    }

    const nights = Math.round((day.getTime() - checkIn.getTime()) / 86400000);
    if (nights < minNights) return; // enforce minimum stay
    if (stayOverlapsBookedDates(checkIn, day, bookedDateRanges)) return;

    setCheckOut(day);
    onDateRangeSelect?.(checkIn, day);
  }

  function isInSelectedRange(day: Date) {
    if (!checkIn || !checkOut) return false;
    return day > checkIn && day < checkOut;
  }

  return (
    <div
      id="availability-calendar"
      tabIndex={-1}
      className={`rounded-2xl border p-4 outline-none transition-colors ${
        prompt ? "border-[#E23E85] ring-4 ring-[#E23E85]/10" : "border-[#EDEBE4]"
      }`}
    >
      <div className="mb-4 rounded-xl bg-[#FAF9F6] px-3 py-2.5 text-[13px] text-[#3A3856]">
        <span className="font-semibold text-[#1B1A2E]">Choose your dates:</span>{" "}
        select a check-in date, then select a check-out date.
      </div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
          }
          className="rounded-full p-1.5 hover:bg-[#FAF9F6]"
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
          className="rounded-full p-1.5 hover:bg-[#FAF9F6]"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[12px] text-[#3A3856]/60">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={i} />;

          const booked = isDateBooked(day, bookedDateRanges);
          const past = day < today;
          const choosingCheckout = Boolean(checkIn && !checkOut && day > checkIn);
          const checkoutOverlap = choosingCheckout && stayOverlapsBookedDates(checkIn!, day, bookedDateRanges);
          const disabled = past || (booked && !choosingCheckout) || checkoutOverlap;
          const isCheckIn = checkIn && day.getTime() === checkIn.getTime();
          const isCheckOut = checkOut && day.getTime() === checkOut.getTime();
          const inRange = isInSelectedRange(day);

          return (
            <button
              key={i}
              type="button"
              disabled={availabilityUnavailable || disabled}
              onClick={() => handleDayClick(day)}
              className={`aspect-square rounded-lg text-[13px] transition-colors ${
                (booked && !choosingCheckout) || past || checkoutOverlap
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

      <p className="mt-3 text-[13px] text-[#3A3856]">
        {availabilityUnavailable
          ? "Availability could not be checked right now. Please try again later."
          : checkOut
          ? `${checkIn?.toLocaleDateString()} → ${checkOut.toLocaleDateString()}`
          : checkIn
            ? `Now select checkout (min ${minNights} night${minNights > 1 ? "s" : ""})`
            : "Start by selecting your check-in date."}
      </p>
    </div>
  );
}