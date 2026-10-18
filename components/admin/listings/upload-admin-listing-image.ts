"use client";

import {
  createAdminListingImageUploadUrl,
  registerAdminListingImage,
} from "@/app/admin/listings/actions";
import { createClient } from "@/app/lib/supabase/client";
import type { ListingImageMetadata } from "@/components/admin/listings/image-categories";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadAdminListingImage(
  listingId: string,
  file: File,
  onProgress?: (loadedBytes: number) => void,
  metadata?: ListingImageMetadata,
) {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Each image must be smaller than 10 MB.");
  }

  const upload = await createAdminListingImageUploadUrl(listingId, file.type, file.size);
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", upload.signedUrl);
    request.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
    if (session?.access_token) {
      request.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    }
    request.setRequestHeader("cache-control", "max-age=3600");
    request.setRequestHeader("content-type", file.type);
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
      } else {
        reject(new Error("Unable to upload image."));
      }
    };
    request.onerror = () => reject(new Error("Unable to upload image."));
    request.onabort = () => reject(new Error("Image upload was interrupted."));
    request.send(file);
  });

  return registerAdminListingImage(listingId, upload.path, metadata);
}