// components/host/ListingForm.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ListingAdditionalCharge, ListingFormValues } from "@/app/lib/host/types";

const ListingMapPicker = dynamic(
  () => import("@/components/admin/listings/ListingMapPicker").then((module) => module.ListingMapPicker),
  { ssr: false, loading: () => <div className="h-[340px] animate-pulse rounded-xl bg-gray-100" /> },
);

const AMENITY_OPTIONS = [
  "WiFi", "Kitchen", "Free parking", "Pool", "Air conditioning", "Washer",
  "TV", "Hot water", "Backup generator", "Security guard", "Balcony", "Gym",
];

const DEFAULTS: ListingFormValues = {
  title: "",
  description: "",
  county: "",
  town: "",
  address: "",
  latitude: null,
  longitude: null,
  property_type: "",
  price_per_night: 0,
  platform_fee_per_night: 0,
  additional_charges: [],
  max_guests: 1,
  bedrooms: 1,
  bathrooms: 1,
  amenities: [],
  features: [],
  house_rules: [],
  check_in_time: "2:00 PM",
  check_out_time: "11:00 AM",
  arrival_address: "",
  arrival_directions: "",
  check_in_instructions: "",
  wifi_name: "",
  wifi_password: "",
  arrival_contact: "",
  local_tips: "",
  min_nights: 1,
  instant_book: true,
  cancellation_policy: "",
};

