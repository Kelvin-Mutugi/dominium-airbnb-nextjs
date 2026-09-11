// appartmentDetails/RelatedListings.tsx
import { Listing } from "../homeData";

interface RelatedListingsProps {
  listings: Listing[];
  onSelect: (listing: Listing) => void;
}

export function RelatedListings({ listings, onSelect }: RelatedListingsProps) {
  if (listings.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-[16px] font-semibold text-[#1B1A2E]">
        Similar places nearby
      </h3>
      <div className="grid gap-3">
        {listings.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onSelect(l)}
            className="flex items-center gap-3 text-left hover:cursor-pointer hover:bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#E23E85] focus:ring-offset-2"
          >
            <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-[#F3F1EE]">
              <img
                src={l.gallery[0]}
                alt={l.name}
                className="h-full w-full object-cover transition-transform hover:scale-105"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[#1B1A2E]">
                {l.name}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-[#3A3856]/70">
                {l.price}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}