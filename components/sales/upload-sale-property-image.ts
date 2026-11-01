"use client";

import {
  createSalePropertyImageUpload,
  registerSalePropertyImage,
} from "@/app/admin/sales/actions";
import { createClient } from "@/app/lib/supabase/client";

const IMAGE_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function uploadSalePropertyImage(
  propertyId: string,
  file: File,
  width: number,
  height: number,
) {
  if (!IMAGE_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Each photo must be JPG, PNG, or WebP and smaller than 10 MB.");
  }
  const upload = await createSalePropertyImageUpload(propertyId, file.type, file.size);
  const { error } = await createClient()
    .storage.from("sale-property-images")
    .uploadToSignedUrl(upload.path, upload.token, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) {
    console.error("Sale property photo upload failed:", error);
    throw new Error("Unable to upload the photo.");
  }
  return registerSalePropertyImage(propertyId, upload.path, width, height, "");
}
