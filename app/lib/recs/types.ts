export const REC_EVENT_TYPES = [
  "view",
  "long_dwell",
  "gallery_open",
  "save",
  "unsave",
  "share",
  "search",
  "filter_apply",
  "booking_start",
] as const;

export type RecEventType = (typeof REC_EVENT_TYPES)[number];
export type ListingRecEventType = Exclude<
  RecEventType,
  "search" | "filter_apply"
>;

export interface RecEventMetadata {
  surface?: "home" | "listing" | "search";
  hasDates?: boolean;
  guestCount?: number;
  activeFilterCount?: number;
}

export type TrackEventInput =
  | {
      listingId: string;
      eventType: ListingRecEventType;
      metadata?: RecEventMetadata;
    }
  | {
      listingId?: string;
      eventType: "search" | "filter_apply";
      metadata?: RecEventMetadata;
    };

export const NIGHTLY_PRICE_BANDS = ["budget", "mid", "premium"] as const;

export type NightlyPriceBand = (typeof NIGHTLY_PRICE_BANDS)[number];
export type PreferenceWeights = Record<string, number>;

export interface ListingFeatures {
  id: string;
  area: string | null;
  bedrooms: number | null;
  nightly_price_band: NightlyPriceBand;
  amenities: string[];
  property_type: string | null;
  created_at: string;
  is_active: boolean;
}

export interface SessionPreferenceProfile {
  areas: PreferenceWeights;
  bedrooms: PreferenceWeights;
  price_bands: Partial<Record<NightlyPriceBand, number>>;
  amenities: PreferenceWeights;
  property_types: PreferenceWeights;
  meaningful_event_count: number;
}
