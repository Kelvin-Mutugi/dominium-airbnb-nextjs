import Link from "next/link";
import { notFound } from "next/navigation";
import type {
  ListingAdditionalCharge,
  ListingFormValues,
} from "@/app/lib/host/types";
import { isListingCategory } from "@/app/lib/listing-categories";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { AdminListingEditForm } from "@/components/admin/listings/admin-listing-edit-form";
import type { ListingPhoto } from "@/components/homeData";

export default async function AdminEditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = getSupabaseAdmin();
  const [{ data: listing, error }, { data: arrivalGuide }, { data: images }] =
    await Promise.all([
      admin.from("listings").select("*").eq("id", id).maybeSingle(),
      admin
        .from("listing_arrival_guides")
        .select(
          "arrival_address, arrival_directions, check_in_instructions, wifi_name, wifi_password, arrival_contact, local_tips",
        )
        .eq("listing_id", id)
        .maybeSingle(),
      admin
        .from("listing_images")
        .select(
          "id, url, sort_order, position, category, room_index, caption, is_cover, width, height",
        )
        .eq("listing_id", id)
        .order("position", { ascending: true }),
    ]);

  if (error || !listing) notFound();

  const initialImages: (ListingPhoto & { id: string })[] = (images ?? [])
    .map((image) => ({
      id: image.id,
      url: image.url,
      position: image.position,
      sortOrder: image.sort_order,
      category: image.category,
      roomIndex: image.room_index,
      caption: image.caption,
      isCover: image.is_cover,
      width: image.width,
      height: image.height,
    }))
    .sort(
      (first, second) =>
        (first.position ?? first.sortOrder ?? 0) -
        (second.position ?? second.sortOrder ?? 0),
    );

  const photoStateKey = JSON.stringify(
    initialImages.map((image) => [
      image.id,
      image.url,
      image.position,
      image.category,
      image.roomIndex,
      image.caption,
      image.isCover,
      image.width,
      image.height,
    ]),
  );

  const initialValues: ListingFormValues = {
    title: listing.title ?? "",
    description: listing.description ?? "",
    county: listing.county ?? "",
    town: listing.town ?? "",
    address: listing.address ?? "",
    latitude: listing.latitude == null ? null : Number(listing.latitude),
    longitude: listing.longitude == null ? null : Number(listing.longitude),
    property_type: listing.property_type ?? "",
    categories: Array.isArray(listing.categories)
      ? listing.categories.filter(isListingCategory)
      : [],
    is_rare_find: listing.is_rare_find === true,
    price_per_night: Number(listing.price_per_night ?? 0),
    platform_fee_per_night: Number(
      listing.platform_fee_per_night ??
        Number(listing.price_per_night ?? 0) *
          Number(listing.service_fee_percent ?? 0),
    ),
    additional_charges: Array.isArray(listing.additional_charges)
      ? (listing.additional_charges as ListingAdditionalCharge[]).map(
          (charge) => ({
            name: String(charge.name ?? ""),
            amount: Number(charge.amount ?? 0),
            frequency:
              charge.frequency === "per_night"
                ? ("per_night" as const)
                : ("per_booking" as const),
            required: charge.required !== false,
          }),
        )
      : [],
    max_guests: Number(listing.max_guests ?? 1),
    bedrooms: Number(listing.bedrooms ?? 1),
    bathrooms: Number(listing.bathrooms ?? 1),
    amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
    features: Array.isArray(listing.features) ? listing.features : [],
    house_rules: Array.isArray(listing.house_rules) ? listing.house_rules : [],
    check_in_time: listing.check_in_time ?? "2:00 PM",
    check_out_time: listing.check_out_time ?? "11:00 AM",
    arrival_address: arrivalGuide?.arrival_address ?? listing.address ?? "",
    arrival_directions: arrivalGuide?.arrival_directions ?? "",
    check_in_instructions: arrivalGuide?.check_in_instructions ?? "",
    wifi_name: arrivalGuide?.wifi_name ?? "",
    wifi_password: arrivalGuide?.wifi_password ?? "",
    arrival_contact: arrivalGuide?.arrival_contact ?? "",
    local_tips: arrivalGuide?.local_tips ?? "",
    min_nights: Number(listing.min_nights ?? 1),
    instant_book: listing.instant_book ?? true,
    cancellation_policy: listing.cancellation_policy ?? "",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href={`/admin/listings/${id}`}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to listing details
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#12231d]">Edit listing</h1>
        <p className="text-sm text-gray-500">
          Update property details and arrival information.
        </p>
      </div>
      <AdminListingEditForm
        key={`${listing.updated_at}:${photoStateKey}`}
        listingId={id}
        initialValues={initialValues}
        initialImages={initialImages}
      />
    </div>
  );
}
