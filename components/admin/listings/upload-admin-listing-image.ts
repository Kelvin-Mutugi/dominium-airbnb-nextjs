"use client";

import {
  createAdminListingImageUploadUrl,
  registerAdminListingImage,
} from "@/app/admin/listings/actions";
import { createClient } from "@/app/lib/supabase/client";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadAdminListingImage(listingId: string, file: File) {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Each image must be smaller than 10 MB.");
  }

  const upload = await createAdminListingImageUploadUrl(listingId, file.type, file.size);
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("listing-images")
    .uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type });
  if (error) throw new Error("Unable to upload image.");

  return registerAdminListingImage(listingId, upload.path);
}