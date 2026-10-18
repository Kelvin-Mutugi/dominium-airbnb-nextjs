import { PLATFORM_CANCELLATION_POLICY } from "@/app/lib/cancellation-policy";

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
        Cancellation requests are handled under the platform-wide terms below.
        Estimates use the successful payments recorded for your booking.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          1. Cancellation Windows &amp; Refund Terms
        </h2>

        <p className="leading-relaxed">{PLATFORM_CANCELLATION_POLICY}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          2. Booking &amp; Payment Terms
        </h2>
        <ul className="list-disc pl-5 space-y-3 leading-relaxed">
          <li>
            The amount and payment method are shown at checkout. A booking is
            confirmed only after payment is verified. Cancellation requests
            are reviewed by Dominium; eligible approved refunds are sent to
            the M-Pesa number on the booking and recorded after Safaricom
            confirms the transfer.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          3. Date Modifications &amp; Rescheduling
        </h2>
        <ul className="list-disc pl-5 space-y-3 leading-relaxed">
          <li>
            Submit a date-change request from your account for a confirmed,
            upcoming booking. The host reviews the request; it is not approved
            until you receive an update in your booking.
          </li>
          <li>
            Date changes depend on availability and the price for the
            requested dates. Any quoted price difference is shown before you
            submit the request.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          4. Unforeseen Circumstances &amp; Travel Insurance
        </h2>
        <ul className="list-disc pl-5 space-y-3 leading-relaxed">
          <li>
            <span className="font-semibold text-gray-900">
              Host Cancellations:
            </span>{" "}
            If a host must cancel, Dominium will contact you about next steps.
            Any rescheduling depends on availability. Refunds are handled
            through the refund review process and are marked complete only
            after Safaricom confirms the transfer.
          </li>
          <li>
            <span className="font-semibold text-gray-900">
              Guest Emergencies:
            </span>{" "}
            The same cancellation schedule applies if plans change because of
            weather, transport delays, flight disruptions, or personal health
            issues. We recommend purchasing travel insurance to protect your
            trip.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          5. How to Request a Cancellation
        </h2>
        <p className="leading-relaxed mb-4">
          Submit a cancellation request from your account’s bookings page.
          An administrator reviews the request; submitting it does not
          immediately cancel the booking or send a refund. You can contact
          support if you cannot access your booking.
        </p>
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