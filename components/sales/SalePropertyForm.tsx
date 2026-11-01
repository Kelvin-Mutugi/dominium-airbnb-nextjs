"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  createSaleProperty,
  deleteSalePropertyImage,
  reorderSalePropertyImages,
  saveSaleProperty,
  updateSalePropertyImageDetails,
  type SalePropertyInput,
} from "@/app/admin/sales/actions";
import { prepareImage } from "@/components/admin/listings/prepare-image";
import { uploadSalePropertyImage } from "@/components/sales/upload-sale-property-image";
import type { SalePropertyImage } from "@/app/lib/sale-properties";

const PROPERTY_TYPES = [
  ["apartment", "Apartment"],
  ["unit", "Residential unit"],
  ["house", "House"],
  ["land", "Land"],
  ["commercial", "Commercial property"],
] as const;
const AMENITIES = [
  "Borehole",
  "Backup power",
  "Balcony",
  "Swimming pool",
  "Gym",
  "Lift",
  "CCTV",
  "Gated community",
  "Fibre internet",
  "Serviced",
  "Furnished",
  "Parking",
];
const MAX_IMAGES = 15;
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
const ROOM_TAGS = [
  ["living_room", "Living room"],
  ["kitchen", "Kitchen"],
  ["bedroom", "Bedroom"],
  ["bathroom", "Bathroom"],
  ["exterior", "Exterior"],
  ["floor_plan", "Floor plan"],
  ["other", "Other"],
] as const;

const ListingMapPicker = dynamic(
  () =>
    import("@/components/admin/listings/ListingMapPicker").then(
      (module) => module.ListingMapPicker,
    ),
  {
    ssr: false,
    loading: () => <div className="h-[300px] animate-pulse rounded-xl bg-gray-100" />,
  },
);

export type SalePropertyFormValues = Omit<SalePropertyInput, "status"> & {
  status?: string;
  is_verified?: boolean;
};

