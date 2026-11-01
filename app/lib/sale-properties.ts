import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import {
  getSalePropertyMapCoordinates,
  passesSaleRecommendationFilters,
  scoreSalePropertyRecommendation,
  type SaleRecommendationCandidate,
  type SaleRecommendationPreferences,
} from "@/app/lib/sale-marketplace";

export type SalePropertyImage = {
  id: string;
  url: string;
  position: number;
  sort_order: number;
  is_cover: boolean;
  room_tag: "living_room" | "kitchen" | "bedroom" | "bathroom" | "exterior" | "floor_plan" | "other";
  alt_text: string;
  width: number;
  height: number;
};

export type PublicSaleProperty = {
  id: string;
  slug: string;
  title: string;
  description: string;
  property_type: string;
  asking_price: number | string;
  county: string;
  town: string;
  neighborhood: string | null;
  location_id: string | null;
  lat: number | null;
  lng: number | null;
  map_lat?: number | null;
  map_lng?: number | null;
  show_exact_location: boolean;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number | string | null;
  parking_spaces: number;
  title_type: string | null;
  title_deed_status: string | null;
  service_charge: number | string | null;
  service_charge_period: "monthly" | "annual";
  land_rates: number | string | null;
  land_rates_period: "monthly" | "annual";
  furnished_status: string | null;
  occupancy: string | null;
  completion_status: string | null;
  year_built: number | null;
  floor_level: number | null;
  plot_size_acres: number | string | null;
  zoning: string | null;
  road_access: string | null;
  is_verified: boolean;
  amenities: string[];
  sale_property_images: SalePropertyImage[];
};

export type PublicSalePage = {
  properties: PublicSaleProperty[];
  hasNextPage: boolean;
  page: number;
};

const PAGE_SIZE = 12;
const ROOM_TAGS = ["living_room", "kitchen", "bedroom", "bathroom", "exterior", "floor_plan", "other"] as const;

function isRoomTag(value: string): value is (typeof ROOM_TAGS)[number] {
  return ROOM_TAGS.some((tag) => tag === value);
}

function escapeSearchTerm(value: string) {
  return value.trim().slice(0, 100).replace(/[%,()]/g, "");
}

function withImageUrls<T extends {
  lat?: number | null;
  lng?: number | null;
  show_exact_location?: boolean;
  sale_property_images?: Array<{
    id: string;
    storage_path: string;
    position: number;
    sort_order: number;
    is_cover: boolean;
    room_tag: string;
    alt_text: string;
    width: number;
    height: number;
  }> | null;
}>(row: T): Omit<T, "sale_property_images"> & {
  sale_property_images: SalePropertyImage[];
} {
  const storage = getSupabaseAdmin().storage.from("sale-property-images");
  const { sale_property_images: storedImages, ...property } = row;
  const images = [...(storedImages ?? [])]
    .sort((first, second) => first.sort_order - second.sort_order)
    .map(({ storage_path, ...image }) => ({
      ...image,
      room_tag: isRoomTag(image.room_tag) ? image.room_tag : "other",
      url: storage.getPublicUrl(storage_path).data.publicUrl,
    }));
  return {
    ...property,
    lat: property.show_exact_location ? property.lat ?? null : null,
    lng: property.show_exact_location ? property.lng ?? null : null,
    sale_property_images: images,
  };
}

