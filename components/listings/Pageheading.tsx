interface PageHeadingProps {
  title: string;       // e.g. "Stays in Nairobi"
  resultCount: number;
  dateRangeLabel?: string; // e.g. "12–15 Oct"
}

export default function PageHeading({ title, resultCount, dateRangeLabel }: PageHeadingProps) {
  return (
    <div className="flex items-baseline justify-between py-6">
      <h1 className="font-serif text-2xl font-semibold text-ink">{title}</h1>
      <div className="text-sm text-ink/60">
        {resultCount} {resultCount === 1 ? "place" : "places"}
        {dateRangeLabel ? ` · ${dateRangeLabel}` : ""}
      </div>
    </div>
  );
}