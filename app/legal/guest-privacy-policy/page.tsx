import Footer from "@/components/footer";
import Navbar from "@/components/navigationBar";


type ListItem = string | { text: string; sub: string[] };

type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "ul"; items: ListItem[] }
  | { type: "contact"; email: string; phone: string; address: string };

type Section = { title: string; blocks: Block[] };

const sections: Section[] = [
  {
    title: "Introduction",
    blocks: [
      {
        type: "p",
        text: "Welcome to Dominium BnB. We respect your privacy and are committed to protecting your personal information.",
      },
      {
        type: "p",
        text: "This Privacy Policy explains how we collect, use, store, and protect information provided by guests who use our platform to search, book, and pay for accommodation properties listed by independent Hosts throughout Kenya.",
      },
      {
        type: "p",
        text: "By using our website, mobile platform, or services, you agree to the terms of this Privacy Policy.",
      },
    ],
  },
  {
    title: "Information We Collect",
    blocks: [
      {
        type: "p",
        text: "When you make a booking or create an account, we may collect:",
      },
      {
        type: "ul",
        items: [
          "Full Name",
          "Phone Number",
          "Email Address",
          "National ID or Passport Number",
          "Residential Address",
          "Payment Information",
          "Booking History",
          "Communication with Dominium BnB",
          "Check-in and Check-out Information",
        ],
      },
    ],
  },
  {
    title: "How We Use Your Information",
    blocks: [
      { type: "p", text: "We use your information to:" },
      {
        type: "ul",
        items: [
          "Process accommodation bookings.",
          "Confirm reservations.",
          "Process payments and refunds.",
          "Provide customer support.",
          "Verify identity and prevent fraud.",
          "Improve our website and services.",
          "Send booking confirmations and updates.",
          "Comply with legal and regulatory obligations.",
        ],
      },
    ],
  },
  {
    title: "Payment Processing",
    blocks: [
      { type: "p", text: "When you make a payment:" },
      {
        type: "ul",
        items: [
          "Payment is made to Dominium BnB.",
          "We process the transaction securely.",
          "Your payment information is handled using secure payment systems and is not sold to third parties.",
        ],
      },
    ],
  },
  {
    title: "Sharing Your Information",
    blocks: [
      { type: "p", text: "We may share limited information with:" },
      { type: "h", text: "Service Providers" },
      { type: "p", text: "We may share information with:" },
      {
        type: "ul",
        items: [
          "Payment processors",
          "Customer support providers",
          "IT and cloud hosting services",
          "Security and fraud prevention providers",
        ],
      },
      { type: "h", text: "Government Authorities" },
      {
        type: "p",
        text: "Where required by law, regulation, court order, or law enforcement requests.",
      },
    ],
  },
  {
    title: "Cookies",
    blocks: [
      { type: "p", text: "We use cookies to:" },
      {
        type: "ul",
        items: [
          "Remember your preferences.",
          "Improve website performance.",
          "Analyze website traffic.",
          "Enhance user experience.",
        ],
      },
      {
        type: "p",
        text: "You can disable cookies through your browser settings.",
      },
    ],
  },
  {
    title: "Data Security",
    blocks: [
      {
        type: "p",
        text: "We implement appropriate technical and organizational measures to safeguard your information against:",
      },
      {
        type: "ul",
        items: [
          "Unauthorized access",
          "Loss or theft",
          "Misuse",
          "Alteration",
          "Disclosure",
        ],
      },
      {
        type: "p",
        text: "However, no online platform can guarantee absolute security.",
      },
    ],
  },
  {
    title: "Your Rights",
    blocks: [
      { type: "p", text: "You may:" },
      {
        type: "ul",
        items: [
          "Request access to your data.",
          "Request correction of inaccurate data.",
          "Request deletion of personal data.",
          "Withdraw marketing consent.",
          "Request restriction of processing.",
          "Lodge a complaint regarding privacy concerns.",
        ],
      },
    ],
  },
  {
    title: "Data Retention",
    blocks: [
      {
        type: "p",
        text: "We retain your information only for as long as necessary to:",
      },
      {
        type: "ul",
        items: [
          "Complete bookings.",
          "Resolve disputes.",
          "Meet legal and tax obligations.",
          "Prevent fraud and misuse.",
        ],
      },
    ],
  },
  {
    title: "Contact Us",
    blocks: [
      {
        type: "contact",
        email: "privacy@dominiumbnb.co.ke",
        phone: "[Insert Number]",
        address: "[Insert Address]",
      },
    ],
  },
];

function renderList(items: ListItem[]) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-6 text-gray-600 marker:text-gray-400">
      {items.map((item) =>
        typeof item === "string" ? (
          <li key={item}>{item}</li>
        ) : (
          <li key={item.text}>
            {item.text}
            <ul className="mt-1.5 list-[circle] space-y-1.5 pl-6">
              {item.sub.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </li>
        )
      )}
    </ul>
  );
}

function renderBlock(block: Block, i: number) {
  switch (block.type) {
    case "p":
      return (
        <p key={i} className="mt-3 leading-relaxed text-gray-600">
          {block.text}
        </p>
      );
    case "h":
      return (
        <h3 key={i} className="mt-6 font-semibold text-gray-900">
          {block.text}
        </h3>
      );
    case "ul":
      return <div key={i}>{renderList(block.items)}</div>;
    case "contact":
      return (
        <dl
          key={i}
          className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 text-sm"
        >
          <div className="flex gap-4 px-4 py-3">
            <dt className="w-20 shrink-0 font-medium text-gray-900">Email</dt>
            <dd>
              <a
                href={`mailto:${block.email}`}
                className="text-gray-700 underline underline-offset-2 hover:text-gray-900"
              >
                {block.email}
              </a>
            </dd>
          </div>
          <div className="flex gap-4 px-4 py-3">
            <dt className="w-20 shrink-0 font-medium text-gray-900">Phone</dt>
            <dd className="text-gray-600">{block.phone}</dd>
          </div>
          <div className="flex gap-4 px-4 py-3">
            <dt className="w-20 shrink-0 font-medium text-gray-900">Address</dt>
            <dd className="text-gray-600">{block.address}</dd>
          </div>
        </dl>
      );
  }
}

export default function GuestPrivacyPolicy() {
  return (
    <main className="bg-white text-gray-900">
        <Navbar />
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Legal
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Guest Privacy Policy
          </h1>
          <p className="mt-3 text-gray-600">
            Dominium BnB &middot; For guests (customers)
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl gap-12 px-6 py-12 lg:grid lg:grid-cols-[14rem_1fr]">
        {/* Table of contents */}
        <nav aria-label="Contents" className="hidden lg:block">
          <div className="sticky top-8">
            <p className="text-sm font-semibold text-gray-900">Contents</p>
            <ol className="mt-4 space-y-2 text-sm text-gray-600">
              {sections.map((s, i) => (
                <li key={s.title}>
                  <a
                    href={`#section-${i + 1}`}
                    className="hover:text-gray-900 hover:underline"
                  >
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        {/* Content */}
        <article className="max-w-3xl">
          {sections.map((s, i) => (
            <section
              key={s.title}
              id={`section-${i + 1}`}
              className="scroll-mt-8 border-b border-gray-200 py-8 first:pt-0"
            >
              <h2 className="text-xl font-semibold">
                {i + 1}. {s.title}
              </h2>
              {s.blocks.map(renderBlock)}
            </section>
          ))}

          <p className="pt-8 font-medium">
            By using Dominium BnB, you agree to this Guest Privacy Policy.
          </p>
        </article>
      </div>
      
    </main>
  );
}