export type SaleLocationOption = {
  id: string;
  name: string;
  slug: string;
  level: "county" | "town" | "neighborhood";
  parent_id: string | null;
  lat: number | null;
  lng: number | null;
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function SalePropertyForm({
  propertyId,
  initialValues,
  images = [],
  locations = [],
}: {
  propertyId?: string;
  initialValues?: SalePropertyFormValues;
  images?: SalePropertyImage[];
  locations?: SaleLocationOption[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [activeId, setActiveId] = useState(propertyId ?? "");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageRows, setImageRows] = useState(images);
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const selectedLocation = locations.find((location) => location.id === initialValues?.location_id);
  const initialCounty =
    locations.find((location) => location.id === locations.find((row) => row.id === selectedLocation?.parent_id)?.parent_id) ??
    locations.find((location) => location.level === "county" && location.name.toLowerCase() === text(initialValues?.county).toLowerCase());
  const initialTown =
    locations.find((location) => location.id === selectedLocation?.parent_id) ??
    locations.find((location) => location.level === "town" && location.parent_id === initialCounty?.id && location.name.toLowerCase() === text(initialValues?.town).toLowerCase());
  const initialNeighborhood =
    selectedLocation ??
    locations.find((location) => location.level === "neighborhood" && location.parent_id === initialTown?.id && location.name.toLowerCase() === text(initialValues?.neighborhood).toLowerCase());
  const [countyId, setCountyId] = useState(initialCounty?.id ?? "");
  const [townId, setTownId] = useState(initialTown?.id ?? "");
  const [neighborhoodId, setNeighborhoodId] = useState(initialNeighborhood?.id ?? "");
  const [latitude, setLatitude] = useState<number | null>(
    initialValues?.lat == null ? null : Number(initialValues.lat),
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialValues?.lng == null ? null : Number(initialValues.lng),
  );
  const [propertyType, setPropertyType] = useState(text(initialValues?.property_type) || "apartment");
  const [completeness, setCompleteness] = useState(0);
  const isEditing = Boolean(propertyId);
  const countyOptions = locations.filter((location) => location.level === "county");
  const townOptions = locations.filter((location) => location.level === "town" && location.parent_id === countyId);
  const neighborhoodOptions = locations.filter((location) => location.level === "neighborhood" && location.parent_id === townId);
  const inputStyle =
    "mt-1 w-full rounded-lg border border-[#D9D5CF] bg-white px-3 py-2.5 text-sm text-[#1B1A2E] outline-none focus:border-[#9C2454] focus:ring-2 focus:ring-[#9C2454]/15";
  const labelStyle = "block text-sm font-medium text-[#383746]";

  const refreshCompleteness = useCallback((form: HTMLFormElement) => {
    const data = new FormData(form);
    const priceValue = String(data.get("asking_price") ?? "").trim();
    const photoCount = imageRows.length + selectedImages.length;
    const checks = [
      String(data.get("title") ?? "").trim().length >= 5,
      String(data.get("description") ?? "").trim().length >= 30,
      Number.isFinite(Number(priceValue)) && Number(priceValue) > 0,
      Boolean(data.get("location_id")),
      String(data.get("owner_name") ?? "").trim().length >= 2,
      Boolean(String(data.get("owner_email") ?? "").trim() || String(data.get("owner_phone") ?? "").trim()),
      photoCount > 0,
      Boolean(data.get("property_type")),
    ];
    setCompleteness(Math.round((checks.filter(Boolean).length / checks.length) * 100));
  }, [imageRows.length, selectedImages.length]);

  useEffect(() => {
    if (formRef.current) refreshCompleteness(formRef.current);
  }, [refreshCompleteness]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setUploadMessage("");
    const formData = new FormData(event.currentTarget);
    const optionalNumber = (name: string) => {
      const value = String(formData.get(name) ?? "").trim();
      return value || null;
    };
    const values: SalePropertyInput = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      property_type: String(formData.get("property_type") ?? ""),
      asking_price: String(formData.get("asking_price") ?? ""),
      county: String(formData.get("county") ?? ""),
      town: String(formData.get("town") ?? ""),
      neighborhood: String(formData.get("neighborhood") ?? ""),
      location_id: String(formData.get("location_id") ?? "") || null,
      lat: optionalNumber("lat"),
      lng: optionalNumber("lng"),
      show_exact_location: formData.get("show_exact_location") === "on",
      bedrooms: String(formData.get("bedrooms") ?? "0"),
      bathrooms: String(formData.get("bathrooms") ?? "0"),
      size_sqm: optionalNumber("size_sqm"),
      parking_spaces: String(formData.get("parking_spaces") ?? "0"),
      amenities: formData.getAll("amenities").map(String),
      owner_name: String(formData.get("owner_name") ?? ""),
      owner_email: String(formData.get("owner_email") ?? ""),
      owner_phone: String(formData.get("owner_phone") ?? ""),
      status: String(formData.get("status") ?? "draft"),
      title_type: String(formData.get("title_type") ?? ""),
      title_deed_status: String(formData.get("title_deed_status") ?? ""),
      service_charge: optionalNumber("service_charge"),
      service_charge_period: String(formData.get("service_charge_period") ?? "monthly"),
      land_rates: optionalNumber("land_rates"),
      land_rates_period: String(formData.get("land_rates_period") ?? "annual"),
      furnished_status: String(formData.get("furnished_status") ?? ""),
      occupancy: String(formData.get("occupancy") ?? ""),
      completion_status: String(formData.get("completion_status") ?? ""),
      year_built: optionalNumber("year_built"),
      floor_level: optionalNumber("floor_level"),
      plot_size_acres: optionalNumber("plot_size_acres"),
      zoning: String(formData.get("zoning") ?? ""),
      road_access: String(formData.get("road_access") ?? ""),
      price_negotiable: formData.get("price_negotiable") === "on",
      reason_for_selling: String(formData.get("reason_for_selling") ?? ""),
      mandate_type: String(formData.get("mandate_type") ?? ""),
      mandate_expiry: String(formData.get("mandate_expiry") ?? ""),
      commission_terms: String(formData.get("commission_terms") ?? ""),
      open_to_short_stay_management: formData.get("open_to_short_stay_management") === "on",
      sold_price: optionalNumber("sold_price"),
      owner_id_seen: formData.get("owner_id_seen") === "on",
      title_copy_seen: formData.get("title_copy_seen") === "on",
      site_visit_done: formData.get("site_visit_done") === "on",
    };
    const files = [...selectedImages];

    startTransition(async () => {
      try {
        if (files.length + imageRows.length > MAX_IMAGES) {
          throw new Error(`A property can have no more than ${MAX_IMAGES} photos.`);
        }
        const prepared: Array<{ file: File; width: number; height: number }> = [];
        for (const source of files) {
          if (!["image/jpeg", "image/png", "image/webp"].includes(source.type)) {
            throw new Error("Choose JPG, PNG, or WebP property photos.");
          }
          if (source.size > MAX_ORIGINAL_BYTES) {
            throw new Error("Each original photo must be smaller than 25 MB.");
          }
          const resized = await prepareImage(source);
          prepared.push({
            file: resized.file,
            width: resized.width,
            height: resized.height,
          });
        }

        let id = activeId;
        if (!id) {
          const created = await createSaleProperty(values);
          id = created.id;
          setActiveId(id);
        }

        for (let index = 0; index < prepared.length; index += 1) {
          const photo = prepared[index];
          setUploadMessage(`Uploading photo ${index + 1} of ${prepared.length}…`);
          await uploadSalePropertyImage(id, photo.file, photo.width, photo.height);
          setSelectedImages((current) => current.slice(1));
        }

        setUploadMessage("");
        await saveSaleProperty(id, values);
        router.push("/admin/sales");
        router.refresh();
      } catch (caught) {
        setUploadMessage("");
        setError(caught instanceof Error ? caught.message : "Unable to save the property listing.");
      }
    });
  }

  function removeImage(imageId: string) {
    setError("");
    startTransition(async () => {
      try {
        await deleteSalePropertyImage(imageId);
        setImageRows((current) => current.filter((image) => image.id !== imageId));
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to delete this photo.");
      }
    });
  }

  function moveImage(imageId: string, direction: -1 | 1) {
    if (!activeId) return;
    const ordered = [...imageRows].sort((first, second) => first.sort_order - second.sort_order);
    const index = ordered.findIndex((image) => image.id === imageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const next = ordered.map((image, sort_order) => ({ ...image, sort_order, position: sort_order }));
    setImageRows(next);
    startTransition(async () => {
      try {
        await reorderSalePropertyImages(activeId, next.map((image) => image.id));
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to reorder photos.");
        router.refresh();
      }
    });
  }

  function saveImageMetadata(
    image: SalePropertyImage,
    patch: Partial<Pick<SalePropertyImage, "room_tag" | "is_cover" | "alt_text">>,
  ) {
    const next = { ...image, ...patch };
    setImageRows((current) => current.map((item) => item.id === image.id ? next : { ...item, is_cover: patch.is_cover ? false : item.is_cover }));
    startTransition(async () => {
      try {
        await updateSalePropertyImageDetails({
          imageId: next.id,
          roomTag: next.room_tag,
          isCover: next.is_cover,
          altText: next.alt_text,
        });
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update photo details.");
        router.refresh();
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      onChange={(event) => refreshCompleteness(event.currentTarget)}
      className="mx-auto max-w-4xl space-y-6"
    >
      <header className="border-b border-[#D9D5CF] pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#9C2454]">
          Property sales · Admin only
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[#1B1A2E]">
          {isEditing ? "Edit sale listing" : "Add a property for sale"}
        </h1>
        <p className="mt-1 text-sm text-[#5F5D69]">
          Owner contact information is private and is used only by the admin team to manage buyer inquiries.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-[#E6E2DC] bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#1B1A2E]">Listing completeness</h2>
          <span className="text-sm font-semibold text-[#9C2454]">{completeness}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-[#EEEAE5]"
          role="progressbar"
          aria-label="Listing completeness"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completeness}
        >
          <div className="h-full rounded-full bg-[#9C2454] transition-all" style={{ width: `${completeness}%` }} />
        </div>
        <p className="text-xs text-[#6B6A78]">Complete the title, description, price, location, seller contact, and at least one photo.</p>
      </section>

      <section className="grid gap-4 rounded-xl border border-[#E6E2DC] bg-white p-4 sm:grid-cols-2 sm:p-6">
        <h2 className="sm:col-span-2 text-lg font-semibold text-[#1B1A2E]">Property details</h2>
        <label className={`${labelStyle} sm:col-span-2`}>
          Listing title
          <input name="title" required minLength={5} maxLength={140} defaultValue={text(initialValues?.title)} className={inputStyle} />
        </label>
        <label className={labelStyle}>
          Property type
          <select
            name="property_type"
            required
            value={propertyType}
            onChange={(event) => setPropertyType(event.currentTarget.value)}
            className={inputStyle}
          >
            {PROPERTY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className={labelStyle}>
          Asking price (KES)
          <input name="asking_price" type="number" min="1" step="1" required defaultValue={initialValues?.asking_price ?? ""} className={inputStyle} />
        </label>

        <input type="hidden" name="county" readOnly value={locations.find((location) => location.id === countyId)?.name ?? text(initialValues?.county)} />
        <input type="hidden" name="town" readOnly value={locations.find((location) => location.id === townId)?.name ?? text(initialValues?.town)} />
        <input type="hidden" name="neighborhood" readOnly value={locations.find((location) => location.id === neighborhoodId)?.name ?? text(initialValues?.neighborhood)} />
        <input type="hidden" name="location_id" readOnly value={neighborhoodId} />
        <label className={labelStyle}>
          County
          <select
            value={countyId}
            required
            onChange={(event) => {
              setCountyId(event.currentTarget.value);
              setTownId("");
              setNeighborhoodId("");
            }}
            className={inputStyle}
          >
            <option value="">Choose county</option>
            {countyOptions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>
        <label className={labelStyle}>
          Town / city
          <select
            value={townId}
            required
            disabled={!countyId}
            onChange={(event) => {
              setTownId(event.currentTarget.value);
              setNeighborhoodId("");
            }}
            className={inputStyle}
          >
            <option value="">Choose town</option>
            {townOptions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>
        <label className={labelStyle}>
          Neighborhood / estate
          <select
            value={neighborhoodId}
            disabled={!townId}
            onChange={(event) => setNeighborhoodId(event.currentTarget.value)}
            className={inputStyle}
          >
            <option value="">Choose neighborhood</option>
            {neighborhoodOptions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
          <span className="mt-1 block text-xs text-[#6B6A78]">Required to publish. A draft can be saved before choosing an estate.</span>
        </label>

        {propertyType !== "land" && propertyType !== "commercial" && (
          <div className="grid grid-cols-2 gap-3">
            <label className={labelStyle}>
              Bedrooms
              <input name="bedrooms" type="number" min="0" max="50" defaultValue={initialValues?.bedrooms ?? 0} className={inputStyle} />
            </label>
            <label className={labelStyle}>
              Bathrooms
              <input name="bathrooms" type="number" min="0" max="50" defaultValue={initialValues?.bathrooms ?? 0} className={inputStyle} />
            </label>
          </div>
        )}
        {propertyType !== "land" && (
          <div className="grid grid-cols-2 gap-3">
            <label className={labelStyle}>
              Floor area (m²)
              <input name="size_sqm" type="number" min="1" step="0.01" defaultValue={initialValues?.size_sqm ?? ""} className={inputStyle} />
            </label>
            <label className={labelStyle}>
              Parking spaces
              <input name="parking_spaces" type="number" min="0" max="50" defaultValue={initialValues?.parking_spaces ?? 0} className={inputStyle} />
            </label>
          </div>
        )}
        {propertyType === "land" && (
          <>
            <label className={labelStyle}>
              Plot size (acres)
              <input name="plot_size_acres" type="number" min="0.0001" step="0.0001" defaultValue={initialValues?.plot_size_acres ?? ""} className={inputStyle} />
            </label>
            <label className={labelStyle}>
              Zoning
              <input name="zoning" maxLength={120} defaultValue={text(initialValues?.zoning)} className={inputStyle} />
            </label>
            <label className={labelStyle}>
              Road access
              <input name="road_access" maxLength={120} defaultValue={text(initialValues?.road_access)} className={inputStyle} />
            </label>
          </>
        )}
        <fieldset className="sm:col-span-2">
          <legend className={labelStyle}>Features and amenities</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AMENITIES.map((amenity) => (
              <label key={amenity} className="flex items-center gap-2 text-sm text-[#4B4A5A]">
                <input
                  type="checkbox"
                  name="amenities"
                  value={amenity}
                  defaultChecked={initialValues?.amenities.includes(amenity) ?? false}
                  className="accent-[#9C2454]"
                />
                {amenity}
              </label>
            ))}
          </div>
        </fieldset>
        <label className={`${labelStyle} sm:col-span-2`}>
          Description
          <textarea name="description" rows={6} required minLength={30} maxLength={5000} defaultValue={text(initialValues?.description)} className={inputStyle} />
        </label>
        <div className="space-y-3 sm:col-span-2">
          <div>
            <h3 className="font-semibold text-[#1B1A2E]">Map pin (optional)</h3>
            <p className="mt-1 text-xs text-[#6B6A78]">Click or drag the pin to set coordinates. Exact coordinates stay private unless explicitly enabled below.</p>
          </div>
          <ListingMapPicker
            latitude={latitude}
            longitude={longitude}
            onChange={(nextLatitude, nextLongitude) => {
              setLatitude(nextLatitude);
              setLongitude(nextLongitude);
            }}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelStyle}>
              Latitude
              <input
                name="lat"
                type="number"
                min="-90"
                max="90"
                step="any"
                value={latitude ?? ""}
                onChange={(event) => setLatitude(event.currentTarget.value === "" ? null : Number(event.currentTarget.value))}
                className={inputStyle}
              />
            </label>
            <label className={labelStyle}>
              Longitude
              <input
                name="lng"
                type="number"
                min="-180"
                max="180"
                step="any"
                value={longitude ?? ""}
                onChange={(event) => setLongitude(event.currentTarget.value === "" ? null : Number(event.currentTarget.value))}
                className={inputStyle}
              />
            </label>
          </div>
          <label className="flex items-start gap-2 text-sm text-[#4B4A5A]">
            <input name="show_exact_location" type="checkbox" defaultChecked={initialValues?.show_exact_location ?? false} className="mt-1 accent-[#9C2454]" />
            Show this exact pin publicly. Leave unchecked to show neighborhood only.
          </label>
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border border-[#E6E2DC] bg-white p-4 sm:grid-cols-2 sm:p-6">
        <h2 className="sm:col-span-2 text-lg font-semibold text-[#1B1A2E]">Buyer decision details</h2>
        <label className={labelStyle}>
          Title type
          <select name="title_type" defaultValue={text(initialValues?.title_type)} className={inputStyle}>
            <option value="">Not specified</option>
            <option value="freehold">Freehold</option>
            <option value="leasehold">Leasehold</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className={labelStyle}>
          Title deed status
          <input name="title_deed_status" maxLength={120} defaultValue={text(initialValues?.title_deed_status)} placeholder="e.g. Available for verification" className={inputStyle} />
        </label>
        <label className={labelStyle}>
          Furnished status
          <select name="furnished_status" defaultValue={text(initialValues?.furnished_status)} className={inputStyle}>
            <option value="">Not specified</option>
            <option value="unfurnished">Unfurnished</option>
            <option value="semi">Semi-furnished</option>
            <option value="furnished">Furnished</option>
          </select>
        </label>
        <label className={labelStyle}>
          Occupancy
          <select name="occupancy" defaultValue={text(initialValues?.occupancy)} className={inputStyle}>
            <option value="">Not specified</option>
            <option value="vacant">Vacant</option>
            <option value="tenanted">Tenanted</option>
            <option value="owner_occupied">Owner occupied</option>
          </select>
        </label>
        <label className={labelStyle}>
          Completion status
          <select name="completion_status" defaultValue={text(initialValues?.completion_status)} className={inputStyle}>
            <option value="">Not specified</option>
            <option value="ready">Ready</option>
            <option value="off_plan">Off plan</option>
            <option value="under_construction">Under construction</option>
          </select>
        </label>
        <label className={labelStyle}>
          Year built
          <input name="year_built" type="number" min="1800" max="2200" step="1" defaultValue={initialValues?.year_built ?? ""} className={inputStyle} />
        </label>
        {propertyType !== "land" && (
          <label className={labelStyle}>
            Floor level
            <input name="floor_level" type="number" min="-5" max="200" step="1" defaultValue={initialValues?.floor_level ?? ""} className={inputStyle} />
          </label>
        )}
        {propertyType !== "land" && (
          <label className={labelStyle}>
            Service charge (KES)
            <input name="service_charge" type="number" min="0" step="0.01" defaultValue={initialValues?.service_charge ?? ""} className={inputStyle} />
            <select name="service_charge_period" aria-label="Service charge period" defaultValue={initialValues?.service_charge_period ?? "monthly"} className={inputStyle}>
              <option value="monthly">Per month</option>
              <option value="annual">Per year</option>
            </select>
          </label>
        )}
        {(propertyType === "land" || propertyType === "commercial") && (
          <label className={labelStyle}>
            Land rates (KES)
            <input name="land_rates" type="number" min="0" step="0.01" defaultValue={initialValues?.land_rates ?? ""} className={inputStyle} />
            <select name="land_rates_period" aria-label="Land rates period" defaultValue={initialValues?.land_rates_period ?? "annual"} className={inputStyle}>
              <option value="monthly">Per month</option>
              <option value="annual">Per year</option>
            </select>
          </label>
        )}
      </section>

      <section className="grid gap-4 rounded-xl border border-[#E6E2DC] bg-white p-4 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2">
          <h2 className="text-lg font-semibold text-[#1B1A2E]">Private seller details</h2>
          <p className="mt-1 text-xs text-[#6B6A78]">Visible only to admins; these terms are not shown on the public listing.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[#4B4A5A]">
          <input name="price_negotiable" type="checkbox" defaultChecked={initialValues?.price_negotiable ?? false} className="accent-[#9C2454]" />
          Price is negotiable
        </label>
        <label className={labelStyle}>
          Reason for selling
          <textarea name="reason_for_selling" rows={2} maxLength={1000} defaultValue={text(initialValues?.reason_for_selling)} className={inputStyle} />
        </label>
        <label className={labelStyle}>
          Mandate type
          <select name="mandate_type" defaultValue={text(initialValues?.mandate_type)} className={inputStyle}>
            <option value="">Not specified</option>
            <option value="exclusive">Exclusive</option>
            <option value="open">Open</option>
          </select>
        </label>
        <label className={labelStyle}>
          Mandate expiry
          <input name="mandate_expiry" type="date" defaultValue={text(initialValues?.mandate_expiry)} className={inputStyle} />
        </label>
        <label className={`${labelStyle} sm:col-span-2`}>
          Commission terms (private)
          <textarea name="commission_terms" rows={2} maxLength={1000} defaultValue={text(initialValues?.commission_terms)} className={inputStyle} />
        </label>
        <label className="flex items-center gap-2 text-sm text-[#4B4A5A] sm:col-span-2">
          <input name="open_to_short_stay_management" type="checkbox" defaultChecked={initialValues?.open_to_short_stay_management ?? false} className="accent-[#9C2454]" />
          Seller is open to short-stay management
        </label>
      </section>

      <section className="grid gap-3 rounded-xl border border-[#E6E2DC] bg-white p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1B1A2E]">Verification checklist</h2>
          <p className="mt-1 text-xs text-[#6B6A78]">A listing is marked verified only when all three checks are complete. Store source documents in the private verification bucket.</p>
        </div>
        {[
          ["owner_id_seen", "Owner ID seen", initialValues?.owner_id_seen],
          ["title_copy_seen", "Title copy seen", initialValues?.title_copy_seen],
          ["site_visit_done", "Site visit completed", initialValues?.site_visit_done],
        ].map(([name, label, checked]) => (
          <label key={String(name)} className="flex items-center gap-2 text-sm text-[#4B4A5A]">
            <input name={String(name)} type="checkbox" defaultChecked={checked === true} className="accent-[#9C2454]" />
            {String(label)}
          </label>
        ))}
        <p className="text-xs font-medium text-[#6B6A78]">Current verification: {initialValues?.is_verified ? "Verified" : "Not verified"}</p>
      </section>

      <section className="grid gap-4 rounded-xl border border-[#E6E2DC] bg-white p-4 sm:grid-cols-2 sm:p-6">
        <h2 className="sm:col-span-2 text-lg font-semibold text-[#1B1A2E]">Owner contact (private)</h2>
        <label className={labelStyle}>
          Owner / seller name
          <input name="owner_name" required minLength={2} maxLength={120} defaultValue={text(initialValues?.owner_name)} className={inputStyle} />
        </label>
        <label className={labelStyle}>
          Owner email
          <input name="owner_email" type="email" maxLength={254} defaultValue={text(initialValues?.owner_email)} className={inputStyle} />
        </label>
        <label className={labelStyle}>
          Owner phone
          <input name="owner_phone" type="tel" maxLength={40} defaultValue={text(initialValues?.owner_phone)} className={inputStyle} />
          <span className="mt-1 block text-xs text-[#6B6A78]">Enter a Kenyan number. At least one owner contact method is required.</span>
        </label>
      </section>

      <section className="space-y-4 rounded-xl border border-[#E6E2DC] bg-white p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1B1A2E]">Property photos</h2>
          <p className="mt-1 text-sm text-[#5F5D69]">
            Up to {MAX_IMAGES} photos. Images are resized in your browser and uploaded directly to storage.
          </p>
        </div>
        {imageRows.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...imageRows].sort((first, second) => first.sort_order - second.sort_order).map((image, index, ordered) => (
              <article key={image.id} className="overflow-hidden rounded-lg border border-[#E6E2DC] bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt_text || "Sale property"} loading="lazy" className="h-44 w-full object-cover" />
                <div className="space-y-3 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#6B6A78]">Photo {index + 1} of {ordered.length}</span>
                    <div className="flex gap-1">
                      <button type="button" aria-label="Move photo earlier" onClick={() => moveImage(image.id, -1)} disabled={isPending || index === 0} className="rounded border border-[#D9D5CF] px-2 py-1 text-xs disabled:opacity-40">↑</button>
                      <button type="button" aria-label="Move photo later" onClick={() => moveImage(image.id, 1)} disabled={isPending || index === ordered.length - 1} className="rounded border border-[#D9D5CF] px-2 py-1 text-xs disabled:opacity-40">↓</button>
                      <button type="button" onClick={() => removeImage(image.id)} disabled={isPending} className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 disabled:opacity-50">Remove</button>
                    </div>
                  </div>
                  <label className={labelStyle}>
                    Room tag
                    <select
                      value={image.room_tag}
                      disabled={isPending}
                      onChange={(event) => {
                        const tag = ROOM_TAGS.find(([value]) => value === event.currentTarget.value)?.[0] ?? "other";
                        const label = ROOM_TAGS.find(([value]) => value === tag)?.[1] ?? "Property";
                        const previousLabel = ROOM_TAGS.find(([value]) => value === image.room_tag)?.[1] ?? "Property";
                        const altText = image.alt_text.trim();
                        saveImageMetadata(image, {
                          room_tag: tag,
                          alt_text: !altText || altText === "Property photo" || altText === `${previousLabel} photo`
                            ? `${label} photo`
                            : image.alt_text,
                        });
                      }}
                      className={inputStyle}
                    >
                      {ROOM_TAGS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className={labelStyle}>
                    Alt text
                    <input
                      value={image.alt_text}
                      maxLength={160}
                      onChange={(event) => {
                        const altText = event.currentTarget.value;
                        setImageRows((current) => current.map((item) => item.id === image.id ? { ...item, alt_text: altText } : item));
                      }}
                      onBlur={(event) => saveImageMetadata(image, { alt_text: event.currentTarget.value })}
                      className={inputStyle}
                    />
                  </label>
                  <button
                    type="button"
                    aria-pressed={image.is_cover}
                    disabled={isPending || image.is_cover}
                    onClick={() => saveImageMetadata(image, { is_cover: true })}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${image.is_cover ? "bg-[#9C2454] text-white" : "border border-[#D9D5CF] text-[#4B4A5A]"}`}
                  >
                    {image.is_cover ? "Cover photo" : "Make cover"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        <label className={labelStyle}>
          Add photos
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => {
              const added = Array.from(event.currentTarget.files ?? []);
              if (added.length + selectedImages.length + imageRows.length > MAX_IMAGES) {
                setError(`A property can have no more than ${MAX_IMAGES} photos.`);
                event.currentTarget.value = "";
                return;
              }
              setError("");
              setSelectedImages((current) => [...current, ...added]);
              event.currentTarget.value = "";
            }}
            className={`${inputStyle} file:mr-3 file:rounded-md file:border-0 file:bg-[#F6EAF0] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#9C2454]`}
          />
        </label>
        {selectedImages.length > 0 && (
          <ul className="space-y-1 text-xs text-[#5F5D69]">
            {selectedImages.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`}>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</li>)}
          </ul>
        )}
      </section>

      {isEditing && (
        <section className="rounded-xl border border-[#E6E2DC] bg-white p-4 sm:p-6">
          <label className={labelStyle}>
            Listing status
            <select name="status" defaultValue={initialValues?.status ?? "draft"} className={inputStyle}>
              <option value="draft">Draft — not visible to buyers</option>
              <option value="published">Published — visible to buyers</option>
              <option value="sold">Sold — no longer visible</option>
              <option value="withdrawn">Withdrawn — no longer visible</option>
            </select>
          </label>
          <label className={`${labelStyle} mt-4`}>
            Sold price (KES, optional)
            <input name="sold_price" type="number" min="1" step="1" defaultValue={initialValues?.sold_price ?? ""} className={inputStyle} />
          </label>
        </section>
      )}
      {!isEditing && (
        <section className="rounded-xl border border-[#E6E2DC] bg-white p-4 sm:p-6">
          <label className={labelStyle}>
            After saving
            <select name="status" defaultValue="draft" className={inputStyle}>
              <option value="draft">Keep as draft</option>
              <option value="published">Publish after photos upload</option>
            </select>
          </label>
          <p className="mt-2 text-xs text-[#6B6A78]">
            New listings are always created as drafts; publishing is applied only after the final save and requires a photo, valid price, and neighborhood.
          </p>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
          {activeId && !propertyId && (
            <> Your draft is saved. <a href={`/admin/sales/${activeId}/edit`} className="font-semibold underline">Open the draft</a>.</>
          )}
        </p>
      )}
      {uploadMessage && <p role="status" className="text-sm text-[#9C2454]">{uploadMessage}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isPending} className="min-h-11 rounded-lg bg-[#9C2454] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7D1D43] disabled:cursor-not-allowed disabled:opacity-60">
          {isPending ? "Saving…" : isEditing ? "Save changes" : "Create draft and save"}
        </button>
        <button type="button" onClick={() => router.push("/admin/sales")} className="min-h-11 rounded-lg border border-[#D9D5CF] px-5 py-2.5 text-sm font-semibold text-[#4B4A5A]">
          Cancel
        </button>
      </div>
    </form>
  );
}
