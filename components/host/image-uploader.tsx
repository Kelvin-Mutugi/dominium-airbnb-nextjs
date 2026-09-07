// components/host/image-uploader.tsx
"use client";

import { useState, useTransition } from "react";
import { createBrowserSupabase } from "@/app/lib/supabase/browser";
import { addListingImage, deleteListingImage } from "@/app/host/listings/actions";

export function ImageUploader({
  listingId,
  images,
}: {
  listingId: string;
  images: { id: string; url: string }[];
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const supabase = createBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      await Promise.all(
        files.map(async (file) => {
          const path = `${user.id}/${listingId}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("listing-images")
            .upload(path, file);
          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("listing-images").getPublicUrl(path);

          await addListingImage(listingId, publicUrl);
        }),
      );
    } catch (err) {
      console.error(err);
      alert("Upload failed — try again.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {images.map((img) => (
          <div key={img.id} className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt=""
              className="w-full h-24 object-cover rounded"
            />
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(() => deleteListingImage(img.id, listingId))
              }
              className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded px-2 py-0.5 opacity-0 group-hover:opacity-100"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <label className="inline-flex items-center justify-center px-4 py-2 rounded border border-slate-300 bg-slate-900 text-sm font-medium text-white cursor-pointer shadow-sm transition hover:bg-slate-800">
        {isUploading ? "Uploading..." : "Add Photos"}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
        />
      </label>
    </div>
  );
}