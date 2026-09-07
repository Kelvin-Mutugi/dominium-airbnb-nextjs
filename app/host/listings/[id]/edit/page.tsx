// app/host/listings/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { updateListing, submitForReview } from "@/app/host/listings/actions";
import { ListingForm } from "@/components/host/listing-form";
import { ImageUploader } from "@/components/host/image-uploader";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: listing }, { data: images }, { data: profile }] =
    await Promise.all([
      supabase.from("listings").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("listing_images")
        .select("id, url")
        .eq("listing_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("profiles")
        .select("host_verified_at")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  if (!listing) notFound(); // RLS means this also 404s for someone else's listing

  const updateWithId = async (formData: FormData) => {
    "use server";
    await updateListing(id, formData);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1 text-[#E23E85]">Edit Listing</h1>
        <p className="text-sm text-gray-600">
          Status:{" "}
          <span className="capitalize font-medium">{listing.status}</span>
        </p>
      </div>

      <ListingForm action={updateWithId} initialValues={listing} />

      <div>
        <h2 className="text-lg font-semibold mb-3 text-[#E23E85]">Photos</h2>
        <ImageUploader listingId={id} images={images ?? []} />
      </div>

      {listing.status === "draft" && (
        <div className="border-t pt-6">
          {profile?.host_verified_at ? (
            <form
              action={async () => {
                "use server";
                await submitForReview(id);
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 rounded bg-green-600 text-white text-sm"
              >
                Submit for Review
              </button>
            </form>
          ) : (
            <p className="text-sm text-amber-600">
              Your host account isn't verified yet — you can keep editing
              this listing, but you'll need to be verified before you can
              submit it for review. Contact the site admin to get verified.
            </p>
          )}
        </div>
      )}
    </div>
  );
}