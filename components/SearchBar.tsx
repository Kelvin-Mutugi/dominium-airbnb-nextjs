"use client";

import { Search } from "lucide-react";
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
    <div className="relative flex max-w-[640px] flex-wrap items-end gap-[14px] rounded-[14px] border-[1.5px] border-[#1B1A2E] bg-white p-[22px] shadow-[0_20px_44px_rgba(0,0,0,0.35)]">
      <div className="flex min-w-[160px] flex-1 flex-col gap-[6px]">
        <label className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#3A3856]/65">
          Location
        </label>

        <select
          value={selectedRoute}
          onChange={(event) => onRouteChange(event.target.value)}
          className="w-full border-0 border-b-2 border-[#1B1A2E] bg-transparent px-[2px] py-[6px] font-sans text-[15px] font-semibold text-[#1B1A2E] outline-none"
        >
          {ROUTES.map((route: string) => (
            <option key={route}>{route}</option>
          ))}
        </select>
      </div>

      <div className="flex min-w-[130px] flex-1 flex-col gap-[6px]">
        <label className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#3A3856]/65">
          Check-in
        </label>

        <input
          type="text"
          placeholder="Any date"
          value={checkIn}
          onChange={(event) => onCheckInChange(event.target.value)}
          className="w-full border-0 border-b-2 border-[#1B1A2E] bg-transparent px-[2px] py-[6px] font-sans text-[15px] font-semibold text-[#1B1A2E] outline-none"
        />
      </div>

      <button
        onClick={onSearch}
        className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border-0 bg-[#E23E85] px-[22px] py-[14px] font-display text-[15px] tracking-[1px] text-white"
      >
        <Search size={16} />
        SEARCH
      </button>
    </div>
  );
}
