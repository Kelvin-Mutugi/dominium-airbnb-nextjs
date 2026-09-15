// appartmentDetails/PhotoLightbox.tsx
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

interface PhotoLightboxProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

export function PhotoLightbox({ images, startIndex, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const next = () => setIndex((i) => (i + 1) % images.length);
  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-black/95"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Property photos"
    >
      <div className="flex items-center justify-between p-4">
        <span className="text-[14px] text-white/70">
          {index + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          aria-label="Close"
          className="rounded-full p-2 text-white hover:bg-white/10"
        >
          <X size={22} />
        </button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center px-4"
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            prev();
          }}
          aria-label="Previous photo"
          className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronLeft size={22} />
        </button>

        <img
          src={images[index]}
          alt={`Photo ${index + 1}`}
          className="max-h-[80vh] max-w-full rounded-lg object-contain"
          onClick={(event) => event.stopPropagation()}
        />

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            next();
          }}
          aria-label="Next photo"
          className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}