async function fetchPublicSalePage(
  location: string,
  propertyType: string,
  minPrice: number | null,
  maxPrice: number | null,
  minBedrooms: number | null,
  minBathrooms: number | null,
  furnishedStatus: string,
  verifiedOnly: boolean,
  page: number,
): Promise<PublicSalePage> {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("sale_properties")
    .select(
      `id, slug, title, description, property_type, asking_price, county,
       town, neighborhood, location_id, lat, lng, show_exact_location,
       bedrooms, bathrooms, size_sqm, parking_spaces, title_type, title_deed_status,
       service_charge, service_charge_period, land_rates, land_rates_period, furnished_status, occupancy, completion_status,
       year_built, floor_level, plot_size_acres, zoning, road_access, is_verified,
       amenities, sale_property_images (
         id, storage_path, position, sort_order, is_cover, room_tag, alt_text, width, height
       )`,
    )
    .eq("status", "published");

  const term = escapeSearchTerm(location);
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(
      `title.ilike.${pattern},county.ilike.${pattern},town.ilike.${pattern},neighborhood.ilike.${pattern}`,
    );
  }
  if (propertyType) query = query.eq("property_type", propertyType);
  if (minPrice !== null) query = query.gte("asking_price", minPrice);
  if (maxPrice !== null) query = query.lte("asking_price", maxPrice);
  if (minBedrooms !== null) query = query.gte("bedrooms", minBedrooms);
  if (minBathrooms !== null) query = query.gte("bathrooms", minBathrooms);
  if (furnishedStatus) query = query.eq("furnished_status", furnishedStatus);
  if (verifiedOnly) query = query.eq("is_verified", true);

  const from = (page - 1) * PAGE_SIZE;
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .order("sort_order", { referencedTable: "sale_property_images", ascending: true })
    .range(from, from + PAGE_SIZE);

  if (error) {
    console.error("Public sale property query failed:", error);
    throw new Error("Unable to load properties for sale.");
  }

  const rows = data ?? [];
  const locationIds = [...new Set(rows.flatMap((row) =>
    typeof row.location_id === "string" ? [row.location_id] : [],
  ))];
  const locationCoordinates = new Map<string, { lat: number | null; lng: number | null }>();
  if (locationIds.length) {
    const { data: locations, error: locationsError } = await admin
      .from("locations")
      .select("id, level, lat, lng")
      .eq("level", "neighborhood")
      .in("id", locationIds);
    if (locationsError) {
      console.error("Sale map location lookup failed:", locationsError);
      throw new Error("Unable to load property map locations.");
    }
    for (const location of locations ?? []) {
      locationCoordinates.set(location.id, { lat: location.lat, lng: location.lng });
    }
  }

  return {
    properties: rows.slice(0, PAGE_SIZE).map((row) => {
      const property = withImageUrls(row) as PublicSaleProperty;
      const neighborhood = row.location_id
        ? locationCoordinates.get(row.location_id)
        : null;
      const mapCoordinates = getSalePropertyMapCoordinates({
        showExactLocation: row.show_exact_location === true,
        propertyLat: row.lat,
        propertyLng: row.lng,
        neighborhoodLat: neighborhood?.lat ?? null,
        neighborhoodLng: neighborhood?.lng ?? null,
      });
      return {
        ...property,
        map_lat: mapCoordinates.lat,
        map_lng: mapCoordinates.lng,
      };
    }),
    hasNextPage: rows.length > PAGE_SIZE,
    page,
  };
}

export const getCachedPublicSalePage = unstable_cache(
  fetchPublicSalePage,
  ["public-sale-properties-v2"],
  { revalidate: 60, tags: ["public-sale-properties"] },
);

async function fetchPublicSaleProperty(slug: string): Promise<PublicSaleProperty | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("sale_properties")
    .select(
      `id, slug, title, description, property_type, asking_price, county,
       town, neighborhood, location_id, lat, lng, show_exact_location,
       bedrooms, bathrooms, size_sqm, parking_spaces, title_type, title_deed_status,
       service_charge, service_charge_period, land_rates, land_rates_period, furnished_status, occupancy, completion_status,
       year_built, floor_level, plot_size_acres, zoning, road_access, is_verified,
       amenities, sale_property_images (
         id, storage_path, position, sort_order, is_cover, room_tag, alt_text, width, height
       )`,
    )
    .eq("status", "published")
    .eq("slug", slug)
    .order("sort_order", { referencedTable: "sale_property_images", ascending: true })
    .maybeSingle();

  if (error) {
    console.error("Public sale property detail query failed:", error);
    throw new Error("Unable to load this property.");
  }
  return data ? (withImageUrls(data) as PublicSaleProperty) : null;
}

export const getCachedPublicSaleProperty = unstable_cache(
  fetchPublicSaleProperty,
  ["public-sale-property-detail-v1"],
  { revalidate: 60, tags: ["public-sale-properties"] },
);

export async function getPublicSalePropertiesByIds(ids: string[]): Promise<PublicSaleProperty[]> {
  const propertyIds = [...new Set(ids)].slice(0, 20);
  if (!propertyIds.length) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("sale_properties")
    .select(
      `id, slug, title, description, property_type, asking_price, county,
       town, neighborhood, location_id, lat, lng, show_exact_location,
       bedrooms, bathrooms, size_sqm, parking_spaces, title_type, title_deed_status,
       service_charge, service_charge_period, land_rates, land_rates_period, furnished_status, occupancy, completion_status,
       year_built, floor_level, plot_size_acres, zoning, road_access, is_verified,
       amenities, sale_property_images (
         id, storage_path, position, sort_order, is_cover, room_tag, alt_text, width, height
       )`,
    )
    .eq("status", "published")
    .in("id", propertyIds)
    .order("sort_order", { referencedTable: "sale_property_images", ascending: true });

  if (error) {
    console.error("Sale shortlist property lookup failed:", error);
    throw new Error("Unable to load shortlisted properties.");
  }

  const byId = new Map(
    (data ?? []).map((row) => [row.id as string, withImageUrls(row) as PublicSaleProperty]),
  );
  return propertyIds.flatMap((id) => {
    const property = byId.get(id);
    return property ? [property] : [];
  });
}

