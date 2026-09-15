"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  MapPin,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ROUTES } from "./homeData";

interface SearchBarProps {
  selectedRoute: string;
  onRouteChange: (route: string) => void;
  checkIn: string;
  onCheckInChange: (value: string) => void;
  guests?: number;
  onGuestsChange?: (value: number) => void;
  onSearch: () => void;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MAX_GUESTS = 10;
const MIN_GUESTS = 1;

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISODate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() < b.getFullYear() ||
    (a.getFullYear() === b.getFullYear() &&
      (a.getMonth() < b.getMonth() ||
        (a.getMonth() === b.getMonth() && a.getDate() < b.getDate())))
  );
}

function formatDisplayDate(date: Date | null): string {
  if (!date) return "Add date";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function buildMonthGrid(monthCursor: Date): (Date | null)[] {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  return cells;
}

export default function SearchBar({
  selectedRoute,
  onRouteChange,
  checkIn,
  onCheckInChange,
  guests,
  onGuestsChange,
  onSearch,
}: SearchBarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = parseISODate(checkIn);

  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(selectedDate ?? today);
  const [isGuestsOpen, setGuestsOpen] = useState(false);
  const [internalGuests, setInternalGuests] = useState(2);

  const guestCount = guests ?? internalGuests;
  const setGuestCount = (next: number) => {
    const clamped = Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, next));
    onGuestsChange ? onGuestsChange(clamped) : setInternalGuests(clamped);
  };

  const calendarRef = useRef<HTMLDivElement>(null);
  const guestsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
      if (guestsRef.current && !guestsRef.current.contains(event.target as Node)) {
        setGuestsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthLabel = monthCursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const handleSelectDay = (day: Date) => {
    onCheckInChange(toISODate(day));
    setCalendarOpen(false);
  };

  return (
    <div className="w-full max-w-[900px] rounded-sm border border-[#E5E2DA] bg-white p-1.5 shadow-[0_15px_45px_rgba(27,26,46,0.12)]">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center">

        {/* Location */}
        <div className="relative flex min-h-[52px] flex-1 items-center gap-3 rounded-xl px-3.5 transition hover:bg-[#FAF9F6]">
          <MapPin size={20} strokeWidth={1.8} className="shrink-0 text-[#E23E85]" />

          <div className="min-w-0 flex-1">
            <label
              htmlFor="location"
              className="block font-mono text-[9px] font-semibold uppercase tracking-[1.3px] text-[#36454F]/55"
            >
              Where Are you Staying?
            </label>

            <div className="relative">
              <select
                id="location"
                value={selectedRoute}
                onChange={(event) => onRouteChange(event.target.value)}
                className="w-full appearance-none truncate border-0 bg-transparent pr-5 pt-1 font-sans text-[14px] font-semibold text-[#1B1A2E] outline-none"
              >
                {ROUTES.map((route: string) => (
                  <option key={route} value={route}>
                    {route}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#36454F]/50"
              />
            </div>
          </div>
        </div>

        <div className="hidden h-10 w-px bg-[#E9E6DD] md:block" />

        {/* Check-in — custom calendar */}
        <div ref={calendarRef} className="relative flex-1">
          <button
            type="button"
            onClick={() => setCalendarOpen((open) => !open)}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3.5 text-left transition hover:bg-[#FAF9F6]"
          >
            <CalendarDays size={20} strokeWidth={1.8} className="shrink-0 text-[#E23E85]" />
            <div className="min-w-0 flex-1">
              <span className="block font-mono text-[9px] font-semibold uppercase tracking-[1.3px] text-[#36454F]/55">
                Check-in
              </span>
              <span className="block truncate pt-1 font-sans text-[14px] font-semibold text-[#1B1A2E]">
                {formatDisplayDate(selectedDate)}
              </span>
            </div>
          </button>

          {isCalendarOpen && (
            <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-[300px] rounded-sm border border-[#E5E2DA] bg-white p-4 shadow-[0_15px_45px_rgba(27,26,46,0.16)]">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() =>
                    setMonthCursor((cur) => new Date(cur.getFullYear(), cur.getMonth() - 1, 1))
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#36454F] transition hover:bg-[#FAF9F6]"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-sans text-[13px] font-semibold text-[#1B1A2E]">
                  {monthLabel}
                </span>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() =>
                    setMonthCursor((cur) => new Date(cur.getFullYear(), cur.getMonth() + 1, 1))
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#36454F] transition hover:bg-[#FAF9F6]"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="mb-1 grid grid-cols-7">
                {WEEKDAY_LABELS.map((label, i) => (
                  <div
                    key={`${label}-${i}`}
                    className="flex h-7 items-center justify-center font-mono text-[10px] font-semibold text-[#36454F]/50"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {buildMonthGrid(monthCursor).map((day, i) => {
                  if (!day) return <div key={`blank-${i}`} className="h-9 w-9" />;

                  const isPast = isBeforeDay(day, today);
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, today);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={isPast}
                      onClick={() => handleSelectDay(day)}
                      className={[
                        "mx-auto flex h-9 w-9 items-center justify-center rounded-full font-sans text-[13px] transition",
                        isPast
                          ? "cursor-not-allowed text-[#36454F]/25"
                          : "text-[#1B1A2E] hover:bg-[#FCE4EE]",
                        isSelected ? "bg-[#E23E85] text-white hover:bg-[#E23E85]" : "",
                        isToday && !isSelected ? "border border-[#E23E85]/50" : "",
                      ].join(" ")}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleSelectDay(today)}
                className="mt-3 font-sans text-[12px] font-semibold text-[#E23E85] hover:underline"
              >
                Today
              </button>
            </div>
          )}
        </div>

        <div className="hidden h-10 w-px bg-[#E9E6DD] md:block" />

        {/* Guests — increment / decrement */}
        <div ref={guestsRef} className="relative flex-1">
          <button
            type="button"
            onClick={() => setGuestsOpen((open) => !open)}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3.5 text-left transition hover:bg-[#FAF9F6]"
          >
            <Users size={20} strokeWidth={1.8} className="shrink-0 text-[#E23E85]" />
            <div className="min-w-0 flex-1">
              <span className="block font-mono text-[9px] font-semibold uppercase tracking-[1.3px] text-[#36454F]/55">
                Guests
              </span>
              <span className="block truncate pt-1 font-sans text-[14px] font-semibold text-[#1B1A2E]">
                {guestCount} {guestCount === 1 ? "guest" : "guests"}
              </span>
            </div>
          </button>

          {isGuestsOpen && (
            <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-[260px] rounded-sm border border-[#E5E2DA] bg-white p-4 shadow-[0_15px_45px_rgba(27,26,46,0.16)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans text-[14px] font-semibold text-[#1B1A2E]">Guests</p>
                  <p className="font-sans text-[12px] text-[#36454F]/60">Ages 13 and up</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Decrease guests"
                    disabled={guestCount <= MIN_GUESTS}
                    onClick={() => setGuestCount(guestCount - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E2DA] text-[#1B1A2E] transition hover:border-[#E23E85] hover:text-[#E23E85] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#E5E2DA] disabled:hover:text-[#1B1A2E]"
                  >
                    <Minus size={14} />
                  </button>

                  <span className="w-4 text-center font-sans text-[14px] font-semibold text-[#1B1A2E]">
                    {guestCount}
                  </span>

                  <button
                    type="button"
                    aria-label="Increase guests"
                    disabled={guestCount >= MAX_GUESTS}
                    onClick={() => setGuestCount(guestCount + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E2DA] text-[#1B1A2E] transition hover:border-[#E23E85] hover:text-[#E23E85] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#E5E2DA] disabled:hover:text-[#1B1A2E]"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <button
          type="button"
          onClick={onSearch}
          className="
            flex min-h-[44px] shrink-0
            items-center justify-center gap-2
            rounded-sm
            bg-[#E23E85]
            px-7
            font-display text-[14px]
            tracking-[0.8px]
            text-white
            transition
            hover:bg-[#d5377a]
            active:scale-[0.98]
          "
        >
          <Search size={17} strokeWidth={2.2} />
          SEARCH
        </button>
      </div>
    </div>
  );
}