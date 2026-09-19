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
    // pointerdown (not mousedown): iOS Safari doesn't fire mouse events when tapping
    // non-interactive areas, so taps outside would never close the popovers.
    function handleClickOutside(event: PointerEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
      if (guestsRef.current && !guestsRef.current.contains(event.target as Node)) {
        setGuestsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCalendarOpen(false);
        setGuestsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
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
      {/*
        Below lg: 2-column grid  →  [ Location        ]
                                    [ Check-in | Guests ]
                                    [ Search           ]
        lg and up: the original single row.
      */}
      <div className="grid grid-cols-2 gap-1.5 lg:flex lg:flex-row lg:items-center">

        {/* Location */}
        <div className="relative col-span-2 flex min-h-[52px] items-center gap-3 rounded-xl bg-[#FAF9F6] px-3.5 transition hover:bg-[#FAF9F6] lg:col-span-1 lg:flex-1 lg:bg-transparent">
          <MapPin size={20} strokeWidth={1.8} className="shrink-0 text-[#E23E85]" />

          <div className="min-w-0 flex-1">
            <label
              htmlFor="location"
              className="block font-mono text-[9px] font-semibold uppercase tracking-[1.3px] text-[#36454F]/55"
            >
              Where Are you Staying?
            </label>

            <div className="relative">
              {/* text-base on mobile stops iOS Safari zooming in when the select is focused */}
              <select
                id="location"
                value={selectedRoute}
                onChange={(event) => onRouteChange(event.target.value)}
                className="w-full appearance-none truncate border-0 bg-transparent pr-5 pt-1 font-sans text-base font-semibold text-[#1B1A2E] outline-none lg:text-[14px]"
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

        <div className="hidden h-10 w-px bg-[#E9E6DD] lg:block" />

        {/* Check-in — custom calendar */}
        <div ref={calendarRef} className="relative min-w-0 lg:flex-1">
          <button
            type="button"
            onClick={() => setCalendarOpen((open) => !open)}
            aria-expanded={isCalendarOpen}
            className="flex min-h-[52px] w-full items-center gap-2.5 rounded-xl bg-[#FAF9F6] px-3 text-left transition hover:bg-[#FAF9F6] lg:gap-3 lg:bg-transparent lg:px-3.5"
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
            <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-[300px] max-w-[calc(100vw-2rem)] rounded-sm border border-[#E5E2DA] bg-white p-4 shadow-[0_15px_45px_rgba(27,26,46,0.16)]">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() =>
                    setMonthCursor((cur) => new Date(cur.getFullYear(), cur.getMonth() - 1, 1))
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#36454F] transition hover:bg-[#FAF9F6] lg:h-7 lg:w-7"
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
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#36454F] transition hover:bg-[#FAF9F6] lg:h-7 lg:w-7"
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
                className="mt-3 py-1 font-sans text-[12px] font-semibold text-[#E23E85] hover:underline"
              >
                Today
              </button>
            </div>
          )}
        </div>

        <div className="hidden h-10 w-px bg-[#E9E6DD] lg:block" />

        {/* Guests — increment / decrement */}
        <div ref={guestsRef} className="relative min-w-0 lg:flex-1">
          <button
            type="button"
            onClick={() => setGuestsOpen((open) => !open)}
            aria-expanded={isGuestsOpen}
            className="flex min-h-[52px] w-full items-center gap-2.5 rounded-xl bg-[#FAF9F6] px-3 text-left transition hover:bg-[#FAF9F6] lg:gap-3 lg:bg-transparent lg:px-3.5"
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
            // Right-aligned below lg (this cell is the right-hand column, so left-0 would run off-screen)
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-[260px] max-w-[calc(100vw-2rem)] rounded-sm border border-[#E5E2DA] bg-white p-4 shadow-[0_15px_45px_rgba(27,26,46,0.16)] lg:left-0 lg:right-auto">
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
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E2DA] text-[#1B1A2E] transition hover:border-[#E23E85] hover:text-[#E23E85] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#E5E2DA] disabled:hover:text-[#1B1A2E] lg:h-8 lg:w-8"
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
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E2DA] text-[#1B1A2E] transition hover:border-[#E23E85] hover:text-[#E23E85] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#E5E2DA] disabled:hover:text-[#1B1A2E] lg:h-8 lg:w-8"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Explicit close for touch users (no hover / outside-click habit) */}
              <button
                type="button"
                onClick={() => setGuestsOpen(false)}
                className="mt-4 w-full rounded-sm bg-[#1B1A2E] py-2.5 font-sans text-[13px] font-semibold text-white lg:hidden"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <button
          type="button"
          onClick={onSearch}
          className="
            col-span-2 flex min-h-[48px]
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
            lg:col-span-1 lg:min-h-[44px] lg:shrink-0
          "
        >
          <Search size={17} strokeWidth={2.2} />
          SEARCH
        </button>
      </div>
    </div>
  );
}