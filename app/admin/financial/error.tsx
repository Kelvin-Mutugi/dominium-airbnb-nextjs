"use client";

import { useEffect } from "react";

export default function FinancialError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Finance section failed to load.", error);
  }, [error]);

  return (
    <section className="rounded-xl border border-rose-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-[#1B1A2E]">
        Unable to load financial data
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        The finance records could not be retrieved. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        Try again
      </button>
    </section>
  );
}
