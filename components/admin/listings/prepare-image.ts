export type PreparedImage = {
  file: File;
  width: number;
  height: number;
  originalBytes: number;
  warning: string | null;
};

const MAX_EDGE = 2400;
const RESIZE_ABOVE_BYTES = 1.5 * 1024 * 1024;
const QUALITY = 0.85;

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * Reads the photo, fixes phone rotation, and shrinks large files (longest side 2400 px, WebP or JPEG).
 * A 6 MB phone photo usually becomes 300 to 600 KB, which matters on mobile data.
 * Falls back to the original file if the browser cannot re-encode it.
 */
export async function prepareImage(source: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(source);

  try {
    let file = source;
    let width = bitmap.width;
    let height = bitmap.height;

    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_EDGE / longest);

    if (scale < 1 || source.size > RESIZE_ABOVE_BYTES) {
      const targetWidth = Math.round(bitmap.width * scale);
      const targetHeight = Math.round(bitmap.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext("2d");

      if (context) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, targetWidth, targetHeight);
        context.imageSmoothingQuality = "high";
        context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

        let blob = await canvasToBlob(canvas, "image/webp");
        if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg");

        if (blob && (blob.size < source.size || scale < 1)) {
          const extension = blob.type === "image/webp" ? "webp" : "jpg";
          const baseName = source.name.replace(/\.[^.]+$/, "") || "photo";
          file = new File([blob], `${baseName}.${extension}`, { type: blob.type, lastModified: Date.now() });
          width = targetWidth;
          height = targetHeight;
        }
      }
    }

    let warning: string | null = null;
    if (Math.max(width, height) < 1280) {
      warning = "Low resolution. This photo will look soft on large screens.";
    } else if (height > width * 1.1) {
      warning = "Portrait photo. Guests see landscape crops, so the top and bottom will be cut.";
    }

    return { file, width, height, originalBytes: source.size, warning };
  } finally {
    bitmap.close();
  }
}