"use client";

import { CalendarDays, ChevronDown, MapPin, Search, Users } from "lucide-react";
import { ROUTES } from "./homeData";

interface SearchBarProps {
  selectedRoute: string;
  onRouteChange: (route: string) => void;
  checkIn: string;
  onCheckInChange: (value: string) => void;
  onSearch: () => void;
}

export default function SearchBar({
  selectedRoute,
  onRouteChange,
  checkIn,
  onCheckInChange,
  onSearch,
}: SearchBarProps) {
  return (
    <div className="w-full max-w-[900px] rounded-2xl border border-[#E5E2DA] bg-white p-2 shadow-[0_15px_45px_rgba(27,26,46,0.12)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">

        {/* Location */}
        <div className="relative flex min-h-[64px] flex-1 items-center gap-3 rounded-xl px-4 transition hover:bg-[#FAF9F6]">
          <MapPin
            size={20}
            strokeWidth={1.8}
            className="shrink-0 text-[#E23E85]"
          />

          <div className="min-w-0 flex-1">
            <label
              htmlFor="location"
              className="block font-mono text-[9px] font-semibold uppercase tracking-[1.3px] text-[#36454F]/55"
            >
              Location
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

        {/* Divider */}
        <div className="hidden h-10 w-px bg-[#E9E6DD] md:block" />

        {/* Check-in */}
        <div className="flex min-h-[64px] flex-1 items-center gap-3 rounded-xl px-4 transition hover:bg-[#FAF9F6]">
          <CalendarDays
            size={20}
            strokeWidth={1.8}
            className="shrink-0 text-[#E23E85]"
          />

          <div className="min-w-0 flex-1">
            <label
              htmlFor="check-in"
              className="block font-mono text-[9px] font-semibold uppercase tracking-[1.3px] text-[#36454F]/55"
            >
              Check-in
            </label>

            <input
              id="check-in"
              type="date"
              value={checkIn}
              onChange={(event) => onCheckInChange(event.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full border-0 bg-transparent pt-1 font-sans text-[14px] font-semibold text-[#1B1A2E] outline-none"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="hidden h-10 w-px bg-[#E9E6DD] md:block" />

        {/* Guests */}
        <div className="flex min-h-[64px] flex-1 items-center gap-3 rounded-xl px-4 transition hover:bg-[#FAF9F6]">
          <Users
            size={20}
            strokeWidth={1.8}
            className="shrink-0 text-[#E23E85]"
          />

          <div className="min-w-0 flex-1">
            <label
              htmlFor="guests"
              className="block font-mono text-[9px] font-semibold uppercase tracking-[1.3px] text-[#36454F]/55"
            >
              Guests
            </label>

            <select
              id="guests"
              defaultValue="2"
              className="w-full appearance-none border-0 bg-transparent pt-1 font-sans text-[14px] font-semibold text-[#1B1A2E] outline-none"
            >
              <option value="1">1 guest</option>
              <option value="2">2 guests</option>
              <option value="3">3 guests</option>
              <option value="4">4 guests</option>
              <option value="5">5 guests</option>
              <option value="6">6 guests</option>
              <option value="7">7 guests</option>
              <option value="8">8 guests</option>
              <option value="9">9 guests</option>
              <option value="10">10 guests</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <button
          type="button"
          onClick={onSearch}
          className="
            flex min-h-[56px] shrink-0
            items-center justify-center gap-2
            rounded-xl
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
