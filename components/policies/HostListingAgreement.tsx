export default function HostListingAgreement() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
      <header className="mb-10 border-b border-gray-200 pb-8">
        <p className="text-sm font-semibold text-pink-600 mb-2">
          Dominium bnb
        </p>
        <h1 className="text-3xl font-bold text-gray-900">
          Host Listing Agreement &amp; Terms of Service
        </h1>
      </header>

      <div className="mb-10 leading-relaxed space-y-4">
        <p>
          <span className="font-semibold text-gray-900">BETWEEN:</span>{" "}
          Dominium Consultancy (operating as the Platform Manager / Listing
          Broker, hereinafter referred to as the &ldquo;Company&rdquo; or
          &ldquo;Dominium&rdquo;)
        </p>
        <p>
          <span className="font-semibold text-gray-900">AND:</span> The
          Property Owner / Authorized Manager submitting property details
          (hereinafter referred to as the &ldquo;Host&rdquo; or
          &ldquo;Property Owner&rdquo;).
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          1. Purpose &amp; Appointment
        </h2>
        <p className="leading-relaxed">
          By listing an accommodation or rental property on Dominium&rsquo;s
          platform or website, the Host appoints Dominium to market,
          display, and facilitate guest bookings for the property.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          2. Host Representations &amp; Warranties
        </h2>
        <p className="leading-relaxed mb-4">
          The Host represents, warrants, and guarantees to Dominium that:
        </p>
        <ul className="list-disc pl-5 space-y-3 leading-relaxed">
          <li>
            <span className="font-semibold text-gray-900">
              Ownership &amp; Authority:
            </span>{" "}
            They are the lawful owner of the property or possess full,
            unencumbered legal authority to sub-lease/rent out the premises.
          </li>
          <li>
            <span className="font-semibold text-gray-900">
              Accuracy of Listing Information:
            </span>{" "}
            All descriptions, amenities, photos, pricing, and availability
            calendars supplied to Dominium are 100% accurate, complete, and
            current.
          </li>
          <li>
            <span className="font-semibold text-gray-900">
              Standards &amp; Compliance:
            </span>{" "}
            The property meets all national and local safety, health,
            building, and sanitation standards (including functional fire
            safety, secure locks, clean linens, functional plumbing,
            electricity, and water supply).
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          3. Protection of Guests &amp; Prevention of Inconvenience
        </h2>
        <p className="leading-relaxed mb-5">
          To protect guests from double bookings, false advertising, or
          sudden cancellations, the Host agrees to the following operational
          covenants:
        </p>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">
            A. Availability &amp; Double-Booking Prohibition
          </h3>
          <ul className="list-disc pl-5 space-y-3 leading-relaxed">
            <li>The Host must keep their availability calendar continuously updated.</li>
            <li>
              If a property is booked through Dominium, the Host must not
              sell, lease, or occupy the property during those confirmed
              dates.
            </li>
            <li>
              <span className="font-semibold text-gray-900">
                Double-Booking Liability:
              </span>{" "}
              If a guest arrives and the property is unavailable due to a
              double-booking or Host oversight, the Host shall be solely
              responsible for all financial costs associated with securing
              equivalent or superior emergency alternative accommodation for
              the guest.
            </li>
          </ul>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">
            B. Property Condition &amp; &ldquo;As-Advertised&rdquo; Guarantee
          </h3>
          <ul className="list-disc pl-5 space-y-3 leading-relaxed">
            <li>
              If a guest arrives and finds the property substantially unfit,
              unsanitary, materially different from the photos, or lacking
              core amenities (e.g., no water, no electricity, broken
              AC/Wi-Fi), the Host must rectify the defect within three (3)
              hours.
            </li>
            <li>
              If the defect cannot be resolved promptly, Dominium reserves
              the right to issue a 100% full refund to the guest at the
              Host&rsquo;s direct expense. Dominium may recover the refunded
              amount from the Host&rsquo;s payouts or, if no payouts are
              pending, by invoicing the Host (see clause 5.6).
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">
            C. Host Cancellations &amp; Penalties
          </h3>
          <ul className="list-disc pl-5 space-y-3 leading-relaxed mb-4">
            <li>
              Once a booking is confirmed, the Host cannot cancel the
              reservation except under verified Force Majeure (e.g., natural
              disasters, major structural failure).
            </li>
          </ul>
          <p className="leading-relaxed mb-2">
            In the event of an unjustified cancellation by the Host:
          </p>
          <ol className="list-decimal pl-5 space-y-3 leading-relaxed">
            <li>The Host forfeits any payout for that booking.</li>
            <li>
              The Host will incur a cancellation administrative fee of
              [e.g., 20% of the booking value or KES 5,000] to cover
              re-accommodation costs, which Dominium may deduct from any
              future payout (see clause 5.6).
            </li>
            <li>
              Dominium reserves the right to unlist or terminate the
              Host&rsquo;s account after repeated cancellations.
            </li>
          </ol>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          4. Indemnification &amp; Limitation of Dominium&rsquo;s Liability
        </h2>
        <p className="leading-relaxed mb-4">
          To shield and protect Dominium Consultancy from third-party
          liabilities:
        </p>
        <p className="leading-relaxed mb-2">
          <span className="font-semibold text-gray-900">
            Indemnification:
          </span>{" "}
          The Host agrees to fully indemnify, defend, and hold harmless
          Dominium Consultancy, its directors, officers, employees, and
          agents from and against any claims, losses, damages, liabilities,
          fines, injuries, or expenses (including legal fees) arising from:
        </p>
        <ol className="list-decimal pl-5 space-y-3 leading-relaxed mb-4">
          <li>
            Any personal injury, property damage, or death occurring on the
            Host&rsquo;s property during a stay.
          </li>
          <li>
            Any breach of this Agreement, local laws, or housing regulations
            by the Host.
          </li>
          <li>Misrepresentation of property features or ownership rights.</li>
        </ol>
        <p className="leading-relaxed mb-4">
          <span className="font-semibold text-gray-900">Platform Role:</span>{" "}
          Dominium acts solely as a venue/broker facilitating reservations
          between guests and hosts. Dominium does not own, inspect daily,
          manage, or maintain the physical premises and accepts no liability
          for physical property defects, guest misconduct, or host
          negligence.
        </p>
        <p className="leading-relaxed">
          <span className="font-semibold text-gray-900">
            Limitation of Liability:
          </span>{" "}
          To the fullest extent permitted by law, Dominium&rsquo;s total
          liability to the Host in connection with any booking is limited to
          the fees (markup and payout processing fees) that Dominium
          actually received for that booking.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          5. Pricing, Markup, Payments &amp; Payouts
        </h2>

        <div className="space-y-4 leading-relaxed">
          <p>
            <span className="font-semibold text-gray-900">
              5.1 Host&rsquo;s Nightly Rate.
            </span>{" "}
            The Host sets a base nightly rate for the property. This is the
            amount the Host will be paid for each night booked, less the
            payout processing fee described in clause 5.4.
          </p>
          <p>
            <span className="font-semibold text-gray-900">
              5.2 Dominium Service Fee (Fixed Markup).
            </span>{" "}
            Dominium adds a fixed amount in Kenya Shillings per night on top
            of the Host&rsquo;s base nightly rate when showing the price to
            guests. For example, if the Host&rsquo;s base rate is KES 2,500
            and Dominium&rsquo;s fixed amount is KES 400, the guest sees KES
            2,900 and the Host receives KES 2,500 per night. The amount is
            set by Dominium for each property and is shown to the Host in
            the price preview before the listing is published. The
            Host&rsquo;s acceptance of that preview, together with this
            Agreement, confirms the amount. The markup belongs to Dominium
            and is not deducted from the Host&rsquo;s base rate.
          </p>
          <p>
            <span className="font-semibold text-gray-900">
              5.3 Collection of Payment.
            </span>{" "}
            Dominium collects the full booking amount from the guest on the
            Host&rsquo;s behalf.
          </p>
          <p>
            <span className="font-semibold text-gray-900">
              5.4 Payout Processing Fee.
            </span>{" "}
            Dominium deducts a fixed processing fee from each payout to
            cover the cost of sending the money to the Host (mobile money,
            bank transfer, or similar). The current fee is shown in the
            Host&rsquo;s dashboard and in the price preview.
          </p>
          <p>
            <span className="font-semibold text-gray-900">
              5.5 Payout Timing.
            </span>{" "}
            Payouts are sent 24 to 48 hours after the guest checks out,
            unless a guest complaint about the property&rsquo;s condition or
            access was lodged within [24 hours] of check-in and is still
            being resolved.
          </p>
          <p>
            <span className="font-semibold text-gray-900">
              5.6 Deductions &amp; Refunds.
            </span>{" "}
            Dominium may deduct from any payout the amounts the Host owes
            under Section 3, including guest refunds, emergency alternative
            accommodation costs, and cancellation fees. If no payout is
            pending, Dominium may invoice the Host for the amount owed.
          </p>
          <p>
            <span className="font-semibold text-gray-900">
              5.7 Changes to Fees.
            </span>{" "}
            Dominium may change the service fee or payout processing fee by
            giving the Host at least [14] days&rsquo; notice through the
            Host&rsquo;s dashboard, email, or SMS. Changes apply only to
            bookings made after the notice period ends. A Host who does not
            agree to a change may unlist their property before it takes
            effect.
          </p>
          <p>
            <span className="font-semibold text-gray-900">5.8 Taxes.</span>{" "}
            The Host is responsible for their own taxes on income received
            through Dominium. Dominium&rsquo;s fees are stated [inclusive /
            exclusive] of any applicable taxes.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          6. Data Protection &amp; Privacy
        </h2>
        <ul className="list-disc pl-5 space-y-3 leading-relaxed">
          <li>
            The Host agrees to handle all guest personal data (names, phone
            numbers, identification details) received via Dominium in
            strict compliance with applicable Data Protection Laws (e.g.,
            Kenya Data Protection Act, 2019).
          </li>
          <li>
            The Host shall use guest contact information solely for
            purposes related to check-in, stay management, and emergency
            communication. The Host shall not sell, lease, or use guest
            contact data for unsolicited personal marketing.
          </li>
          <li>
            <span className="font-semibold text-gray-900">
              Off-Platform Dealings:
            </span>{" "}
            The Host shall not accept bookings, payments, or rebookings from
            guests introduced through Dominium outside the platform, and
            shall not encourage guests to do so. If the Host breaches this
            clause, Dominium may remove the listing, terminate the
            Host&rsquo;s account, and recover the fees it would have earned
            on those bookings.
          </li>
          <li>
            Read more in our{" "}
            <a
              className="text-[blue] underline"
              href="/legal/host-privacy-policy"
            >
              Host Privacy Policy
            </a>{" "}
            or{" "}
            <a
              className="text-[blue] underline"
              href="/legal/guest-privacy-policy"
            >
              Guest Privacy Policy
            </a>
            .
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          7. Governing Law &amp; Jurisdiction
        </h2>
        <p className="leading-relaxed">
          This Agreement shall be governed by and construed in accordance
          with the laws of the Republic of Kenya. Any disputes arising under
          or in connection with this Agreement shall be resolved through
          amicable negotiations, failing which they shall be submitted to
          arbitration in Nairobi, Kenya.
        </p>
      </section>

      {/* <section className="border-t border-gray-200 pt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Electronic Acceptance / Opt-In Declaration
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          (To be placed next to a required checkbox on your Host Onboarding
          Portal/Form, below the price preview)
        </p>
        <label className="flex items-start gap-3 leading-relaxed">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-pink-600"
          />
          <span>
            <span className="font-semibold text-gray-900">
              I ACCEPT AND AGREE TO THE HOST LISTING AGREEMENT
            </span>{" "}
            &mdash; By checking this box, I certify that I am the legal
            owner or authorized manager of the listed property. I have
            reviewed the price preview showing the amount I will receive
            and the fees Dominium charges. I agree to keep availability
            accurate, honor all confirmed bookings, maintain high property
            standards, and abide by the terms of this Agreement. I
            acknowledge that Dominium Consultancy acts as a platform agent
            and I agree to fully indemnify Dominium against any guest
            claims, double-bookings, property defects, or operational
            damages resulting from my property.
          </span>
        </label>
      </section> */}
    </div>
  );
}