export default function ListingForm({
  initialValues,
  onSubmit,
  submitLabel = "Save",
  requireMapPin = false,
}: {
  initialValues?: Partial<ListingFormValues>;
  onSubmit: (values: ListingFormValues) => Promise<void>;
  submitLabel?: string;
  requireMapPin?: boolean;
}) {
  const [values, setValues] = useState<ListingFormValues>({ ...DEFAULTS, ...initialValues });
  const [houseRuleInput, setHouseRuleInput] = useState("");
  const [customAmenityInput, setCustomAmenityInput] = useState("");
  const [chargeName, setChargeName] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeFrequency, setChargeFrequency] = useState<ListingAdditionalCharge["frequency"]>("per_booking");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleAmenity(a: string) {
    set("amenities", values.amenities.includes(a) ? values.amenities.filter((x) => x !== a) : [...values.amenities, a]);
  }

  function addCustomAmenity() {
    const amenity = customAmenityInput.trim();
    if (!amenity || amenity.length > 80) return;
    if (!values.amenities.some((existing) => existing.toLocaleLowerCase() === amenity.toLocaleLowerCase())) {
      set("amenities", [...values.amenities, amenity]);
    }
    setCustomAmenityInput("");
  }

  function addHouseRule() {
    if (!houseRuleInput.trim()) return;
    set("house_rules", [...values.house_rules, houseRuleInput.trim()]);
    setHouseRuleInput("");
  }

  function addAdditionalCharge() {
    const name = chargeName.trim();
    const amount = Number(chargeAmount);
    if (!name || name.length > 80 || !Number.isFinite(amount) || amount <= 0 || values.additional_charges.length >= 20) return;

    set("additional_charges", [...values.additional_charges, { name, amount, frequency: chargeFrequency }]);
    setChargeName("");
    setChargeAmount("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.title || !values.county || !values.town || !values.property_type.trim() || values.price_per_night <= 0 || values.platform_fee_per_night < 0) {
      setError("Title, property type, county, town, and a valid price and platform fee are required.");
      return;
    }
    const hasLatitude = values.latitude !== null && Number.isFinite(values.latitude);
    const hasLongitude = values.longitude !== null && Number.isFinite(values.longitude);
    if (hasLatitude !== hasLongitude || (requireMapPin && (!hasLatitude || !hasLongitude))) {
      setError("Pin the listing location on the map before saving.");
      return;
    }
    if (hasLatitude && hasLongitude && (Math.abs(values.latitude as number) > 90 || Math.abs(values.longitude as number) > 180)) {
      setError("Choose a valid map location.");
      return;
    }
    if (values.additional_charges.some((charge) => !charge.name.trim() || !Number.isFinite(charge.amount) || charge.amount <= 0 || !["per_night", "per_booking"].includes(charge.frequency))) {
      setError("Each additional charge needs a name, positive amount, and valid frequency.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong saving this listing.",
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#E23E85] focus:outline-none focus:ring-1 focus:ring-[#E23E85]";
  const labelClass = "mb-1 block text-sm font-medium text-[#12231d]";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* Basics */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-[#12231d]">Basics</h2>
        <div>
          <label className={labelClass}>Property type</label>
          <input maxLength={80} required className={inputClass} value={values.property_type} onChange={(e) => set("property_type", e.target.value)} placeholder="e.g. apartment, townhouse, villa" />
        </div>
        <div>
          <label className={labelClass}>Listing title</label>
          <input className={inputClass} value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. South B Apartment" />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className={inputClass}
            rows={5}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe the space, the neighbourhood, and what makes it special…"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>County</label>
            <input className={inputClass} value={values.county} onChange={(e) => set("county", e.target.value)} placeholder="Nairobi" />
          </div>
          <div>
            <label className={labelClass}>Town / area</label>
            <input className={inputClass} value={values.town} onChange={(e) => set("town", e.target.value)} placeholder="South B" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Address (optional, not shown publicly)</label>
          <input className={inputClass} value={values.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="space-y-2 border-t border-gray-100 pt-4">
          <div>
            <h3 className="text-sm font-semibold text-[#12231d]">Property location pin</h3>
            <p className="mt-1 text-xs leading-5 text-gray-500">Click the map or drag the pin to the exact entrance. The exact pin is shared with confirmed guests in their private arrival guide; public listing maps remain approximate.</p>
          </div>
          <ListingMapPicker
            latitude={values.latitude}
            longitude={values.longitude}
            onChange={(latitude, longitude) => setValues((current) => ({ ...current, latitude, longitude }))}
          />
          {values.latitude !== null && values.longitude !== null ? (
            <p className="text-xs text-gray-600">Pinned coordinates: {values.latitude.toFixed(6)}, {values.longitude.toFixed(6)}</p>
          ) : (
            <p className={`text-xs ${requireMapPin ? "font-medium text-amber-800" : "text-gray-500"}`}>
              {requireMapPin ? "A map pin is required for new listings." : "No precise map pin saved yet."}
            </p>
          )}
        </div>
      </section>

      {/* Capacity & pricing */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-[#12231d]">Capacity & pricing</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div>
            <label className={labelClass}>Price / night (KES)</label>
            <input type="number" min={1} className={inputClass} value={values.price_per_night} onChange={(e) => set("price_per_night", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Platform fee / night (KES)</label>
            <input type="number" min={0} step="0.01" className={inputClass} value={values.platform_fee_per_night} onChange={(e) => set("platform_fee_per_night", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Max guests</label>
            <input type="number" min={1} className={inputClass} value={values.max_guests} onChange={(e) => set("max_guests", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Bedrooms</label>
            <input type="number" min={0} className={inputClass} value={values.bedrooms} onChange={(e) => set("bedrooms", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Bathrooms</label>
            <input type="number" min={0} className={inputClass} value={values.bathrooms} onChange={(e) => set("bathrooms", Number(e.target.value))} />
          </div>
        </div>
        <div className="text-sm text-gray-600">
          <p>
            Guest nightly price before one-time charges: <strong className="text-[#12231d]">KES {(Number(values.price_per_night || 0) + Number(values.platform_fee_per_night || 0) + values.additional_charges.filter((charge) => charge.frequency === "per_night").reduce((sum, charge) => sum + charge.amount, 0)).toLocaleString("en-KE")}</strong>
            <span className="ml-1">(host rate, platform fee, and per-night charges)</span>
          </p>
          {values.additional_charges.some((charge) => charge.frequency === "per_booking") && (
            <p className="mt-1 text-xs">
              Plus KES {values.additional_charges.filter((charge) => charge.frequency === "per_booking").reduce((sum, charge) => sum + charge.amount, 0).toLocaleString("en-KE")} in per-booking charges.
            </p>
          )}
        </div>
        <div className="border-t border-gray-100 pt-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-[#12231d]">Additional guest charges</h3>
            <p className="mt-1 text-xs text-gray-500">These charges are paid to the host. Choose whether each is charged once or for every night.</p>
          </div>
          {values.additional_charges.length > 0 && (
            <ul className="mb-3 divide-y divide-gray-100 rounded-md border border-gray-100">
              {values.additional_charges.map((charge, index) => (
                <li key={`${charge.name}-${charge.frequency}-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="font-medium text-[#12231d]">{charge.name}</span>
                  <span className="ml-auto text-gray-600">
                    KES {charge.amount.toLocaleString("en-KE")} {charge.frequency === "per_night" ? "/ night" : "/ booking"}
                  </span>
                  <button type="button" onClick={() => set("additional_charges", values.additional_charges.filter((_, chargeIndex) => chargeIndex !== index))} className="text-xs font-medium text-red-600 hover:underline">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_auto]">
            <label className="sr-only" htmlFor="additional-charge-name">Charge name</label>
            <input id="additional-charge-name" maxLength={80} className={inputClass} value={chargeName} onChange={(event) => setChargeName(event.target.value)} placeholder="e.g. Cleaning fee" />
            <label className="sr-only" htmlFor="additional-charge-amount">Charge amount in KES</label>
            <input id="additional-charge-amount" type="number" min="0.01" step="0.01" className={inputClass} value={chargeAmount} onChange={(event) => setChargeAmount(event.target.value)} placeholder="Amount (KES)" />
            <label className="sr-only" htmlFor="additional-charge-frequency">Charge frequency</label>
            <select id="additional-charge-frequency" className={inputClass} value={chargeFrequency} onChange={(event) => setChargeFrequency(event.target.value as ListingAdditionalCharge["frequency"])}>
              <option value="per_booking">Per booking</option>
              <option value="per_night">Per night</option>
            </select>
            <button type="button" onClick={addAdditionalCharge} disabled={!chargeName.trim() || chargeName.trim().length > 80 || !Number.isFinite(Number(chargeAmount)) || Number(chargeAmount) <= 0 || values.additional_charges.length >= 20} className="rounded-lg border border-[#12231d] px-4 py-2 text-sm font-medium text-[#12231d] hover:bg-[#12231d] hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent disabled:hover:text-gray-400">
              Add charge
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Minimum nights</label>
            <input type="number" min={1} className={inputClass} value={values.min_nights} onChange={(e) => set("min_nights", Number(e.target.value))} />
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm text-[#12231d]">
            <input type="checkbox" checked={values.instant_book} onChange={(e) => set("instant_book", e.target.checked)} />
            Allow instant booking (skip approval)
          </label>
        </div>
      </section>

      {/* Check-in/out & policy */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-[#12231d]">Stay details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Check-in time</label>
            <input className={inputClass} value={values.check_in_time} onChange={(e) => set("check_in_time", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Check-out time</label>
            <input className={inputClass} value={values.check_out_time} onChange={(e) => set("check_out_time", e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Cancellation policy</label>
          <textarea className={inputClass} rows={3} value={values.cancellation_policy} onChange={(e) => set("cancellation_policy", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>House rules</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {values.house_rules.map((r, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-[#12231d]">
                {r}
                <button
                  type="button"
                  onClick={() => set("house_rules", values.house_rules.filter((_, idx) => idx !== i))}
                  className="text-[#12231d] hover:text-[#E23E85]"
                  aria-label={`Remove house rule: ${r}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={houseRuleInput}
              onChange={(e) => setHouseRuleInput(e.target.value)}
              placeholder="e.g. No smoking indoors"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHouseRule())}
            />
            <button
              type="button"
              onClick={addHouseRule}
              disabled={!houseRuleInput.trim()}
              className="rounded-lg border border-[#12231d] px-4 text-sm font-medium text-[#12231d] transition duration-150 hover:bg-[#12231d] hover:text-white active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#E23E85] focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            >
              Add
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-semibold text-[#12231d]">Arrival guide</h2>
          <p className="mt-1 text-sm text-gray-500">These private details are shown only to guests with a booking for this listing.</p>
        </div>
        <div>
          <label className={labelClass}>Exact arrival address <span className="font-normal text-gray-500">(overrides the listing address above)</span></label>
          <textarea maxLength={1000} className={inputClass} rows={2} value={values.arrival_address} onChange={(e) => set("arrival_address", e.target.value)} placeholder="Building name, street, gate or unit details" />
        </div>
        <div>
          <label className={labelClass}>Directions</label>
          <textarea maxLength={5000} className={inputClass} rows={4} value={values.arrival_directions} onChange={(e) => set("arrival_directions", e.target.value)} placeholder="Landmarks, entrance, parking, and the best route to the property" />
        </div>
        <div>
          <label className={labelClass}>Check-in steps</label>
          <textarea maxLength={5000} className={inputClass} rows={4} value={values.check_in_instructions} onChange={(e) => set("check_in_instructions", e.target.value)} placeholder="How to collect keys, access the building, and get inside" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Wi-Fi network</label>
            <input maxLength={120} className={inputClass} value={values.wifi_name} onChange={(e) => set("wifi_name", e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className={labelClass}>Wi-Fi password</label>
            <input maxLength={200} className={inputClass} value={values.wifi_password} onChange={(e) => set("wifi_password", e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Arrival contact</label>
          <textarea maxLength={500} className={inputClass} rows={2} value={values.arrival_contact} onChange={(e) => set("arrival_contact", e.target.value)} placeholder="Name and phone number for arrival-day help" />
        </div>
        <div>
          <label className={labelClass}>Local tips</label>
          <textarea maxLength={5000} className={inputClass} rows={4} value={values.local_tips} onChange={(e) => set("local_tips", e.target.value)} placeholder="Nearby shops, food, transport, or useful local advice" />
        </div>
      </section>

      {/* Amenities */}
      <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-[#12231d]">Amenities</h2>
        <div className="flex flex-wrap gap-2">
          {[...new Set([...AMENITY_OPTIONS, ...values.amenities])].map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => toggleAmenity(a)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                values.amenities.includes(a) ? "border-[#E23E85] bg-[#E23E85]/10 text-[#9C2454]" : "border-gray-200 text-gray-600"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="custom-amenity" className="sr-only">Add a custom amenity</label>
          <input
            id="custom-amenity"
            maxLength={80}
            className={inputClass}
            value={customAmenityInput}
            onChange={(event) => setCustomAmenityInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustomAmenity();
              }
            }}
            placeholder="Add another amenity"
          />
          <button
            type="button"
            onClick={addCustomAmenity}
            disabled={!customAmenityInput.trim() || customAmenityInput.trim().length > 80}
            className="shrink-0 rounded-lg border border-[#12231d] px-4 py-2 text-sm font-medium text-[#12231d] hover:bg-[#12231d] hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent disabled:hover:text-gray-400"
          >
            Add amenity
          </button>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button type="submit" disabled={saving} className="rounded-lg bg-[#E23E85] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
