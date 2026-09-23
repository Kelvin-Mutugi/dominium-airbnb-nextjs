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
        At Dominium bnb, we understand that travel plans can change
        unexpectedly. Because we are a small, boutique property,
        cancellations significantly impact our business. We have designed
        our policy to be as fair and flexible as possible.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          1. Cancellation Windows &amp; Refund Terms
        </h2>

        <div className="mb-5">
          <h3 className="font-semibold text-gray-900 mb-1">
            14+ Days Before Check-in (Full Refund)
          </h3>
          <p className="leading-relaxed">
            Cancellations made 14 days or more prior to your scheduled
            check-in date (by 2:00 PM local time) will receive a 100% full
            refund of all payments made (minus a small [e.g., KES 1,000 /
            $10] administrative payment processing fee).
          </p>
        </div>

        <div className="mb-5">
          <h3 className="font-semibold text-gray-900 mb-1">
            7 to 13 Days Before Check-in (50% Refund)
          </h3>
          <p className="leading-relaxed">
            Cancellations made between 7 and 13 days prior to your scheduled
            check-in date will receive a 50% refund of the total booking
            amount. Alternatively, you may choose to convert 100% of your
            payment into a travel credit valid for a stay within the next 6
            months.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-1">
            Less Than 7 Days Before Check-in (No Refund)
          </h3>
          <p className="leading-relaxed">
            Cancellations made within 6 days or less of your check-in date,
            as well as no-shows or early departures, are non-refundable.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          2. Booking &amp; Payment Terms
        </h2>
        <ul className="list-disc pl-5 space-y-3 leading-relaxed">
          <li>
            <span className="font-semibold text-gray-900">Deposit:</span> A
            50% deposit is required at the time of booking to secure your
            reservation. The remaining balance will be automatically charged
            7 days prior to check-in.
          </li>
          <li>
            <span className="font-semibold text-gray-900">
              Processing Time:
            </span>{" "}
            All eligible refunds will be issued to the original payment
            method within 3 to 5 business days.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          3. Date Modifications &amp; Rescheduling
        </h2>
        <ul className="list-disc pl-5 space-y-3 leading-relaxed">
          <li>
            You may reschedule your stay once without penalty if requested 7
            days or more prior to arrival.
          </li>
          <li>
            Rescheduling is subject to room availability and any rate
            differences for peak or seasonal dates.
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
            In the rare event that Dominium must cancel your booking due to
            unforeseen property emergencies or severe maintenance issues,
            you will receive a 100% immediate full refund or free
            rescheduling.
          </li>
          <li>
            <span className="font-semibold text-gray-900">
              Guest Emergencies:
            </span>{" "}
            We cannot issue refunds for cancellations outside the standard
            policy windows due to weather, transport delays, flight
            disruptions, or personal health issues. We strongly advise
            purchasing travel insurance to protect your trip.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          5. How to Request a Cancellation
        </h2>
        <p className="leading-relaxed mb-4">
          To cancel or modify your reservation, please contact us in
          writing:
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
              href="tel:0792603759"
              className="text-pink-600 hover:underline"
            >
              0792603759
            </a>
          </li>
        </ul>
        <p className="leading-relaxed">
          Cancellations are only effective once you receive a written
          cancellation confirmation email from our management team.
        </p>
      </section>
    </div>
  );
}