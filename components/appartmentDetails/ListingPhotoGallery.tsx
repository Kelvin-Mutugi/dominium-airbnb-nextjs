"use client";

import Image from "next/image";
import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Images,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from "react";
import type { ListingPhoto } from "@/components/homeData";

type PhotoGroup = {
  id: string;
  label: string;
  photos: ListingPhoto[];
};

const CATEGORY_LABELS: Record<string, string> = {
  exterior: "Exterior",
  living: "Living",
  kitchen: "Kitchen",
  outdoor: "Outdoor",
  amenities: "Amenities",
  neighborhood: "View & neighborhood",
};

export function normalizeListingPhotos(
  photos: ListingPhoto[] | undefined,
  legacyGallery: string[],
): ListingPhoto[] {
  const source =
    photos?.length
      ? photos
      : legacyGallery.map((url, index) => ({
          id: `legacy-${index}-${url}`,
          url,
          position: index,
          sortOrder: index,
        }));

  return source
    .filter((photo) => Boolean(photo.url))
    .map((photo, index) => ({
      ...photo,
      id: photo.id ?? `photo-${index}-${photo.url}`,
    }))
    .sort(
      (first, second) =>
        (first.position ?? first.sortOrder ?? 0) -
          (second.position ?? second.sortOrder ?? 0) ||
        (first.sortOrder ?? 0) - (second.sortOrder ?? 0),
    );
}

function groupListingPhotos(photos: ListingPhoto[]): PhotoGroup[] {
  const groups = new Map<string, PhotoGroup>();

  for (const photo of photos) {
    const category = photo.category;
    const usesRoomIndex = category === "bedroom" || category === "bathroom";
    const categoryLabel =
      category && Object.hasOwn(CATEGORY_LABELS, category)
        ? CATEGORY_LABELS[category]
        : undefined;
    const hasCategory =
      categoryLabel !== undefined || usesRoomIndex;
    const id = category && hasCategory
      ? usesRoomIndex
        ? `${category}:${photo.roomIndex ?? "unknown"}`
        : category
      : "photos";
    const label = hasCategory && category
      ? usesRoomIndex
        ? `${category === "bedroom" ? "Bedroom" : "Bathroom"}${
            photo.roomIndex ? ` ${photo.roomIndex}` : ""
          }`
        : categoryLabel ?? "Photos"
      : "Photos";
    const group = groups.get(id) ?? { id, label, photos: [] };
    group.photos.push(photo);
    groups.set(id, group);
  }

  return [...groups.values()];
}

function photoDimensions(photo: ListingPhoto) {
  return {
    width:
      Number.isInteger(photo.width) && Number(photo.width) > 0
        ? Number(photo.width)
        : 1600,
    height:
      Number.isInteger(photo.height) && Number(photo.height) > 0
        ? Number(photo.height)
        : 1200,
  };
}

function PhotoImage({
  photo,
  alt,
  sizes,
  priority = false,
  className,
}: {
  photo: ListingPhoto;
  alt: string;
  sizes: string;
  priority?: boolean;
  className: string;
}) {
  const dimensions = photoDimensions(photo);

  return (
    <Image
      src={photo.url}
      alt={alt}
      width={dimensions.width}
      height={dimensions.height}
      sizes={sizes}
      quality={75}
      preload={priority}
      loading={priority ? undefined : "lazy"}
      className={className}
    />
  );
}

function photoDescription(
  photo: ListingPhoto,
  label: string,
  listingName: string,
  index: number,
) {
  const caption = photo.caption?.trim();
  return caption
    ? `${label}: ${caption}`
    : `${listingName}: ${label}, photo ${index + 1}`;
}

function labelForPhoto(photo: ListingPhoto, groups: PhotoGroup[]) {
  return (
    groups.find((group) =>
      group.photos.some((groupPhoto) => groupPhoto.id === photo.id),
    )?.label ?? "Photos"
  );
}

