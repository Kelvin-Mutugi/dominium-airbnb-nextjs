// app/host/listings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export async function createListing(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const amenitiesInput = String(formData.get("amenities") ?? "");
  const amenities = amenitiesInput
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const { data, error } = await supabase
    .from("listings")
    .insert({
      host_id: user.id,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      county: formData.get("county") as string,
      town: formData.get("town") as string,
      address: (formData.get("address") as string) || null,
      price_per_night: Number(formData.get("price_per_night")),
      max_guests: Number(formData.get("max_guests")),
      bedrooms: Number(formData.get("bedrooms")),
      bathrooms: Number(formData.get("bathrooms")),
      amenities,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  redirect(`/host/listings/${data.id}/edit`);
}

export async function updateListing(listingId: string, formData: FormData) {
  const supabase = await createClient();
  const amenitiesInput = String(formData.get("amenities") ?? "");
  const amenities = amenitiesInput
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from("listings")
    .update({
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      county: formData.get("county") as string,
      town: formData.get("town") as string,
      address: (formData.get("address") as string) || null,
      price_per_night: Number(formData.get("price_per_night")),
      max_guests: Number(formData.get("max_guests")),
      bedrooms: Number(formData.get("bedrooms")),
      bathrooms: Number(formData.get("bathrooms")),
      amenities,
    })
    .eq("id", listingId); // RLS also enforces host_id = auth.uid()

  if (error) throw new Error(error.message);
  revalidatePath(`/host/listings/${listingId}/edit`);
  revalidatePath("/host");
}

export async function submitForReview(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Re-check verification server-side — don't trust the UI alone
  const { data: profile } = await supabase
    .from("profiles")
    .select("host_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.host_verified_at) {
    throw new Error(
      "Your host account must be verified before submitting a listing for review."
    );
  }

  const { error } = await supabase
    .from("listings")
    .update({ status: "pending_review" })
    .eq("id", listingId)
    .eq("status", "draft"); // only from draft, matching the admin-side workflow

  if (error) throw new Error(error.message);
  revalidatePath("/host");
}

export async function addListingImage(listingId: string, url: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("listing_images")
    .select("sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (existing?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("listing_images").insert({
    listing_id: listingId,
    url,
    sort_order: nextSortOrder,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/host/listings/${listingId}/edit`);
}

export async function deleteListingImage(imageId: string, listingId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("listing_images")
    .delete()
    .eq("id", imageId);
  if (error) throw new Error(error.message);
  revalidatePath(`/host/listings/${listingId}/edit`);
}