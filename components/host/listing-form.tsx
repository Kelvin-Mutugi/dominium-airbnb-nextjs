// components/host/listing-form.tsx
"use client";

import { useTransition } from "react";

const KENYAN_COUNTIES = [
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
];

export function ListingForm({
  action,
  initialValues,
}: {
  action: (formData: FormData) => void;
  initialValues?: {
    title?: string;
    description?: string;
    county?: string;
    town?: string;
    address?: string;
    price_per_night?: number;
    max_guests?: number;
    bedrooms?: number;
    bathrooms?: number;
    amenities?: string[] | null;
  };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => action(formData))}
      className="space-y-4 max-w-xl"
    >
      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">Title</label>
        <input
          name="title"
          defaultValue={initialValues?.title}
          required
          className="w-full border border-gray-300 rounded p-2 text-sm text-gray-700"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">Description</label>
        <textarea
          name="description"
          defaultValue={initialValues?.description}
          required
          rows={4}
          className="w-full border border-gray-300 rounded p-2 text-sm text-gray-700"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700">County</label>
          <select
            name="county"
            defaultValue={initialValues?.county}
            required
            className="w-full border border-gray-300 rounded p-2 text-sm text-gray-700"
          >
            <option value="">Select county</option>
            {KENYAN_COUNTIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700">Town</label>
          <input
            name="town"
            defaultValue={initialValues?.town}
            required
            className="w-full border border-gray-300 rounded p-2 text-sm text-gray-700"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">
          Address (optional)
        </label>
        <input
          name="address"
          defaultValue={initialValues?.address}
          className="w-full border border-gray-300 rounded p-2 text-sm text-gray-700"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700">
            Price per night (KES)
          </label>
          <input
            type="number"
            name="price_per_night"
            defaultValue={initialValues?.price_per_night}
            required
            min={1}
            className="w-full border border-gray-300 rounded p-2 text-sm text-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700">Max guests</label>
          <input
            type="number"
            name="max_guests"
            defaultValue={initialValues?.max_guests}
            required
            min={1}
            className="w-full border border-gray-300 rounded p-2 text-sm text-gray-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700">Bedrooms</label>
          <input
            type="number"
            name="bedrooms"
            defaultValue={initialValues?.bedrooms}
            required
            min={0}
            className="w-full border border-gray-300 rounded p-2 text-sm text-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700">Bathrooms</label>
          <input
            type="number"
            name="bathrooms"
            defaultValue={initialValues?.bathrooms}
            required
            min={0}
            className="w-full border border-gray-300 rounded p-2 text-sm text-gray-700"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">
          Amenities
        </label>
        <textarea
          name="amenities"
          defaultValue={
            Array.isArray(initialValues?.amenities)
              ? initialValues.amenities.join(", ")
              : ""
          }
          rows={3}
          placeholder="Wi-Fi, AC, pool, parking, kitchen, workspace"
          className="w-full border border-gray-300 rounded p-2 text-sm text-gray-700"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50 hover:bg-blue-700"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}