// app/host/listings/new/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { createHostListing } from "@/app/lib/host/actions";
import ListingForm from "@/components/host/ListingForm";
import type { ListingFormValues } from "@/app/lib/host/types";

export default function NewListingPage() {
  const router = useRouter();

  async function handleSubmit(values: ListingFormValues) {
    const listing = await createHostListing(values);
    router.push(`/host/listings/${listing.id}/edit?created=1`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#12231d]">New listing</h1>
        <p className="text-gray-500">It saves as a draft — add photos and publish when you&apos;re ready.</p>
      </div>
      <ListingForm onSubmit={handleSubmit} submitLabel="Create draft" />
    </div>
  );
}
