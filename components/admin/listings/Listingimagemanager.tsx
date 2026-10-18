"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Images,
  Loader2,
  Minus,
  Plus,
  Star,
  X,
} from "lucide-react";
import {
  ACCEPTED_TYPES,
  MAX_CAPTION,
  MAX_IMAGES,
  MAX_ORIGINAL_BYTES,
  MAX_ROOMS,
  MAX_UPLOAD_BYTES,
  buildSlots,
  ensureCover,
  getReadiness,
  sourceKeyOf,
  uid,
  type RoomCounts,
  type Slot,
  type StagedImage,
} from "./image-categories";
import { prepareImage } from "./prepare-image";

type Props = {
  images: StagedImage[];
  setImages: Dispatch<SetStateAction<StagedImage[]>>;
  rooms: RoomCounts;
  setRooms: (rooms: RoomCounts) => void;
  disabled?: boolean;
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec1561] focus-visible:ring-offset-1";

function hasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer.types).includes("Files");
}

export function ListingImageManager({ images, setImages, rooms, setRooms, disabled = false }: Props) {
  const slots = useMemo(() => buildSlots(rooms), [rooms]);
  const [activeId, setActiveId] = useState<string>("exterior");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notices, setNotices] = useState<string[]>([]);
  const [processing, setProcessing] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addTargetRef = useRef<string | null>(null);
  const imagesRef = useRef(images);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);

  const activeSlot = slots.find((slot) => slot.id === activeId) ?? slots[0];
  const unsorted = images.filter((image) => !image.slot);
  const slotImages = images.filter((image) => image.slot === activeSlot.id);
  const readiness = getReadiness(images, slots);
  const busy = disabled || processing > 0;

  function changeRooms(next: RoomCounts) {
    const valid = new Set(buildSlots(next).map((slot) => slot.id));
    const orphaned = imagesRef.current.filter((image) => image.slot && !valid.has(image.slot)).length;
    setImages((current) => current.map((image) => (image.slot && !valid.has(image.slot) ? { ...image, slot: null } : image)));
    if (orphaned > 0) {
      setNotices([`${orphaned} photo${orphaned === 1 ? "" : "s"} from a removed room moved to Unsorted.`]);
    }
    setRooms(next);
  }

  async function addFiles(files: File[], slotId: string | null) {
    if (files.length === 0) return;

    const problems: string[] = [];
    const known = new Set(imagesRef.current.map((image) => image.sourceKey));
    let room = MAX_IMAGES - imagesRef.current.length;
    const fresh: File[] = [];

    for (const file of files) {
      const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
      if (isHeic) {
        problems.push(`${file.name}: iPhone HEIC photos are not supported. Share it as JPG, or set the camera to Most Compatible.`);
      } else if (!ACCEPTED_TYPES.includes(file.type)) {
        problems.push(`${file.name}: use a JPG, PNG or WebP image.`);
      } else if (file.size === 0 || file.size > MAX_ORIGINAL_BYTES) {
        problems.push(`${file.name}: images must be under ${MAX_ORIGINAL_BYTES / (1024 * 1024)} MB.`);
      } else if (known.has(sourceKeyOf(file))) {
        problems.push(`${file.name}: already added.`);
      } else if (room <= 0) {
        problems.push(`${file.name}: the limit is ${MAX_IMAGES} photos per listing.`);
      } else {
        known.add(sourceKeyOf(file));
        fresh.push(file);
        room -= 1;
      }
    }

    setNotices(problems);
    if (fresh.length === 0) return;

    setProcessing((count) => count + fresh.length);
    const results = await Promise.all(
      fresh.map(async (file) => {
        try {
          const prepared = await prepareImage(file);
          if (prepared.file.size > MAX_UPLOAD_BYTES) {
            return {
              ok: false as const,
              error: `${file.name}: still over 10 MB after resizing. Use a smaller photo.`,
            };
          }
          return { ok: true as const, file, prepared };
        } catch {
          return {
            ok: false as const,
            error: `${file.name}: could not be read. Try another photo.`,
          };
        } finally {
          setProcessing((count) => count - 1);
        }
      }),
    );
    const created: StagedImage[] = [];
    for (const result of results) {
      if (!result.ok) {
        continue;
      }
      created.push({
        id: uid(),
        file: result.prepared.file,
        previewUrl: URL.createObjectURL(result.prepared.file),
        slot: slotId,
        caption: "",
        width: result.prepared.width,
        height: result.prepared.height,
        sourceKey: sourceKeyOf(result.file),
        originalBytes: result.prepared.originalBytes,
        isCover: false,
        warning: result.prepared.warning,
      });
    }

    const processingErrors = results.flatMap((result) =>
      result.ok ? [] : [result.error],
    );
    setNotices([...problems, ...processingErrors]);
    if (created.length > 0) setImages((current) => ensureCover([...current, ...created]));
  }

  function openPicker(slotId: string | null) {
    addTargetRef.current = slotId;
    inputRef.current?.click();
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void addFiles(files, addTargetRef.current);
  }

  function moveToSlot(ids: string[], slotId: string | null) {
    const idSet = new Set(ids);
    setImages((current) => {
      const moved = current.filter((image) => idSet.has(image.id)).map((image) => ({ ...image, slot: slotId }));
      return ensureCover([...current.filter((image) => !idSet.has(image.id)), ...moved]);
    });
    setSelected(new Set());
  }

  function moveBefore(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    setImages((current) => {
      const dragged = current.find((image) => image.id === draggedId);
      const target = current.find((image) => image.id === targetId);
      if (!dragged || !target) return current;
      const rest = current.filter((image) => image.id !== draggedId);
      rest.splice(
        rest.findIndex((image) => image.id === targetId),
        0,
        { ...dragged, slot: target.slot },
      );
      return rest;
    });
  }

  function shift(id: string, direction: -1 | 1) {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (!target) return current;
      const group = current.filter((image) => image.slot === target.slot);
      const neighbor = group[group.findIndex((image) => image.id === id) + direction];
      if (!neighbor) return current;
      const next = [...current];
      const a = current.indexOf(target);
      const b = current.indexOf(neighbor);
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  }

  function removeImages(ids: string[]) {
    const idSet = new Set(ids);
    imagesRef.current.filter((image) => idSet.has(image.id)).forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages((current) => ensureCover(current.filter((image) => !idSet.has(image.id))));
    setSelected((current) => new Set([...current].filter((id) => !idSet.has(id))));
  }

  function setCover(id: string) {
    setImages((current) => current.map((image) => ({ ...image, isCover: image.id === id })));
  }

  function setCaption(id: string, caption: string) {
    setImages((current) => current.map((image) => (image.id === id ? { ...image, caption: caption.slice(0, MAX_CAPTION) } : image)));
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDropOnTarget(event: DragEvent, slotId: string) {
    event.preventDefault();
    setDropTarget(null);
    if (hasFiles(event)) {
      void addFiles(Array.from(event.dataTransfer.files), slotId);
    } else if (dragId) {
      moveToSlot([dragId], slotId);
      setActiveId(slotId);
    }
    setDragId(null);
  }

  function allowDrop(event: DragEvent, targetKey: string) {
    if (disabled || (!dragId && !hasFiles(event))) return;
    event.preventDefault();
    setDropTarget(targetKey);
  }

  const cardHandlers = (image: StagedImage) => ({
    onDragStart: (event: DragEvent) => {
      setDragId(image.id);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", image.id);
    },
    onDragEnd: () => {
      setDragId(null);
      setDropTarget(null);
    },
    onDragOver: (event: DragEvent) => {
      if (dragId && dragId !== image.id) allowDrop(event, image.id);
    },
    onDrop: (event: DragEvent) => {
      if (!dragId) return;
      event.preventDefault();
      event.stopPropagation();
      moveBefore(dragId, image.id);
      setDragId(null);
      setDropTarget(null);
    },
  });

  const selectedIds = [...selected];

  return (
    <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm" aria-labelledby="listing-photos-heading">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        onChange={onPick}
        className="sr-only"
        tabIndex={-1}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Images size={18} className="text-gray-500" aria-hidden="true" />
            <h2 id="listing-photos-heading" className="text-sm font-semibold text-[#12231d]">
              Listing photos
            </h2>
          </div>
          <p className="mt-1 max-w-xl text-xs text-gray-500">
            Guests judge a place by its photos, room by room. Sort each photo into the room it shows. Large photos are
            resized here before upload.
          </p>
        </div>
        <div className="flex gap-4">
          <Stepper
            label="Bedrooms"
            value={rooms.bedrooms}
            min={1}
            max={MAX_ROOMS}
            disabled={disabled}
            onChange={(bedrooms) => changeRooms({ ...rooms, bedrooms })}
          />
          <Stepper
            label="Bathrooms"
            value={rooms.bathrooms}
            min={1}
            max={MAX_ROOMS}
            disabled={disabled}
            onChange={(bathrooms) => changeRooms({ ...rooms, bathrooms })}
          />
        </div>
      </div>

      <Readiness
        total={images.length}
        readiness={readiness}
        onJump={(slotId) => setActiveId(slotId)}
      />

      {notices.length > 0 && (
        <div role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <ul className="space-y-0.5">
            {notices.slice(0, 5).map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
            {notices.length > 5 && <li>And {notices.length - 5} more.</li>}
          </ul>
        </div>
      )}

      {/* Bulk drop and unsorted tray */}
      {images.length === 0 ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => openPicker(null)}
          onDragOver={(event) => allowDrop(event, "bulk")}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(event) => {
            event.preventDefault();
            setDropTarget(null);
            if (hasFiles(event)) void addFiles(Array.from(event.dataTransfer.files), null);
          }}
          className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors motion-reduce:transition-none ${focusRing} ${
            dropTarget === "bulk" ? "border-[#ec1561] bg-pink-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }`}
        >
          {processing > 0 ? (
            <Loader2 size={28} className="animate-spin text-gray-400" aria-hidden="true" />
          ) : (
            <ImagePlus size={28} className="text-gray-400" aria-hidden="true" />
          )}
          <span className="text-sm font-semibold text-[#12231d]">
            {processing > 0 ? "Preparing photos..." : "Drop all the photos here"}
          </span>
          <span className="text-xs text-gray-500">Add them in one go, then sort them into rooms. JPG, PNG or WebP.</span>
        </button>
      ) : (
        <div
          onDragOver={(event) => hasFiles(event) && allowDrop(event, "bulk")}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(event) => {
            if (!hasFiles(event)) return;
            event.preventDefault();
            setDropTarget(null);
            void addFiles(Array.from(event.dataTransfer.files), null);
          }}
          className={`rounded-xl border p-3 transition-colors motion-reduce:transition-none ${
            dropTarget === "bulk" ? "border-[#ec1561] bg-pink-50" : unsorted.length > 0 ? "border-amber-300 bg-amber-50/60" : "border-gray-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#12231d]">
              {unsorted.length > 0
                ? `${unsorted.length} photo${unsorted.length === 1 ? "" : "s"} to sort`
                : "All photos sorted"}
              {processing > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-gray-500">
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Preparing {processing}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => openPicker(null)}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#1B1A2E] hover:bg-gray-50 disabled:opacity-50 ${focusRing}`}
            >
              <ImagePlus size={14} aria-hidden="true" />
              Add photos
            </button>
          </div>
          {unsorted.length > 0 && (
            <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {unsorted.map((image) => (
                <PhotoCard
                  key={image.id}
                  variant="tray"
                  image={image}
                  slots={slots}
                  selected={selected.has(image.id)}
                  disabled={disabled}
                  dropping={dropTarget === image.id}
                  onToggleSelect={() => toggleSelected(image.id)}
                  onRemove={() => removeImages([image.id])}
                  onMove={(slotId) => moveToSlot([image.id], slotId)}
                  {...cardHandlers(image)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#12231d] px-3 py-2 text-sm text-white" role="region" aria-label="Selected photos">
          <span className="font-semibold">{selectedIds.length} selected</span>
          <select
            value=""
            onChange={(event) => {
              const value = event.target.value;
              if (value) moveToSlot(selectedIds, value === "__unsorted" ? null : value);
            }}
            disabled={disabled}
            aria-label="Move selected photos to"
            className={`rounded-md border-0 bg-white/15 px-2 py-1 text-xs text-white ${focusRing}`}
          >
            <option value="" className="text-black">Move to...</option>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id} className="text-black">{slot.label}</option>
            ))}
            <option value="__unsorted" className="text-black">Unsorted</option>
          </select>
          <button
            type="button"
            onClick={() => removeImages(selectedIds)}
            disabled={disabled}
            className={`rounded-md bg-white/15 px-2 py-1 text-xs hover:bg-red-500 ${focusRing}`}
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className={`ml-auto rounded-md px-2 py-1 text-xs text-white/80 hover:text-white ${focusRing}`}
          >
            Clear
          </button>
        </div>
      )}

      {/* Rooms */}
      <div className="grid gap-4 md:grid-cols-[230px_minmax(0,1fr)]">
        <nav aria-label="Photo rooms" className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          {slots.map((slot) => {
            const count = images.filter((image) => image.slot === slot.id).length;
            const met = slot.min > 0 && count >= slot.min;
            const short = slot.min > 0 && count < slot.min;
            const active = slot.id === activeSlot.id;
            return (
              <button
                key={slot.id}
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => setActiveId(slot.id)}
                onDragOver={(event) => allowDrop(event, slot.id)}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(event) => handleDropOnTarget(event, slot.id)}
                className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors motion-reduce:transition-none ${focusRing} ${
                  dropTarget === slot.id
                    ? "bg-pink-100 ring-2 ring-[#ec1561]"
                    : active
                      ? "bg-[#12231d] text-white"
                      : "bg-gray-50 text-[#12231d] hover:bg-gray-100"
                }`}
              >
                <span className="truncate">{slot.label}</span>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active
                      ? "bg-white/15 text-white"
                      : met
                        ? "bg-emerald-100 text-emerald-800"
                        : short
                          ? "bg-amber-100 text-amber-900"
                          : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {met && <Check size={12} aria-hidden="true" />}
                  {count}
                  {slot.min > 0 && <span className="font-normal opacity-70">/{slot.min}</span>}
                </span>
              </button>
            );
          })}
        </nav>

        <div
          onDragOver={(event) => allowDrop(event, "panel")}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(event) => handleDropOnTarget(event, activeSlot.id)}
          className={`min-w-0 rounded-xl border p-4 transition-colors motion-reduce:transition-none ${
            dropTarget === "panel" ? "border-[#ec1561] bg-pink-50" : "border-gray-200"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[#12231d]">{activeSlot.label}</h3>
              <p className="mt-1 max-w-lg text-sm text-gray-600">{activeSlot.hint}</p>
            </div>
            <button
              type="button"
              onClick={() => openPicker(activeSlot.id)}
              disabled={busy}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#ec1561] px-3 py-2 text-sm font-semibold text-white hover:bg-[#c93075] disabled:opacity-50 ${focusRing}`}
            >
              <ImagePlus size={16} aria-hidden="true" />
              Add to {activeSlot.label.toLowerCase()}
            </button>
          </div>

          {slotImages.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              {activeSlot.min > 0
                ? `No photos yet. Aim for at least ${activeSlot.min}. Drag photos here from the tray or your computer.`
                : "Nothing here yet. This room is optional."}
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
              {slotImages.map((image, index) => (
                <PhotoCard
                  key={image.id}
                  variant="grid"
                  image={image}
                  slots={slots}
                  position={index}
                  count={slotImages.length}
                  captionHint={activeSlot.captionExample}
                  selected={selected.has(image.id)}
                  disabled={disabled}
                  dropping={dropTarget === image.id}
                  onToggleSelect={() => toggleSelected(image.id)}
                  onSetCover={() => setCover(image.id)}
                  onRemove={() => removeImages([image.id])}
                  onCaption={(caption) => setCaption(image.id, caption)}
                  onShift={(direction) => shift(image.id, direction)}
                  onMove={(slotId) => moveToSlot([image.id], slotId)}
                  {...cardHandlers(image)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function Readiness({
  total,
  readiness,
  onJump,
}: {
  total: number;
  readiness: ReturnType<typeof getReadiness>;
  onJump: (slotId: string) => void;
}) {
  const done = readiness.missing.length === 0 && total > 0;
  return (
    <div className="rounded-xl bg-[#f3efe9] p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-[#12231d]">
          {done ? "Ready for guests" : "Getting guest-ready"}
        </p>
        <p className="text-xs text-gray-600">
          {total} photo{total === 1 ? "" : "s"} · {readiness.have} of {readiness.want} recommended
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Photo coverage"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={readiness.score}
        className="mt-2 h-2 overflow-hidden rounded-full bg-white"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${done ? "bg-emerald-500" : "bg-[#ec1561]"}`}
          style={{ width: `${readiness.score}%` }}
        />
      </div>
      {readiness.missing.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {readiness.missing.map(({ slot, need }) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => onJump(slot.id)}
              className={`rounded-full bg-white px-2.5 py-1 text-xs text-[#12231d] hover:bg-amber-100 ${focusRing}`}
            >
              {slot.label}: {need} more
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="text-xs text-gray-600">
      <span id={`stepper-${label}`}>{label}</span>
      <div className="mt-1 flex items-center gap-2" role="group" aria-labelledby={`stepper-${label}`}>
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={disabled || value <= min}
          aria-label={`Fewer ${label.toLowerCase()}`}
          className={`rounded-full border border-gray-300 p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40 ${focusRing}`}
        >
          <Minus size={14} aria-hidden="true" />
        </button>
        <span className="w-5 text-center text-sm font-semibold text-[#12231d]" aria-live="polite">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={disabled || value >= max}
          aria-label={`More ${label.toLowerCase()}`}
          className={`rounded-full border border-gray-300 p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40 ${focusRing}`}
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

type PhotoCardProps = {
  variant: "tray" | "grid";
  image: StagedImage;
  slots: Slot[];
  position?: number;
  count?: number;
  captionHint?: string;
  selected: boolean;
  disabled: boolean;
  dropping: boolean;
  onToggleSelect: () => void;
  onSetCover?: () => void;
  onRemove: () => void;
  onCaption?: (caption: string) => void;
  onShift?: (direction: -1 | 1) => void;
  onMove: (slotId: string | null) => void;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
};

function PhotoCard({
  variant,
  image,
  slots,
  position = 0,
  count = 1,
  captionHint,
  selected,
  disabled,
  dropping,
  onToggleSelect,
  onSetCover,
  onRemove,
  onCaption,
  onShift,
  onMove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: PhotoCardProps) {
  const isGrid = variant === "grid";
  const iconButton = `rounded-full bg-white/90 p-1.5 text-gray-700 shadow-sm hover:bg-white ${focusRing}`;

  return (
    <li
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`${isGrid ? "min-w-0" : "w-36 shrink-0"} space-y-1.5 rounded-lg ${dropping ? "ring-2 ring-[#ec1561] ring-offset-2" : ""}`}
    >
      <div className={`group relative overflow-hidden rounded-lg bg-gray-100 ${isGrid ? "aspect-[4/3]" : "aspect-square"} ${selected ? "ring-2 ring-[#12231d]" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.previewUrl}
          alt={image.caption || image.file?.name || "Saved listing photo"}
          draggable={false}
          className="h-full w-full object-cover"
        />

        <label className="absolute left-1.5 top-1.5 flex cursor-pointer items-center rounded-full bg-white/90 p-1.5 shadow-sm">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${image.file?.name ?? "saved listing photo"}`}
            className="h-3.5 w-3.5 accent-[#12231d]"
          />
        </label>

        <div className="absolute right-1.5 top-1.5 flex gap-1">
          {isGrid && onSetCover && (
            <button
              type="button"
              onClick={onSetCover}
              disabled={disabled}
              aria-pressed={image.isCover}
              aria-label={image.isCover ? "Cover photo" : "Make this the cover photo"}
              title={image.isCover ? "Cover photo" : "Make cover photo"}
              className={`${iconButton} ${image.isCover ? "text-[#f2a71b]" : ""}`}
            >
              <Star size={14} aria-hidden="true" fill={image.isCover ? "currentColor" : "none"} />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Remove ${image.file?.name ?? "saved listing photo"}`}
            title="Remove photo"
            className={`${iconButton} hover:text-red-600`}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        {image.isCover && (
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[#12231d] px-2 py-0.5 text-xs font-semibold text-white">
            Cover
          </span>
        )}
        {image.warning && (
          <span
            title={image.warning}
            className="absolute bottom-1.5 right-1.5 inline-flex items-center rounded-full bg-amber-100 p-1 text-amber-800"
          >
            <AlertTriangle size={12} aria-hidden="true" />
            <span className="sr-only">{image.warning}</span>
          </span>
        )}
      </div>

      {isGrid && onCaption && (
        <input
          value={image.caption}
          onChange={(event) => onCaption(event.target.value)}
          disabled={disabled}
          maxLength={MAX_CAPTION}
          placeholder={captionHint}
          aria-label={`Caption for ${image.file?.name ?? "saved listing photo"}`}
          className={`w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-[#12231d] placeholder:text-gray-400 ${focusRing}`}
        />
      )}

      <div className="flex items-center gap-1">
        {isGrid && onShift && (
          <>
            <button
              type="button"
              onClick={() => onShift(-1)}
              disabled={disabled || position === 0}
              aria-label="Move earlier"
              className={`rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30 ${focusRing}`}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onShift(1)}
              disabled={disabled || position === count - 1}
              aria-label="Move later"
              className={`rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30 ${focusRing}`}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </>
        )}
        <select
          value=""
          onChange={(event) => {
            const value = event.target.value;
            if (value) onMove(value === "__unsorted" ? null : value);
          }}
          disabled={disabled}
          aria-label={`Move ${image.file?.name ?? "saved listing photo"} to a room`}
          className={`min-w-0 flex-1 rounded border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-700 ${focusRing}`}
        >
          <option value="">{isGrid ? "Move to..." : "Sort into..."}</option>
          {slots.map((slot) => (
            <option key={slot.id} value={slot.id}>
              {slot.label}
            </option>
          ))}
          {isGrid && <option value="__unsorted">Unsorted</option>}
        </select>
      </div>
    </li>
  );
}