export function ListingPhotoGallery({
  listingName,
  photos: sourcePhotos,
  legacyGallery,
}: {
  listingName: string;
  photos?: ListingPhoto[];
  legacyGallery: string[];
}) {
  const photos = useMemo(
    () => normalizeListingPhotos(sourcePhotos, legacyGallery),
    [legacyGallery, sourcePhotos],
  );
  const groups = useMemo(() => groupListingPhotos(photos), [photos]);
  const cover = photos.find((photo) => photo.isCover) ?? photos[0];
  const heroPhotos = cover
    ? [cover, ...photos.filter((photo) => photo.id !== cover.id)]
    : [];
  const [mobileIndex, setMobileIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const galleryTriggerRef = useRef<HTMLButtonElement>(null);
  const galleryWasOpenRef = useRef(false);
  const galleryCloseRef = useRef<HTMLButtonElement>(null);
  const galleryGroupsRef = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!galleryOpen) {
      if (galleryWasOpenRef.current) {
        galleryWasOpenRef.current = false;
        galleryTriggerRef.current?.focus();
      }
      return;
    }

    galleryWasOpenRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    galleryCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [galleryOpen]);

  useEffect(() => {
    if (!galleryOpen || viewerIndex !== null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGalleryOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [galleryOpen, viewerIndex]);

  function showPhoto(photo: ListingPhoto) {
    const index = photos.findIndex((item) => item.id === photo.id);
    if (index >= 0) setViewerIndex(index);
  }

  function openGallery(trigger: HTMLButtonElement) {
    galleryTriggerRef.current = trigger;
    setGalleryOpen(true);
  }

  function updateMobileIndex(element: HTMLDivElement) {
    if (element.clientWidth === 0) return;
    setMobileIndex(
      Math.max(
        0,
        Math.min(
          heroPhotos.length - 1,
          Math.round(element.scrollLeft / element.clientWidth),
        ),
      ),
    );
  }

  return (
    <>
      <section aria-label={`${listingName} photos`} className="relative">
        {heroPhotos.length > 0 ? (
          <>
            <div
              onScroll={(event) => updateMobileIndex(event.currentTarget)}
              className="relative flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-2xl bg-[#F3F1EE] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:aspect-[2/1] lg:grid lg:grid-cols-[1.2fr_1fr] lg:grid-rows-2 lg:gap-2 lg:overflow-hidden"
            >
              {cover && (
                <button
                  type="button"
                  onClick={() => showPhoto(cover)}
                  aria-label={`Open cover photo: ${photoDescription(
                    cover,
                    labelForPhoto(cover, groups),
                    listingName,
                    photos.indexOf(cover),
                  )}`}
                  className="group relative aspect-[4/3] w-full flex-none snap-center overflow-hidden focus-visible:z-10 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#E23E85] lg:col-start-1 lg:row-span-2 lg:aspect-auto lg:min-h-0"
                >
                  <PhotoImage
                    photo={cover}
                    alt={photoDescription(
                      cover,
                      labelForPhoto(cover, groups),
                      listingName,
                      photos.indexOf(cover),
                    )}
                    sizes="(max-width: 1023px) 100vw, 58vw"
                    priority
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </button>
              )}
              <div className="contents lg:col-start-2 lg:row-span-2 lg:grid lg:min-h-0 lg:grid-cols-2 lg:grid-rows-2 lg:gap-2">
                {heroPhotos.slice(1).map((photo, index) => {
                  const photoIndex = photos.findIndex(
                    (item) => item.id === photo.id,
                  );
                  const label = labelForPhoto(photo, groups);
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => showPhoto(photo)}
                      aria-label={`Open photo ${index + 2} of ${photos.length}: ${photoDescription(
                        photo,
                        label,
                        listingName,
                        photoIndex,
                      )}`}
                      className={`group relative aspect-[4/3] w-full flex-none snap-center overflow-hidden focus-visible:z-10 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#E23E85] lg:aspect-auto lg:min-h-0 ${
                        index >= 4 ? "lg:hidden" : ""
                      }`}
                    >
                      <PhotoImage
                        photo={photo}
                        alt={photoDescription(
                          photo,
                          label,
                          listingName,
                          photoIndex,
                        )}
                        sizes="(max-width: 1023px) 100vw, 29vw"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </button>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/55 to-transparent px-4 pb-4 pt-12 lg:hidden">
                <span
                  aria-live="polite"
                  className="rounded-md bg-black/55 px-2.5 py-1 text-sm font-semibold text-white"
                >
                  {mobileIndex + 1} / {photos.length}
                </span>
              </div>
              <button
                type="button"
                onClick={(event) => openGallery(event.currentTarget)}
                className="absolute bottom-4 right-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#1B1A2E] shadow-md hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85] lg:px-4"
              >
                <Images size={17} aria-hidden="true" />
                Show all photos
              </button>
            </div>
          </>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-[#F3F1EE] text-sm text-gray-500 lg:aspect-[2/1]">
            Photos are not available for this listing.
          </div>
        )}
      </section>

      {galleryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${listingName} photo gallery`}
          className="fixed inset-0 z-[105] flex flex-col bg-white text-[#1B1A2E]"
        >
          <header className="flex min-h-14 shrink-0 items-center justify-between border-b border-[#E9E6DD] px-4 py-2 md:px-8">
            <div>
              <h2 className="font-semibold">{listingName} photos</h2>
              <p className="text-xs text-[#3A3856]/70">
                {photos.length} photo{photos.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              ref={galleryCloseRef}
              type="button"
              onClick={() => setGalleryOpen(false)}
              aria-label="Close photo gallery"
              className="inline-flex size-10 items-center justify-center rounded-full hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E23E85]"
            >
              <X size={21} aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <nav
              aria-label="Photo rooms"
              className="sticky top-0 z-20 border-b border-[#E9E6DD] bg-white/95 px-3 py-3 backdrop-blur"
            >
              <ul className="mx-auto flex max-w-6xl gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {groups.map((group) => (
                  <li key={group.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        galleryGroupsRef.current
                          .get(group.id)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                      className="rounded-full border border-[#D8D6CE] px-3 py-2 text-xs font-semibold text-[#3A3856] hover:border-[#E23E85] hover:text-[#E23E85] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E23E85]"
                    >
                      {group.label}
                      <span className="ml-1.5 text-[#3A3856]/60">
                        {group.photos.length}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <main className="mx-auto max-w-6xl space-y-10 px-4 py-6 md:px-8 md:py-10">
              {groups.map((group) => (
                <section
                  key={group.id}
                  ref={(element) => {
                    if (element) galleryGroupsRef.current.set(group.id, element);
                    else galleryGroupsRef.current.delete(group.id);
                  }}
                  aria-labelledby={`gallery-heading-${group.id}`}
                  className="scroll-mt-20"
                >
                  <h3
                    id={`gallery-heading-${group.id}`}
                    className="mb-4 text-xl font-semibold md:text-2xl"
                  >
                    {group.label}
                  </h3>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {group.photos.map((photo) => {
                      const photoIndex = photos.findIndex(
                        (item) => item.id === photo.id,
                      );
                      return (
                        <figure key={photo.id} className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setViewerIndex(photoIndex)}
                            aria-label={`View ${photoDescription(
                              photo,
                              group.label,
                              listingName,
                              photoIndex,
                            )}`}
                            className="group relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#F3F1EE] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#E23E85]"
                          >
                            <PhotoImage
                              photo={photo}
                              alt={photoDescription(
                                photo,
                                group.label,
                                listingName,
                                photoIndex,
                              )}
                              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                          </button>
                          {photo.caption?.trim() && (
                            <figcaption className="mt-2 text-sm leading-5 text-[#3A3856]">
                              {photo.caption.trim()}
                            </figcaption>
                          )}
                        </figure>
                      );
                    })}
                  </div>
                </section>
              ))}
            </main>
          </div>

          {viewerIndex !== null && (
            <PhotoViewer
              listingName={listingName}
              photos={photos}
              groups={groups}
              startIndex={viewerIndex}
              onClose={() => setViewerIndex(null)}
            />
          )}
        </div>
      )}

      {!galleryOpen && viewerIndex !== null && (
        <PhotoViewer
          listingName={listingName}
          photos={photos}
          groups={groups}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}

function PhotoViewer({
  listingName,
  photos,
  groups,
  startIndex,
  onClose,
}: {
  listingName: string;
  photos: ListingPhoto[];
  groups: PhotoGroup[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  const photo = photos[index];
  const group =
    groups.find((item) =>
      item.photos.some((groupPhoto) => groupPhoto.id === photo.id),
    ) ?? groups[0];
  const label = group?.label ?? "Photos";

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key === "ArrowRight" && photos.length > 1) {
        event.preventDefault();
        setIndex((current) => (current + 1) % photos.length);
        return;
      }
      if (event.key === "ArrowLeft" && photos.length > 1) {
        event.preventDefault();
        setIndex((current) => (current - 1 + photos.length) % photos.length);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [photos.length]);

  function moveBy(delta: number) {
    setIndex((current) => (current + delta + photos.length) % photos.length);
  }

  function finishSwipe(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 48 || photos.length < 2) return;
    moveBy(delta < 0 ? 1 : -1);
  }

  if (!photo) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${label}: ${photo.caption?.trim() || listingName}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0].clientX;
      }}
      onTouchEnd={finishSwipe}
      className="fixed inset-0 z-[115] flex flex-col bg-black/95 text-white"
    >
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 md:px-8">
        <div aria-live="polite">
          <p className="text-sm font-semibold">
            {index + 1} / {photos.length}
          </p>
          <p className="text-xs text-white/70">{label}</p>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close photo viewer"
          className="inline-flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 py-3 md:px-20">
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => moveBy(-1)}
            aria-label="Previous photo"
            className="absolute left-3 z-10 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white md:left-8"
          >
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
        )}
        <Image
          src={photo.url}
          alt={photoDescription(photo, label, listingName, index)}
          width={photoDimensions(photo).width}
          height={photoDimensions(photo).height}
          sizes="100vw"
          quality={75}
          loading="lazy"
          className="max-h-full max-w-full rounded-md object-contain"
        />
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => moveBy(1)}
            aria-label="Next photo"
            className="absolute right-3 z-10 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white md:right-8"
          >
            <ChevronRight size={24} aria-hidden="true" />
          </button>
        )}
      </div>

      <footer className="shrink-0 px-5 pb-5 pt-2 text-center md:pb-8">
        <p className="text-sm font-semibold">{label}</p>
        {photo.caption?.trim() && (
          <p className="mx-auto mt-1 max-w-2xl text-sm text-white/75">
            {photo.caption.trim()}
          </p>
        )}
      </footer>
    </div>
  );
}

export function WhereYoullSleep({
  photos: sourcePhotos,
  legacyGallery,
  bedroomCount,
}: {
  photos?: ListingPhoto[];
  legacyGallery: string[];
  bedroomCount: number;
}) {
  const photos = useMemo(
    () => normalizeListingPhotos(sourcePhotos, legacyGallery),
    [legacyGallery, sourcePhotos],
  );
  const photoBedroomCount = photos.reduce(
    (maximum, photo) =>
      photo.category === "bedroom" && Number.isInteger(photo.roomIndex)
        ? Math.max(maximum, Number(photo.roomIndex))
        : maximum,
    0,
  );
  const count = Math.max(
    Number.isInteger(bedroomCount) && bedroomCount > 0 ? bedroomCount : 0,
    photoBedroomCount,
  );

  if (count === 0) return null;

  return (
    <section
      aria-labelledby="where-youll-sleep-heading"
      className="mb-6 min-w-0 rounded-[24px] bg-white p-5 shadow-[0_2px_30px_rgba(0,0,0,0.07)] md:mb-8 md:p-6"
    >
      <h2
        id="where-youll-sleep-heading"
        className="mb-4 text-2xl font-semibold text-[#1B1A2E]"
      >
        Where you&apos;ll sleep
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }, (_, index) => {
          const roomIndex = index + 1;
          const photo = photos.find(
            (item) =>
              item.category === "bedroom" && item.roomIndex === roomIndex,
          );
          return (
            <article
              key={roomIndex}
              className="overflow-hidden rounded-xl border border-[#E9E6DD] bg-white"
            >
              {photo ? (
                <PhotoImage
                  photo={photo}
                  alt={photoDescription(
                    photo,
                    `Bedroom ${roomIndex}`,
                    `Bedroom ${roomIndex}`,
                    0,
                  )}
                  sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw"
                  className="aspect-[4/3] h-auto w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-[#F3F1EE] text-[#7B7888]">
                  <BedDouble size={34} aria-hidden="true" />
                  <span className="sr-only">Bedroom photo not available</span>
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-[#1B1A2E]">
                  Bedroom {roomIndex}
                </h3>
                <p className="mt-1 text-sm leading-5 text-[#3A3856]">
                  {photo?.caption?.trim() || "Bedroom details not provided."}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
