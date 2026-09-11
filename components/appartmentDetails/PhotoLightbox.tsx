// appartmentDetails/PhotoLightbox.tsx
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface PhotoLightboxProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

export function PhotoLightbox({ images, startIndex, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(startIndex);

  const next = () => setIndex((i) => (i + 1) % images.length);
  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-4">
        <span className="text-[14px] text-white/70">
          {index + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-2 text-white hover:bg-white/10"
        >
          <X size={22} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4">
        <button
          type="button"
          onClick={prev}
          className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronLeft size={22} />
        </button>

        <img
          src={images[index]}
          alt={`Photo ${index + 1}`}
          className="max-h-[80vh] max-w-full rounded-lg object-contain"
        />

        <button
          type="button"
          onClick={next}
          className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}