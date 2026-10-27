import { PLATFORM_CANCELLATION_POLICY } from "@/app/lib/cancellation-policy";
import Link from "next/link";

export default function RefundPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
      <header className="mb-10 border-b border-gray-200 pb-8">
        <p className="text-sm font-semibold text-pink-600 mb-2">
          Dominium Airbnb
        </p>
        <h1 className="text-3xl font-bold text-gray-900">
          Refund &amp; Cancellation Policy
        </h1>
      </header>

      <p className="mb-10 leading-relaxed">
        This policy applies to every reservation on Dominium BNB and takes
        precedence over any different cancellation or refund wording shown on a
        listing. Refund estimates are based on successful payments recorded for
        the booking and use the Africa/Nairobi calendar date.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          1. Guest-initiated cancellations
        </h2>
        <ul className="list-disc space-y-3 pl-5 leading-relaxed">
          <li>
            <strong>14 days or more before check-in:</strong> 100% of amounts
            paid, less any separately disclosed non-refundable transaction or
            processing charges where applicable.
          </li>
          <li>
            <strong>7–13 days before check-in:</strong> 50% of amounts paid,
            less any separately disclosed non-refundable transaction or
            processing charges where applicable.
          </li>
          <li>
            <strong>Less than 7 days before check-in:</strong> no refund.
          </li>
        </ul>
        <p className="mt-4 leading-relaxed">
          Submit a cancellation request from Account → Bookings. The booking
          remains confirmed until the request is approved. The estimate shown
          is based on successful payments recorded for the booking.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          2. No-shows and early departures
        </h2>
        <ul className="list-disc pl-5 space-y-3 leading-relaxed">
          <li>
            A guest who does not arrive on the scheduled check-in date without
            prior notice is a no-show and forfeits 100% of the booking amount.
          </li>
          <li>
            No refunds are granted for early departures, shortened stays, or
            unused nights after check-in.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          3. Host or Dominium BNB cancellations
        </h2>
        <p className="leading-relaxed">
          If the host or Dominium BNB cancels a confirmed reservation, the
          guest is entitled to a 100% refund of all amounts paid for the
          affected booking. Dominium BNB will make reasonable efforts to help
          the guest find alternative accommodation where available.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          4. Exceptional circumstances
        </h2>
        <p className="leading-relaxed">
          Dominium BNB may review refund requests arising from unforeseen
          events, including natural disasters, government travel restrictions,
          security concerns, or other circumstances beyond the guest’s
          reasonable control. These requests are considered case by case and
          are not automatically approved.
        </p>
        <p className="mt-3 leading-relaxed">
          Contact{" "}
          <Link href="/contactus" className="text-pink-600 hover:underline">
            support
          </Link>{" "}
          with your booking reference and relevant details.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          5. Refund processing
        </h2>
        <p className="leading-relaxed mb-4">
          Approved refunds are sent through the original payment method and may
          take 5–14 business days to appear, depending on the financial
          institution or payment service provider. For M-Pesa bookings, the
          refund is sent to the mobile number recorded for the booking. A
          cancellation approval is not itself a refund approval or proof that
          money has been sent.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          6. Booking changes and cancellation requests
        </h2>
        <p className="leading-relaxed">
          Submit cancellation and date-change requests from your account’s
          bookings page. A cancellation request does not cancel the booking
          immediately. Approved refunds are recorded only after the payment
          provider confirms the transfer. Contact support if you cannot access
          your booking.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          7. Acceptance of this policy
        </h2>
        <p className="leading-relaxed">
          By confirming a reservation on Dominium BNB, guests acknowledge that
          they have read, understood, and agreed to this Cancellation and
          Refund Policy.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Policy summary</h2>
        <p className="leading-relaxed">{PLATFORM_CANCELLATION_POLICY}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Contact support
        </h2>
        <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
          <li>
            <span className="font-semibold text-gray-900">Email:</span>{" "}
            <a
              href="mailto:info@dominiumconsultancy.com"
              className="text-pink-600 hover:underline"
            >
              info@dominiumconsultancy.com
            </a>
          </li>
          <li>
            <span className="font-semibold text-gray-900">
              Phone/WhatsApp:
            </span>{" "}
            <a
              href="tel:0183191903"
              className="text-pink-600 hover:underline"
            >
              0183191903
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}