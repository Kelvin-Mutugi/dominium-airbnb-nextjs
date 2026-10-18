"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { submitHostListingChangeRequest } from "@/app/lib/host/actions";
import type { ListingAdditionalCharge } from "@/app/lib/host/types";

type InitialValues = {
  title: string;
  description: string;
  county: string;
  town: string;
  address: string;
  property_type: string;
  categories: string[];
  price_per_night: number;
  additional_charges: ListingAdditionalCharge[];
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  features: string[];
  house_rules: string[];
  check_in_time: string;
  check_out_time: string;
  min_nights: number;
  instant_book: boolean;
};

function Field({
  id,
  label,
  children,
  optional = false,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-[#12231d]">
        {label}
        {optional && <span className="font-normal text-gray-500"> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#12231d]/20 bg-white px-3 py-2.5 text-sm text-[#12231d] focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20";

export function HostListingChangeForm({
  listingId,
  expectedUpdatedAt,
  initialValues,
  categories,
}: {
  listingId: string;
  expectedUpdatedAt: string;
  initialValues: InitialValues;
  categories: readonly { id: string; label: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [amenities, setAmenities] = useState(initialValues.amenities);
  const [amenityInput, setAmenityInput] = useState("");
  const [houseRules, setHouseRules] = useState(initialValues.house_rules);
  const [houseRuleInput, setHouseRuleInput] = useState("");
  const [additionalCharges, setAdditionalCharges] = useState(
    initialValues.additional_charges,
  );
  const [chargeName, setChargeName] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeFrequency, setChargeFrequency] =
    useState<ListingAdditionalCharge["frequency"]>("per_booking");
  const [chargeRequired, setChargeRequired] = useState(true);

  function addHouseRule() {
    const rule = houseRuleInput.trim();
    if (
      !rule ||
      rule.length > 500 ||
      houseRules.length >= 50 ||
      houseRules.some(
        (existing) => existing.toLocaleLowerCase() === rule.toLocaleLowerCase(),
      )
    ) {
      return;
    }
    setHouseRules([...houseRules, rule]);
    setHouseRuleInput("");
  }

  function addAmenity() {
    const amenity = amenityInput.trim();
    if (
      !amenity ||
      amenity.length > 80 ||
      amenities.length >= 50 ||
      amenities.some(
        (existing) =>
          existing.toLocaleLowerCase() === amenity.toLocaleLowerCase(),
      )
    ) {
      return;
    }
    setAmenities([...amenities, amenity]);
    setAmenityInput("");
  }

  function addAdditionalCharge() {
    const name = chargeName.trim();
    const amount = Number(chargeAmount);
    if (
      !name ||
      name.length > 80 ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      additionalCharges.length >= 20 ||
      additionalCharges.some(
        (charge) =>
          charge.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      return;
    }
    setAdditionalCharges([
      ...additionalCharges,
      { name, amount, frequency: chargeFrequency, required: chargeRequired },
    ]);
    setChargeName("");
    setChargeAmount("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      try {
        await submitHostListingChangeRequest(listingId, formData);
        setSuccess(true);
        router.refresh();
      } catch (submitError) {
        setSuccess(false);
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to apply listing changes.",
        );
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-[#E9E6DD] bg-white p-4 sm:p-6">
      <input type="hidden" name="expected_updated_at" value={expectedUpdatedAt} />
      <input
        type="hidden"
        name="additional_charges"
        value={JSON.stringify(additionalCharges)}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="title" label="Listing title">
          <input id="title" name="title" required minLength={3} maxLength={120} defaultValue={initialValues.title} className={inputClass} />
        </Field>
        <Field id="property_type" label="Property type">
          <input id="property_type" name="property_type" required maxLength={80} defaultValue={initialValues.property_type} className={inputClass} />
        </Field>
        <Field id="county" label="County">
          <input id="county" name="county" required minLength={2} maxLength={80} defaultValue={initialValues.county} className={inputClass} />
        </Field>
        <Field id="town" label="Town">
          <input id="town" name="town" required minLength={2} maxLength={100} defaultValue={initialValues.town} className={inputClass} />
        </Field>
        <Field id="address" label="Street address" optional>
          <input id="address" name="address" maxLength={500} defaultValue={initialValues.address} className={inputClass} />
        </Field>
        <Field id="price_per_night" label="Nightly price (KES)">
          <input id="price_per_night" name="price_per_night" type="number" required min="1" step="0.01" defaultValue={initialValues.price_per_night} className={inputClass} />
        </Field>
        <Field id="max_guests" label="Maximum guests">
          <input id="max_guests" name="max_guests" type="number" required min="1" step="1" defaultValue={initialValues.max_guests} className={inputClass} />
        </Field>
        <Field id="bedrooms" label="Bedrooms">
          <input id="bedrooms" name="bedrooms" type="number" required min="0" step="1" defaultValue={initialValues.bedrooms} className={inputClass} />
        </Field>
        <Field id="bathrooms" label="Bathrooms">
          <input id="bathrooms" name="bathrooms" type="number" required min="0" step="0.5" defaultValue={initialValues.bathrooms} className={inputClass} />
        </Field>
        <Field id="min_nights" label="Minimum nights">
          <input id="min_nights" name="min_nights" type="number" required min="1" step="1" defaultValue={initialValues.min_nights} className={inputClass} />
        </Field>
        <Field id="check_in_time" label="Check-in time">
          <input id="check_in_time" name="check_in_time" required maxLength={50} defaultValue={initialValues.check_in_time} className={inputClass} />
        </Field>
        <Field id="check_out_time" label="Check-out time">
          <input id="check_out_time" name="check_out_time" required maxLength={50} defaultValue={initialValues.check_out_time} className={inputClass} />
        </Field>
      </div>

      <Field id="description" label="Description">
        <textarea id="description" name="description" maxLength={5000} rows={5} defaultValue={initialValues.description} className={inputClass} />
      </Field>

      <Field id="categories" label="Property categories" optional>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#12231d]/15 p-3 sm:grid-cols-3">
          {categories.map((category) => (
            <label key={category.id} className="flex min-h-10 items-center gap-2 text-sm text-[#12231d]">
              <input
                type="checkbox"
                name="categories"
                value={category.id}
                defaultChecked={initialValues.categories.includes(category.id)}
                className="h-4 w-4 accent-[#E23E85]"
              />
              {category.label}
            </label>
          ))}
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="amenity-input" label="Amenities" optional>
          <div className="space-y-3">
            <ul className="flex flex-wrap gap-2">
              {amenities.map((amenity, index) => (
                <li
                  key={`${amenity}-${index}`}
                  className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-[#12231d]"
                >
                  <input type="hidden" name="amenities" value={amenity} />
                  {amenity}
                  <button
                    type="button"
                    onClick={() =>
                      setAmenities(amenities.filter((_, item) => item !== index))
                    }
                    className="text-[#12231d] hover:text-[#E23E85]"
                    aria-label={`Remove amenity: ${amenity}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                id="amenity-input"
                maxLength={80}
                value={amenityInput}
                onChange={(event) => setAmenityInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addAmenity();
                  }
                }}
                placeholder="Add an amenity"
                className={inputClass}
              />
              <button
                type="button"
                onClick={addAmenity}
                disabled={
                  !amenityInput.trim() ||
                  amenityInput.trim().length > 80 ||
                  amenities.length >= 50 ||
                  amenities.some(
                    (amenity) =>
                      amenity.toLocaleLowerCase() ===
                      amenityInput.trim().toLocaleLowerCase(),
                  )
                }
                className="shrink-0 rounded-lg border border-[#12231d] px-4 py-2 text-sm font-medium text-[#12231d] hover:bg-[#12231d] hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent disabled:hover:text-gray-400"
              >
                Add amenity
              </button>
            </div>
          </div>
        </Field>
        <Field id="features" label="Features" optional>
          <textarea id="features" name="features" rows={4} defaultValue={initialValues.features.join("\n")} placeholder="One per line" className={inputClass} />
        </Field>
      </div>

      <Field id="additional-charges" label="Additional guest charges" optional>
        <p className="mb-3 text-xs text-gray-500">
          These host charges are separate from platform fees.
        </p>
        <div id="additional-charges">
          {additionalCharges.length > 0 && (
            <ul className="mb-3 divide-y divide-gray-100 rounded-md border border-gray-100">
              {additionalCharges.map((charge, index) => (
                <li
                  key={`${charge.name}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-[#12231d]">{charge.name}</span>
                  <span className="ml-auto text-gray-600">
                    KES {charge.amount.toLocaleString("en-KE")}{" "}
                    {charge.frequency === "per_night" ? "/ night" : "/ booking"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {charge.required === false ? "Optional" : "Mandatory"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAdditionalCharges(
                        additionalCharges.filter((_, item) => item !== index),
                      )
                    }
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_9rem_9rem_9rem_auto]">
            <label className="sr-only" htmlFor="additional-charge-name">
              Charge name
            </label>
            <input
              id="additional-charge-name"
              maxLength={80}
              value={chargeName}
              onChange={(event) => setChargeName(event.target.value)}
              placeholder="e.g. Cleaning fee"
              className={inputClass}
            />
            <label className="sr-only" htmlFor="additional-charge-amount">
              Charge amount in KES
            </label>
            <input
              id="additional-charge-amount"
              type="number"
              min="0.01"
              max="100000000"
              step="0.01"
              value={chargeAmount}
              onChange={(event) => setChargeAmount(event.target.value)}
              placeholder="Amount (KES)"
              className={inputClass}
            />
            <label className="sr-only" htmlFor="additional-charge-frequency">
              Charge frequency
            </label>
            <select
              id="additional-charge-frequency"
              value={chargeFrequency}
              onChange={(event) =>
                setChargeFrequency(
                  event.target.value as ListingAdditionalCharge["frequency"],
                )
              }
              className={inputClass}
            >
              <option value="per_booking">Per booking</option>
              <option value="per_night">Per night</option>
            </select>
            <label className="sr-only" htmlFor="additional-charge-requirement">
              Charge requirement
            </label>
            <select
              id="additional-charge-requirement"
              value={chargeRequired ? "required" : "optional"}
              onChange={(event) =>
                setChargeRequired(event.target.value === "required")
              }
              className={inputClass}
            >
              <option value="required">Mandatory</option>
              <option value="optional">Optional</option>
            </select>
            <button
              type="button"
              onClick={addAdditionalCharge}
              disabled={
                !chargeName.trim() ||
                chargeName.trim().length > 80 ||
                !Number.isFinite(Number(chargeAmount)) ||
                Number(chargeAmount) <= 0 ||
                Number(chargeAmount) > 100000000 ||
                additionalCharges.length >= 20 ||
                additionalCharges.some(
                  (charge) =>
                    charge.name.toLocaleLowerCase() ===
                    chargeName.trim().toLocaleLowerCase(),
                )
              }
              className="rounded-lg border border-[#12231d] px-4 py-2 text-sm font-medium text-[#12231d] hover:bg-[#12231d] hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            >
              Add charge
            </button>
          </div>
        </div>
      </Field>

      <Field id="house-rule-input" label="House rules" optional>
        <div className="space-y-3">
          <ul className="flex flex-wrap gap-2">
            {houseRules.map((rule, index) => (
              <li
                key={`${rule}-${index}`}
                className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-[#12231d]"
              >
                <input type="hidden" name="house_rules" value={rule} />
                {rule}
                <button
                  type="button"
                  onClick={() =>
                    setHouseRules(houseRules.filter((_, item) => item !== index))
                  }
                  className="text-[#12231d] hover:text-[#E23E85]"
                  aria-label={`Remove house rule: ${rule}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              id="house-rule-input"
              maxLength={500}
              value={houseRuleInput}
              onChange={(event) => setHouseRuleInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addHouseRule();
                }
              }}
              placeholder="Add a house rule"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addHouseRule}
              disabled={
                !houseRuleInput.trim() ||
                houseRuleInput.trim().length > 500 ||
                houseRules.length >= 50 ||
                houseRules.some(
                  (rule) =>
                    rule.toLocaleLowerCase() ===
                    houseRuleInput.trim().toLocaleLowerCase(),
                )
              }
              className="shrink-0 rounded-lg border border-[#12231d] px-4 py-2 text-sm font-medium text-[#12231d] hover:bg-[#12231d] hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            >
              Add rule
            </button>
          </div>
        </div>
      </Field>

      <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-[#12231d]">
        <input
          type="checkbox"
          name="instant_book"
          defaultChecked={initialValues.instant_book}
          className="h-4 w-4 accent-[#E23E85]"
        />
        Allow guests to book instantly
      </label>

      <Field id="host_note" label="Note for the admin team" optional>
        <textarea
          id="host_note"
          name="host_note"
          maxLength={1500}
          rows={3}
          placeholder="Add context or request help with photos, map location, or another admin-managed detail."
          className={inputClass}
        />
      </Field>

      {success && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Changes applied. The admin team can review this update in your change history.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="min-h-12 w-full rounded-xl bg-[#E23E85] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c93075] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {isPending ? "Applying changes…" : "Apply changes"}
      </button>
      <p className="text-xs text-gray-500">
        Changes are visible right away. Admin review does not delay them.
      </p>
    </form>
  );
}
