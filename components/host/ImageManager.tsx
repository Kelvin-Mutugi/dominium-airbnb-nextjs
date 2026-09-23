// components/host/ImageManager.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import {
  uploadHostListingImage,
  deleteHostListingImage,
  reorderHostListingImages,
} from "@/app/lib/host/actions";
import type { ListingImage } from "@/app/lib/host/types";

export default function ImageManager({
  listingId,
  images,
  onChange,
}: {
  listingId: string;
  images: ListingImage[];
  onChange: (images: ListingImage[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      let nextOrder = images.length;
      const uploaded: ListingImage[] = [];
      for (const file of Array.from(files)) {
        const img = await uploadHostListingImage(listingId, file, nextOrder++);
        uploaded.push(img);
      }
      onChange([...images, ...uploaded]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteHostListingImage(id);
    onChange(images.filter((img) => img.id !== id));
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const reindexed = next.map((img, i) => ({ ...img, sort_order: i }));
    onChange(reindexed);
    await reorderHostListingImages(reindexed.map((img) => ({ id: img.id, sort_order: img.sort_order })));
  }

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-[#12231d]">Photos</h2>
      <p className="text-sm text-gray-500">The first photo is your cover photo. Drag with the arrows to reorder.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {sorted.map((img, i) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100">
            <Image src={img.url} alt="" fill className="object-cover" />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded bg-[#12231d]/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Cover
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-1.5 py-1 opacity-0 transition group-hover:opacity-100">
              <div className="flex gap-1">
                <button type="button" onClick={() => move(i, -1)} className="text-xs text-white">◀</button>
                <button type="button" onClick={() => move(i, 1)} className="text-xs text-white">▶</button>
              </div>
              <button type="button" onClick={() => handleDelete(img.id)} className="text-xs text-white">
                Delete
              </button>
            </div>
          </div>
        ))}

        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-[#ec1561] hover:text-[#ec1561]">
          {uploading ? "Uploading…" : "+ Add photos"}
          <input type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
        </label>
      </div>
    </section>
  );
}