export type SharedSaleShortlist = {
  updatedAt: string;
  properties: PublicSaleProperty[];
};

export async function getSharedSaleShortlist(token: string): Promise<SharedSaleShortlist | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("sale_shortlists")
    .select("id, share_token, updated_at, revoked_at, sale_shortlist_items(property_id, sort_order)")
    .eq("share_token", token)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    console.error("Shared sale shortlist lookup failed:", error);
    throw new Error("Unable to load this shortlist.");
  }
  if (!data) return null;

  const orderedIds = [...(data.sale_shortlist_items ?? [])]
    .sort((first, second) => first.sort_order - second.sort_order)
    .map((item) => item.property_id as string);
  return {
    updatedAt: data.updated_at,
    properties: await getPublicSalePropertiesByIds(orderedIds),
  };
}

export type SaleLocationOption = {
  id: string;
  name: string;
  slug: string;
  level: "county" | "town" | "neighborhood";
  parent_id: string | null;
  lat: number | null;
  lng: number | null;
};

export async function getSaleLocationOptions(): Promise<SaleLocationOption[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("locations")
    .select("id, name, slug, level, parent_id, lat, lng")
    .order("name", { ascending: true });
  if (error) {
    console.error("Sale location catalogue query failed:", error);
    throw new Error("Unable to load property locations.");
  }
  return (data ?? []) as SaleLocationOption[];
}

