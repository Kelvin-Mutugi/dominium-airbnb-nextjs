"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function AdminSearchInput({
  placeholder,
}: {
  placeholder: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";
  const hasSearch = currentQuery.length > 0;

  return (
    <form action={pathname} className="mb-4 flex max-w-xl gap-2">
      {Array.from(searchParams.entries())
        .filter(([key]) => key !== "q")
        .map(([key, value]) => (
          <input key={`${key}-${value}`} type="hidden" name={key} value={value} />
        ))}
      <label className="sr-only" htmlFor="admin-search">
        Search
      </label>
      <input
        id="admin-search"
        name="q"
        type="search"
        defaultValue={currentQuery}
        placeholder={placeholder}
        maxLength={100}
        className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#1B1A2E] outline-none focus:border-[#E23E85] focus:ring-2 focus:ring-[#E23E85]/20"
      />
      <button
        type="submit"
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        Search
      </button>
      {hasSearch && (
        <Link
          href={`${pathname}?${new URLSearchParams(
            Array.from(searchParams.entries()).filter(([key]) => key !== "q"),
          ).toString()}`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Clear
        </Link>
      )}
    </form>
  );
}