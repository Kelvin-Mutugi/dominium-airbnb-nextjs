import Link from "next/link";
import Navbar from "@/components/navigationBar";
import Footer from "@/components/footer";

const problems = [
  {
    title: "Lack of Trust and Scams",
    body: "Many platforms list properties without verification. That is why we carry out due diligence and verification of our hosts and properties before they are listed on our platform.",
  },
  {
    title: "Fragmented Search",
    body: "Guests have to search on Instagram, Facebook, and multiple sites. We bring more choice into one convenient place: studios, 1-3 bedroom furnished apartments, maisonettes, villas, holiday homes, Airbnbs, and more.",
  },
  {
    title: "Unclear Information",
    body: "We provide clear, accurate photos, amenities, location details, and transparent pricing to help you make informed booking decisions with greater peace of mind.",
  },
  {
    title: "Booking Inconvenience",
    body: "We make discovery, comparison, and booking simple and fast.",
  },
];

const reasons = [
  {
    title: "Verified Accommodation in Kenya",
    body: "Explore properties and hosts that have undergone our onboarding checks. Book with greater confidence.",
  },
  {
    title: "More Choice in One Place",
    body: "Discover short-term accommodation across top destinations in Kenya from one platform.",
  },
  {
    title: "Property Types for Every Budget",
    body: "Find studios, furnished apartments, homes, villas, holiday homes, luxury apartments and more.",
  },
  {
    title: "Clearer Booking Decisions",
    body: "Access useful property information to help you choose a stay that fits your needs.",
  },
  {
    title: "A More Trusted Experience",
    body: "We prioritize verification, transparency, and customer support.",
  },
  {
    title: "Convenient Discovery",
    body: "Search by location, price, property type and amenities to find your ideal stay in minutes.",
  },
];

const values = ["Trust", "Choice", "Convenience", "Quality", "Transparency"];

const faqs = [
  {
    q: "What is Dominiumbnb?",
    a: "Dominiumbnb is a Kenya-focused accommodation platform for booking verified short-term rentals, including furnished apartments, studios, villas, and holiday homes.",
  },
  {
    q: "Is Dominiumbnb an Airbnb alternative in Kenya?",
    a: "Yes. Dominiumbnb is a trusted local alternative to Airbnb, focused specifically on verified stays across Kenya with local support and M-Pesa friendly options.",
  },
  {
    q: "Where can I find short-term rentals on Dominiumbnb?",
    a: "You can find short-term rentals in Nairobi (Westlands, Kilimani, Kileleshwa, Syokimau, Parklands), Mombasa, Diani, Kisumu, Nakuru, Naivasha, Nanyuki, Eldoret and other towns across Kenya.",
  },
  {
    q: "Are properties on Dominiumbnb verified?",
    a: "Yes. All hosts and properties undergo due diligence and verification before being listed to ensure trust and safety.",
  },
  {
    q: "How do I list my property on Dominiumbnb?",
    a: 'Click on "List Your Property" and complete our host onboarding process. Our team will verify your property and help you go live.',
  },
];

