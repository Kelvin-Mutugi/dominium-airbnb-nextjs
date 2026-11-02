"use client";

import { useState, type FormEvent } from "react";
import type { BrowseCategory } from "@/app/lib/listing-categories";
import type { FilterState } from "@/types/types";

interface SavedSearchFormProps {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  category: BrowseCategory;
  filters: FilterState;
}

export default function SavedSearchForm({
  location,
  checkIn,
  checkOut,
  guests,
  category,
  filters,
}: SavedSearchFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contactChannel, setContactChannel] = useState<"email" | "whatsapp">(
    "email",
  );
  const [contactValue, setContactValue] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function saveSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/recs/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          filters: {
            location: location.trim(),
            checkIn,
            checkOut,
            guests,
            category,
            minPrice: filters.minPrice,
            maxPrice: filters.maxPrice,
            propertyType: filters.propertyType,
            bedrooms: filters.bedrooms,
            amenities: filters.amenities,
            petFriendly: filters.petFriendly,
            groupStayOnly: filters.groupStayOnly,
            instantBooking: filters.instantBooking,
            minRating: filters.minRating,
          },
          contact: { contactChannel, contactValue, consent },
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
            ? payload.error
            : "Unable to save this search.",
        );
      }
      setMessage("Search saved. Future alerts will include an unsubscribe link.");
      setContactValue("");
      setConsent(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save this search.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="my-4 rounded-xl border border-neutral-200 bg-white p-4">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="min-h-10 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
      >
        {isOpen ? "Close saved search" : "Save this search"}
      </button>
      {isOpen && (
        <form onSubmit={saveSearch} className="mt-4 grid gap-4 sm:max-w-xl">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-neutral-800">
              Alert channel
              <select
                value={contactChannel}
                onChange={(event) =>
                  setContactChannel(event.target.value as "email" | "whatsapp")
                }
                className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3"
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-neutral-800">
              {contactChannel === "email" ? "Email address" : "WhatsApp number"}
              <input
                type={contactChannel === "email" ? "email" : "tel"}
                autoComplete={contactChannel === "email" ? "email" : "tel"}
                required
                maxLength={254}
                value={contactValue}
                onChange={(event) => setContactValue(event.target.value)}
                placeholder={
                  contactChannel === "email"
                    ? "you@example.com"
                    : "+254 7XX XXX XXX"
                }
                className="min-h-10 rounded-lg border border-neutral-300 px-3"
              />
            </label>
          </div>
          <label className="flex items-start gap-2 text-sm leading-5 text-neutral-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              required
              className="mt-1 size-4 accent-[#1B1A2E]"
            />
            <span>
              I agree Dominium may use this contact to send updates related to
              this saved stay search. Any future alert will include an
              unsubscribe link. Email and WhatsApp delivery are not active yet.
            </span>
          </label>
          <button
            type="submit"
            disabled={isSubmitting || !consent}
            className="min-h-11 w-fit rounded-lg bg-[#1B1A2E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#34324e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save search"}
          </button>
          {message && (
            <p
              role={message.startsWith("Search saved") ? "status" : "alert"}
              className="text-sm text-neutral-700"
            >
              {message}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