export async function getSaleRecommendationAffinityIds(
  propertyId: string,
  sessionId: string | null,
  userId: string | null,
) {
  if (!sessionId && !userId) return [];
  const admin = getSupabaseAdmin();
  let query = admin
    .from("property_events")
    .select("property_id, created_at")
    .neq("property_id", propertyId)
    .in("event_type", ["save", "inquiry", "viewing_request"])
    .gte("created_at", new Date(Date.now() - 90 * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(40);
  if (userId) query = query.eq("user_id", userId);
  else if (sessionId) query = query.eq("session_id", sessionId);
  const { data, error } = await query;
  if (error) {
    console.error("Sale recommendation affinity query failed:", error);
    throw new Error("Unable to load property recommendations.");
  }
  return [...new Set((data ?? []).map((row) => row.property_id as string))];
}

export async function getSimilarSaleProperties(
  current: PublicSaleProperty,
  affinityIds: string[] = [],
  limit = 4,
): Promise<PublicSaleProperty[]> {
  const admin = getSupabaseAdmin();
  const select = `id, slug, title, description, property_type, asking_price, county,
    town, neighborhood, location_id, lat, lng, show_exact_location,
    bedrooms, bathrooms, size_sqm, parking_spaces, title_type, title_deed_status,
    service_charge, service_charge_period, land_rates, land_rates_period, furnished_status, occupancy, completion_status,
    year_built, floor_level, plot_size_acres, zoning, road_access, is_verified,
    amenities, created_at, sale_property_images (
      id, storage_path, position, sort_order, is_cover, room_tag, alt_text, width, height
    )`;

  let nearbyLocationIds: string[] = [];
  let currentTownId: string | null = null;
  const townByNeighborhood = new Map<string, string>();
  if (current.location_id) {
    const { data: location, error: locationError } = await admin
      .from("locations")
      .select("id, level, parent_id")
      .eq("id", current.location_id)
      .maybeSingle();
    if (locationError) {
      console.error("Similar property location lookup failed:", locationError);
      throw new Error("Unable to load similar properties.");
    }
    currentTownId = location?.level === "neighborhood" ? location.parent_id : null;
    if (currentTownId) {
      const { data: neighborhoods, error: nearbyError } = await admin
        .from("locations")
        .select("id, parent_id")
        .eq("parent_id", currentTownId)
        .eq("level", "neighborhood");
      if (nearbyError) {
        console.error("Similar property neighborhood lookup failed:", nearbyError);
        throw new Error("Unable to load similar properties.");
      }
      nearbyLocationIds = (neighborhoods ?? []).map((row) => row.id);
      for (const neighborhood of neighborhoods ?? []) {
        if (neighborhood.parent_id) townByNeighborhood.set(neighborhood.id, neighborhood.parent_id);
      }
    }
  }

  const price = Number(current.asking_price);
  let query = admin
    .from("sale_properties")
    .select(select)
    .eq("status", "published")
    .eq("property_type", current.property_type)
    .neq("id", current.id)
    .gte("asking_price", price * 0.8)
    .lte("asking_price", price * 1.2)
    .order("created_at", { ascending: false })
    .limit(60);
  if (nearbyLocationIds.length) query = query.in("location_id", nearbyLocationIds);
  const { data: similarRows, error: similarError } = await query;
  if (similarError) {
    console.error("Similar sale property query failed:", similarError);
    throw new Error("Unable to load similar properties.");
  }

  let candidateRows = similarRows ?? [];
  let usedColdStartFallback = false;
  if (candidateRows.length === 0 && nearbyLocationIds.length) {
    const { data: fallbackRows, error: fallbackError } = await admin
      .from("sale_properties")
      .select(select)
      .eq("status", "published")
      .eq("property_type", current.property_type)
      .neq("id", current.id)
      .in("location_id", nearbyLocationIds)
      .order("is_verified", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60);
    if (fallbackError) {
      console.error("Sale property recommendation fallback query failed:", fallbackError);
      throw new Error("Unable to load similar properties.");
    }
    candidateRows = fallbackRows ?? [];
    usedColdStartFallback = candidateRows.length > 0;
  }
  if (candidateRows.length === 0) return [];

  const candidateIds = candidateRows.map((row) => row.id as string);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: events, error: eventsError } = await admin
    .from("property_events")
    .select("property_id, created_at")
    .in("property_id", candidateIds)
    .in("event_type", ["view", "save", "inquiry", "viewing_request"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (eventsError) {
    console.error("Sale property popularity query failed:", eventsError);
    throw new Error("Unable to load similar properties.");
  }

  let affinityRows: Array<{ id: string; property_type: string; asking_price: number | string; location_id: string | null }> = [];
  if (affinityIds.length) {
    const { data, error } = await admin
      .from("sale_properties")
      .select("id, property_type, asking_price, location_id")
      .eq("status", "published")
      .in("id", affinityIds.slice(0, 20));
    if (error) {
      console.error("Sale property affinity listings query failed:", error);
      throw new Error("Unable to load similar properties.");
    }
    affinityRows = data ?? [];
  }

  const eventStats = new Map<string, { count: number; latest: string }>();
  for (const event of events ?? []) {
    const previous = eventStats.get(event.property_id);
    eventStats.set(event.property_id, {
      count: (previous?.count ?? 0) + 1,
      latest: previous?.latest ?? event.created_at,
    });
  }
  const preferences: SaleRecommendationPreferences = {
    propertyType: current.property_type,
    minPrice: price * 0.8,
    maxPrice: price * 1.2,
    locationIds: nearbyLocationIds.length ? nearbyLocationIds : undefined,
    neighborhoodId: current.location_id,
    townId: currentTownId,
    mustHaves: current.amenities,
  };
  const scored = candidateRows
    .map((row) => {
      const images = row.sale_property_images ?? [];
      const stats = eventStats.get(row.id);
      const similarity = affinityRows.reduce((best, affinity) => {
        const affinityPrice = Number(affinity.asking_price);
        const priceSimilarity = Math.max(0, 1 - Math.abs(Number(row.asking_price) - affinityPrice) / Math.max(affinityPrice, 1));
        const locationSimilarity = affinity.location_id && row.location_id === affinity.location_id ? 1 : 0;
        const typeSimilarity = affinity.property_type === row.property_type ? 1 : 0;
        return Math.max(best, typeSimilarity * 0.4 + locationSimilarity * 0.4 + priceSimilarity * 0.2);
      }, 0);
      const candidate: SaleRecommendationCandidate = {
        id: row.id,
        propertyType: row.property_type,
        status: "published",
        price: Number(row.asking_price),
        neighborhoodId: row.location_id,
        townId: row.location_id ? townByNeighborhood.get(row.location_id) ?? null : null,
        amenities: row.amenities ?? [],
        isVerified: row.is_verified,
        photoCount: images.length,
        completeness: Math.min(
          1,
          (Number(Boolean(row.title)) +
            Number(Boolean(row.description)) +
            Number(Boolean(row.location_id)) +
            Number(images.length > 0) +
            Number(images.length >= 5) +
            Number(Boolean(row.size_sqm)) +
            Number(Boolean(row.amenities?.length))) / 7,
        ),
        createdAt: row.created_at,
        recentEventCount: stats?.count ?? 0,
        mostRecentEventAt: stats?.latest ?? null,
        similarity,
      };
      return {
        row,
        candidate,
        score: passesSaleRecommendationFilters(
          candidate,
          usedColdStartFallback
            ? { ...preferences, minPrice: null, maxPrice: null }
            : preferences,
        )
          ? scoreSalePropertyRecommendation(candidate, preferences)
          : Number.NEGATIVE_INFINITY,
      };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((first, second) => second.score - first.score)
    .slice(0, limit);
  return scored.map(({ row }) => withImageUrls(row) as PublicSaleProperty);
}

export { PAGE_SIZE as SALE_PROPERTY_PAGE_SIZE };
