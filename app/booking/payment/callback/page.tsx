import { Suspense } from "react";
import PaymentCallback from "./PaymentCallback";

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FAF9F6] px-4 py-16">
          <div className="mx-auto w-full max-w-xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#E23E85]">
              Payment
            </p>

            <h1 className="mt-3 text-2xl font-semibold text-[#1B1A2E]">
              Loading payment...
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Please wait while we load your payment details.
            </p>
          </div>
        </main>
      }
    >
      <PaymentCallback />
    </Suspense>
  );
}