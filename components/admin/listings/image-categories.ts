export type CategoryKey =
  | "exterior"
  | "living"
  | "kitchen"
  | "bedroom"
  | "bathroom"
  | "outdoor"
  | "amenities"
  | "neighborhood";

export type RoomCounts = { bedrooms: number; bathrooms: number };

/** One place a photo can live. Bedrooms and bathrooms repeat: "bedroom:1", "bedroom:2"... */
export type Slot = {
  id: string;
  category: CategoryKey;
  roomIndex: number | null;
  label: string;
  hint: string;
  captionExample: string;
  /** Recommended minimum photos. 0 means optional. */
  min: number;
};

export type StagedImage = {
  id: string;
  /** The file that will actually be uploaded (already resized). */
  file: File | null;
  persistedImageId?: string;
  position?: number;
  previewUrl: string;
  /** Slot id, or null while the photo is still unsorted. */
  slot: string | null;
  caption: string;
  width: number;
  height: number;
  /** Identifies the original pick, so the same photo is not added twice. */
  sourceKey: string;
  originalBytes: number;
  isCover: boolean;
  warning: string | null;
};

export type UploadPlanItem = {
  clientId: string;
  file: File;
  category: CategoryKey;
  roomIndex: number | null;
  caption: string;
  /** 0 is the cover photo, then rooms in guest order. */
  position: number;
  isCover: boolean;
  width: number;
  height: number;
};

export type ListingImageMetadata = Omit<
  UploadPlanItem,
  "clientId" | "file"
>;

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGES = 40;
/** Phone photos are resized in the browser, so the pick limit is higher than the upload limit. */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_CAPTION = 80;
export const MAX_ROOMS = 10;

type CategoryDef = {
  label: string;
  hint: string;
  captionExample: string;
  min: number;
};

const CATEGORY_DEFS: Record<CategoryKey, CategoryDef> = {
  exterior: {
    label: "Exterior & entrance",
    hint: "The building from the street, the gate, and the path to the front door. Guests want to know what arriving feels like.",
    captionExample: "Front of the building from the street",
    min: 2,
  },
  living: {
    label: "Living area",
    hint: "Shoot from a corner so the whole room fits, with seating and the TV in view. Switch the lights on.",
    captionExample: "Sofa, TV and dining table",
    min: 2,
  },
  kitchen: {
    label: "Kitchen & dining",
    hint: "The cooker, fridge, sink and cupboards. Guests check this before they trust a listing.",
    captionExample: "Gas cooker, fridge and kettle",
    min: 2,
  },
  bedroom: {
    label: "Bedroom",
    hint: "The whole bed, the storage and the window. Put the bed size in the caption.",
    captionExample: "One queen bed with a wardrobe",
    min: 2,
  },
  bathroom: {
    label: "Bathroom",
    hint: "The shower, toilet and sink. Mention hot water if there is a heater.",
    captionExample: "Shower with hot water",
    min: 1,
  },
  outdoor: {
    label: "Balcony & outdoors",
    hint: "Balcony, garden, rooftop or pool. Skip this if there is no outdoor space.",
    captionExample: "Balcony with seating",
    min: 0,
  },
  amenities: {
    label: "Amenities",
    hint: "Wi-Fi and a work desk, parking, laundry, security, backup power, the water tank. Anything that answers a practical question.",
    captionExample: "Reserved parking behind the gate",
    min: 1,
  },
  neighborhood: {
    label: "View & neighborhood",
    hint: "The view from the window or balcony, the street, and nearby shops or landmarks.",
    captionExample: "View of the estate from the balcony",
    min: 1,
  },
};

function repeated(category: "bedroom" | "bathroom", count: number): Slot[] {
  const def = CATEGORY_DEFS[category];
  return Array.from({ length: count }, (_, i) => ({
    id: `${category}:${i + 1}`,
    category,
    roomIndex: i + 1,
    label: count === 1 ? def.label : `${def.label} ${i + 1}`,
    hint: def.hint,
    captionExample: def.captionExample,
    min: def.min,
  }));
}

function single(category: Exclude<CategoryKey, "bedroom" | "bathroom">): Slot {
  const def = CATEGORY_DEFS[category];
  return {
    id: category,
    category,
    roomIndex: null,
    label: def.label,
    hint: def.hint,
    captionExample: def.captionExample,
    min: def.min,
  };
}

/** Slots in the order guests will see them. */
export function buildSlots(rooms: RoomCounts): Slot[] {
  return [
    single("exterior"),
    single("living"),
    single("kitchen"),
    ...repeated("bedroom", Math.max(1, rooms.bedrooms)),
    ...repeated("bathroom", Math.max(1, rooms.bathrooms)),
    single("outdoor"),
    single("amenities"),
    single("neighborhood"),
  ];
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sourceKeyOf(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/** Keeps exactly one cover. Prefers the first exterior photo. */
export function ensureCover(list: StagedImage[]): StagedImage[] {
  if (list.length === 0 || list.some((image) => image.isCover)) return list;
  const pick = list.find((image) => image.slot === "exterior") ?? list.find((image) => image.slot) ?? list[0];
  return list.map((image) => (image.id === pick.id ? { ...image, isCover: true } : image));
}

export type Readiness = {
  score: number;
  have: number;
  want: number;
  missing: { slot: Slot; need: number }[];
};

export function getReadiness(images: StagedImage[], slots: Slot[]): Readiness {
  let have = 0;
  let want = 0;
  const missing: Readiness["missing"] = [];

  for (const slot of slots) {
    if (slot.min === 0) continue;
    const count = images.filter((image) => image.slot === slot.id).length;
    want += slot.min;
    have += Math.min(count, slot.min);
    if (count < slot.min) missing.push({ slot, need: slot.min - count });
  }

  return { score: want === 0 ? 0 : Math.round((have / want) * 100), have, want, missing };
}

/** Final order: cover first, then rooms in guest order, photos as arranged. */
export function buildImagePlan(
  images: StagedImage[],
  slots: Slot[],
): (ListingImageMetadata & {
  clientId: string;
  file: File | null;
  persistedImageId?: string;
})[] {
  const ordered: { image: StagedImage; slot: Slot }[] = [];
  for (const slot of slots) {
    for (const image of images) {
      if (image.slot === slot.id) ordered.push({ image, slot });
    }
  }

  const coverIndex = Math.max(0, ordered.findIndex(({ image }) => image.isCover));
  const gallery = ordered.length ? [ordered[coverIndex], ...ordered.filter((_, i) => i !== coverIndex)] : [];

  return gallery.map(({ image, slot }, position) => ({
    clientId: image.id,
    file: image.file,
    persistedImageId: image.persistedImageId,
    category: slot.category,
    roomIndex: slot.roomIndex,
    caption: image.caption.trim(),
    position,
    isCover: position === 0,
    width: image.width,
    height: image.height,
  }));
}

/** New files only; positions still account for saved photos in the gallery. */
export function buildUploadPlan(
  images: StagedImage[],
  slots: Slot[],
): UploadPlanItem[] {
  return buildImagePlan(images, slots).flatMap((image) =>
    image.file ? [{ ...image, file: image.file }] : [],
  );
}