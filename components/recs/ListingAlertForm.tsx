"use client";

import { useState, type FormEvent } from "react";

export default function ListingAlertForm({
  listingId,
  checkIn,
  checkOut,
}: {
  listingId: string;
  checkIn?: string;
  checkOut?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [alertType, setAlertType] = useState<"price_drop" | "availability">(
    "price_drop",
  );
  const [contactChannel, setContactChannel] = useState<"email" | "whatsapp">(
    "email",
  );
  const [contactValue, setContactValue] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasDates = Boolean(checkIn && checkOut);

  async function createAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/recs/alerts/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          listingId,
          alertType,
          ...(alertType === "availability" ? { checkIn, checkOut } : {}),
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
            : "Unable to set this alert.",
        );
      }
      setMessage("Alert saved. You can unsubscribe from its alert message.");
      setContactValue("");
      setConsent(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to set this alert.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-[6%] my-5 rounded-xl border border-[#E9E6DD] bg-white p-4 sm:mx-[6%]">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="min-h-10 rounded-lg border border-[#E9E6DD] px-4 py-2 text-sm font-medium text-[#1B1A2E] hover:bg-[#F8F7F4]"
      >
        {isOpen ? "Close alert form" : "Get a price or availability alert"}
      </button>
      {isOpen && (
        <form onSubmit={createAlert} className="mt-4 grid gap-4 sm:max-w-xl">
          <label className="grid gap-1 text-sm font-medium text-[#1B1A2E]">
            Alert type
            <select
              value={alertType}
              onChange={(event) =>
                setAlertType(event.target.value as "price_drop" | "availability")
              }
              className="min-h-10 rounded-lg border border-[#E9E6DD] bg-white px-3"
            >
              <option value="price_drop">Price drops</option>
              <option value="availability">Selected dates become available</option>
            </select>
          </label>
          {alertType === "availability" && !hasDates && (
            <p className="text-sm text-[#6B7280]">
              Select check-in and check-out dates on this stay first.
            </p>
          )}
          {alertType === "availability" && hasDates && (
            <p className="text-sm text-[#6B7280]">
              We’ll watch {checkIn} to {checkOut}.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-[#1B1A2E]">
              Alert channel
              <select
                value={contactChannel}
                onChange={(event) =>
                  setContactChannel(event.target.value as "email" | "whatsapp")
                }
                className="min-h-10 rounded-lg border border-[#E9E6DD] bg-white px-3"
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-[#1B1A2E]">
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
                className="min-h-10 rounded-lg border border-[#E9E6DD] px-3"
              />
            </label>
          </div>
          <label className="flex items-start gap-2 text-sm leading-5 text-[#3A3856]/75">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              required
              className="mt-1 size-4 accent-[#1B1A2E]"
            />
            <span>
              I agree Dominium may use this contact to send this stay alert. I
              can unsubscribe from the alert message at any time.
            </span>
          </label>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              !consent ||
              (alertType === "availability" && !hasDates)
            }
            className="min-h-11 w-fit rounded-lg bg-[#1B1A2E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#34324e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Set alert"}
          </button>
          {message && (
            <p
              role={message.startsWith("Alert saved") ? "status" : "alert"}
              className="text-sm text-[#3A3856]"
            >
              {message}
            </p>
          )}
          <p className="text-xs leading-5 text-[#6B7280]">
            Alerts are queued for future delivery. Email and WhatsApp delivery
            are not connected yet.
          </p>
        </form>
      )}
    </section>
  );
}