export default function AboutUs() {
  return (
    <main className="bg-white text-gray-900">
      <Navbar />
      {/* Hero */}
      <section className="border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            About Us
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">
            Kenya&apos;s Trusted Platform for Verified Short-Term Rentals &amp;
            Furnished Apartments
          </h1>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-gray-600">
            <p>
              Dominiumbnb is Kenya&apos;s trusted short-term rental platform for
              verified furnished apartments, villas, and holiday homes. We help
              travellers find and book safe, comfortable, and luxurious
              short-term accommodation in Kenya.
            </p>
            <p>
              If you are looking for furnished apartments for rent in Nairobi,
              Mombasa, Diani, Kisumu, Nakuru and Naivasha, studios, villas, or
              holiday homes for business travel, family visits, or weekend
              getaways, we make it easy to book with confidence.
            </p>
            <p>
              At Dominiumbnb, we network and connect guests looking for
              comfortable and luxurious places to stay with genuine hosts
              offering furnished apartments, holiday homes, and other short-term
              rental properties across Kenya.
            </p>
          </div>
        </div>
      </section>

      {/* Who we are */}
      <section className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
        <h2 className="text-2xl font-semibold sm:text-3xl">
          Who We Are: Connecting You to Verified Furnished Apartments, Villas
          &amp; Holiday Homes in Kenya
        </h2>
        <div className="mt-6 space-y-4 leading-relaxed text-gray-600">
          <p>
            Dominiumbnb was built to solve a real problem in Kenya&apos;s
            short-term rental market: finding a great place to stay shouldn&apos;t
            be stressful.
          </p>
          <p>
            Too many travellers waste hours scrolling through unverified
            listings, worrying about scams, fake photos, inflated prices, or
            last-minute disappointments. Hosts also struggle to reach serious
            guests.
          </p>
          <p>
            We are changing that. Dominiumbnb brings together carefully vetted
            accommodation options from across the country into one simple,
            accessible, and trusted platform for short-term stays in Kenya.
          </p>
          <p>
            Find verified short-term rentals in Nairobi, Mombasa, Kisumu,
            Nakuru, Eldoret, Naivasha, Nanyuki, Diani, Watamu and Malindi.
            Whether you need a 1, 2, 3 or 4-bedroom furnished apartment or a
            studio in Westlands, Kileleshwa, Kilimani, a beach villa in Diani,
            or a holiday home in Naivasha, Dominiumbnb has you covered.
          </p>
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Who Is Dominiumbnb Built For?
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold">For Guests</h3>
              <p className="mt-3 leading-relaxed text-gray-600">
                Whether you are travelling for business, visiting family,
                attending an event, taking a holiday, or simply looking for a
                comfortable and luxurious weekend escape, we help you discover
                and book a place that suits your needs, preferences and budget.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold">
                For Hosts and Property Owners
              </h3>
              <p className="mt-3 leading-relaxed text-gray-600">
                We help genuine hosts, from individual apartment owners to
                managers of villas, short-term apartments, and holiday homes,
                reach more guests, fill their properties faster, and grow their
                business with a platform that values verification and quality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Problems we solve */}
      <section className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
        <h2 className="text-2xl font-semibold sm:text-3xl">
          The Problem We Solve in Kenya&apos;s Short-Term Rental Market
        </h2>
        <ol className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
          {problems.map((item, i) => (
            <li key={item.title} className="flex gap-5 py-6">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 text-sm font-medium text-gray-700">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 leading-relaxed text-gray-600">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Why book */}
      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Why Book Short-Term Stays on Dominiumbnb?
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-gray-200 bg-white p-5"
              >
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision, mission, values */}
      <section className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">Our Vision</h2>
            <p className="mt-3 leading-relaxed text-gray-600">
              To be Kenya&apos;s most trusted and preferred short-term
              accommodation platform, where every stay is comfortable, verified,
              and memorable.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Our Mission</h2>
            <p className="mt-3 leading-relaxed text-gray-600">
              To make finding and booking accommodation in Kenya easier, more
              convenient and more reassuring by connecting guests with genuine
              hosts through a secure and user-friendly platform.
            </p>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold">Our Core Values</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {values.map((v) => (
              <li
                key={v}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-700"
              >
                {v}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Commitment */}
      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 py-14 text-center sm:py-20">
          <h2 className="text-2xl font-semibold sm:text-3xl">Our Commitment</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-gray-600">
            Dominiumbnb is managed by a dedicated Kenyan team committed to
            customer satisfaction and host success. By working with genuine
            hosts and bringing their properties together in one platform, we
            help you spend less time searching and more time looking forward to
            your stay.
          </p>
          <p className="mt-6 font-medium">
            Your Stay, Your Choice, Our Commitment to Trust.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Browse Stays
            </Link>
            <Link
              href="/list-your-property"
              className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              List Your Property
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <h2 className="text-2xl font-semibold sm:text-3xl">
          Frequently Asked Questions About Dominiumbnb
        </h2>
        <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
          {faqs.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {item.q}
                <span className="text-xl leading-none text-gray-400 group-open:hidden">
                  +
                </span>
                <span className="hidden text-xl leading-none text-gray-400 group-open:inline">
                  &minus;
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-gray-600">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}