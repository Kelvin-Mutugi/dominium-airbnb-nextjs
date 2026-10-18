import type { ReactNode } from "react";

interface PageHeadingProps {
  title: string;       // e.g. "Stays in Nairobi"
  resultCount?: number;
  dateRangeLabel?: string; // e.g. "12–15 Oct"
  quickFilters?: ReactNode;
  mobileControl?: ReactNode;
  soft?: boolean;
}

export default function PageHeading({
  title,
  resultCount,
  dateRangeLabel,
  quickFilters,
  mobileControl,
  soft = false,
}: PageHeadingProps) {
  return (
    <div className={`${quickFilters
      ? "grid grid-cols-1 items-center gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
      : "flex items-baseline justify-between py-6"} ${soft ? "rounded-none bg-transparent px-0 py-3 shadow-none sm:py-5" : ""}`}>
      {mobileControl && (
        <div className="flex flex-col items-start gap-1.5 lg:hidden">
          <h1 className={`min-w-0 text-sm font-medium ${soft ? "text-[#666666]" : "text-ink"}`}>{title}</h1>
          {mobileControl}
        </div>
      )}
      <h1 className={`${mobileControl ? "hidden lg:block" : ""} min-w-0 font-semibold ${soft ? "text-sm text-[#292929] lg:text-2xl" : "text-2xl text-ink"}`}>{title}</h1>
      {quickFilters && (
        <div className={`flex min-w-0 justify-center lg:col-start-2 lg:row-start-1 ${soft ? "border-t border-[#e5e5e5] pt-3 lg:border-0 lg:pt-0" : ""}`}>
          {quickFilters}
        </div>
      )}
      {(resultCount !== undefined || dateRangeLabel) && (
        <div className={`text-sm ${soft ? "text-[#686868]" : "text-ink/60"} ${quickFilters ? "lg:col-start-3 lg:row-start-1 lg:justify-self-end" : ""}`}>
          {resultCount !== undefined && (
            <>{resultCount} {resultCount === 1 ? "place" : "places"}</>
          )}
          {dateRangeLabel ? `${resultCount !== undefined ? " · " : ""}${dateRangeLabel}` : ""}
        </div>
      )}
    </div>
  );
}