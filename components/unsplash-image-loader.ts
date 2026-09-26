import type { ImageLoaderProps } from "next/image";

export default function unsplashImageLoader({ src, width, quality }: ImageLoaderProps) {
  const imageUrl = new URL(src);
  imageUrl.searchParams.set("auto", "format");
  imageUrl.searchParams.set("fit", "crop");
  imageUrl.searchParams.set("w", String(width));
  imageUrl.searchParams.set("q", String(quality ?? 85));
  return imageUrl.toString();
}