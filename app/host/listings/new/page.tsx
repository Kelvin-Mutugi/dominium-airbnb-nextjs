// app/host/listings/new/page.tsx
import { createListing } from "@/app/host/listings/actions";
import { ListingForm } from "@/components/host/listing-form";

export default function NewListingPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1 text-[#E23E85]">Add Listing</h1>
      <p className="text-sm text-gray-600 mb-6">
        Save as a draft first — you'll add photos and submit for review on
        the next screen.
      </p>
      <ListingForm action={createListing} />
    </div>
  );
}