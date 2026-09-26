import type { ImageLoaderProps } from "next/image";

function createUnsplashLoader(widthScale: number) {
  return ({ src, width, quality }: ImageLoaderProps) => {
    const imageUrl = new URL(src);
    imageUrl.searchParams.set("auto", "format");
    imageUrl.searchParams.set("fit", "crop");
    imageUrl.searchParams.set("w", String(Math.round(width * widthScale)));
    imageUrl.searchParams.set("q", String(quality ?? 85));
    return imageUrl.toString();
  };
}

const unsplashImageLoader = createUnsplashLoader(1);

export const unsplashCardImageLoader = createUnsplashLoader(1.25);

export default unsplashImageLoader;