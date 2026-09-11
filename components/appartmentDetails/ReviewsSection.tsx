// appartmentDetails/ReviewsSection.tsx
import { Star } from "lucide-react";

interface Review {
  id: string;
  guestName: string;
  rating: number;
  comment: string;
  date: string;
}

interface ReviewsSectionProps {
  rating?: number;
  reviewCount?: number;
  reviews?: Review[];
}

export function ReviewsSection({ rating, reviewCount, reviews = [] }: ReviewsSectionProps) {
  if (!reviewCount || reviewCount === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-[#EDEBE4] p-6 text-center">
        <p className="text-[14px] text-[#3A3856]">No reviews yet</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="mb-5 flex items-center gap-2">
        <Star size={20} fill="#1B1A2E" className="text-[#1B1A2E]" />
        <h3 className="text-[18px] font-semibold text-[#1B1A2E]">
          {rating?.toFixed(2)} · {reviewCount} review{reviewCount > 1 ? "s" : ""}
        </h3>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 ">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-[8px] border border-[#EDEBE4] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAF9F6] text-[13px] font-semibold text-[#1B1A2E]">
                {r.guestName.charAt(0)}
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#1B1A2E]">{r.guestName}</p>
                <p className="text-[12px] text-[#3A3856]/60">
                  {new Date(r.date).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-[#3A3856]">
              {r.comment}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}