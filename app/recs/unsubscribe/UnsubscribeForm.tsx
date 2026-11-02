"use client";

import { useState } from "react";

export default function UnsubscribeForm({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function unsubscribe() {
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/recs/alerts/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
            ? payload.error
            : "Unable to update alert preferences.",
        );
      }
      setMessage("You are unsubscribed from this alert.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update alert preferences.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6">
      {message ? (
        <p role="status" className="text-sm text-[#36454F]">
          {message}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void unsubscribe()}
          disabled={isSubmitting}
          className="min-h-11 rounded-lg bg-[#1B1A2E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#34324e] disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting ? "Updating…" : "Unsubscribe"}
        </button>
      )}
    </div>
  );
}
