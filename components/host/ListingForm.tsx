// components/host/ListingForm.tsx
"use client";

import { useState } from "react";
import type { ListingFormValues } from "@/app/lib/host/types";

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
  price_per_night: 0,
  max_guests: 1,
  bedrooms: 1,
  bathrooms: 1,
  amenities: [],
  features: [],
  house_rules: [],
  check_in_time: "2:00 PM",
  check_out_time: "11:00 AM",
  min_nights: 1,
  instant_book: true,
  cancellation_policy: "",
};

export default function ListingForm({
  initialValues,
  onSubmit,
  submitLabel = "Save",
}: {
  initialValues?: Partial<ListingFormValues>;
  onSubmit: (values: ListingFormValues) => Promise<void>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<ListingFormValues>({ ...DEFAULTS, ...initialValues });
  const [houseRuleInput, setHouseRuleInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleAmenity(a: string) {
    set("amenities", values.amenities.includes(a) ? values.amenities.filter((x) => x !== a) : [...values.amenities, a]);
  }

  function addHouseRule() {
    if (!houseRuleInput.trim()) return;
    set("house_rules", [...values.house_rules, houseRuleInput.trim()]);
    setHouseRuleInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.title || !values.county || !values.town || values.price_per_night <= 0) {
      setError("Title, county, town, and a price above 0 are required.");
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
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#ec1561] focus:outline-none focus:ring-1 focus:ring-[#ec1561]";
  const labelClass = "mb-1 block text-sm font-medium text-[#12231d]";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* Basics */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-[#12231d]">Basics</h2>
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
      </section>

      {/* Capacity & pricing */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-[#12231d]">Capacity & pricing</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label className={labelClass}>Price / night (KES)</label>
            <input type="number" min={1} className={inputClass} value={values.price_per_night} onChange={(e) => set("price_per_night", Number(e.target.value))} />
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
                  className="text-[#12231d] hover:text-[#ec1561]"
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
              className="rounded-lg border border-[#12231d] px-4 text-sm font-medium text-[#12231d] transition duration-150 hover:bg-[#12231d] hover:text-white active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ec1561] focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            >
              Add
            </button>
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-[#12231d]">Amenities</h2>
        <div className="flex flex-wrap gap-2">
          {AMENITY_OPTIONS.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => toggleAmenity(a)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                values.amenities.includes(a) ? "border-[#ec1561] bg-[#ec1561]/10 text-[#ec1561]" : "border-gray-200 text-gray-600"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button type="submit" disabled={saving} className="rounded-lg bg-[#ec1561] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
