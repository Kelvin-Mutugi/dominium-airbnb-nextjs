"use client";

import { useParams, useRouter } from "next/navigation";
import ApartmentDetails from "@/components/ApartmentDetails";
import { LISTINGS } from "@/components/homeData";

export default function ApartmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const listing = LISTINGS.find((item) => item.id === params.id);

  if (!listing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8F7F4] px-6 text-center text-[#1B1A2E]">
        <h1 className="font-display text-4xl">Listing not found</h1>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-lg bg-[#128C7E] px-5 py-3 font-semibold text-white"
        >
          Back home
        </button>
      </div>
    );
  }

  return <ApartmentDetails listing={listing} onBack={() => router.push("/")} />;
}
