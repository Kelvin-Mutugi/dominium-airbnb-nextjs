import Navbar from "@/components/navigationBar";

type ListItem = string | { text: string; sub: string[] };

type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "ul"; items: ListItem[] }
  | { type: "contact"; email: string; phone: string; address: string };

type Section = { title: string; blocks: Block[] };

const effectiveDate = "[Insert Date]";

const sections: Section[] = [
  {
    title: "Introduction",
    blocks: [
      {
        type: "p",
        text: 'This Privacy Policy explains how Dominium BnB collects, processes, and protects information provided by property owners, managers, and accommodation providers ("Hosts") who list their properties on our platform.',
      },
      {
        type: "p",
        text: "By listing a property or registering as a Host, you consent to the practices described in this Policy.",
      },
    ],
  },
  {
    title: "Information We Collect",
    blocks: [
      {
        type: "p",
        text: "To onboard and manage Host accounts, we may collect:",
      },
      { type: "h", text: "Personal Information" },
      {
        type: "ul",
        items: [
          "Full Name",
          "National ID or Passport",
          "KRA PIN Certificate",
          "Email Address",
          "Phone Number",
          "Physical Address",
        ],
      },
      { type: "h", text: "Banking Information" },
      {
        type: "ul",
        items: [
          "Bank Account Name",
          "Bank Account Number",
          "Branch Details",
          "Mobile Money Payment Details",
        ],
      },
      { type: "h", text: "Property Information" },
      {
        type: "ul",
        items: [
          "Property Name",
          "Property Address",
          "GPS Location",
          "Photos and Videos",
          "Pricing Information",
          "Property Amenities",
          "Availability Calendar",
          "House Rules",
        ],
      },
      { type: "h", text: "Business Information" },
      { type: "p", text: "Where applicable:" },
      {
        type: "ul",
        items: [
          "Business Registration Certificate",
          "Tax Compliance Certificate",
          "Property Management Agreements",
        ],
      },
    ],
  },
  {
    title: "How We Use Your Information",
    blocks: [
      { type: "p", text: "We use Host information to:" },
      {
        type: "ul",
        items: [
          "Create and manage Host accounts.",
          "Verify ownership or authority to list properties.",
          "Advertise properties through the Dominium BnB platform.",
          "Match Hosts with potential guests.",
          "Process guest bookings.",
          "Issue payments to Hosts.",
          "Manage disputes and complaints.",
          "Conduct business analytics.",
          "Meet legal and tax obligations.",
        ],
      },
    ],
  },
  {
    title: "Payment and Commission Structure",
    blocks: [
      {
        type: "p",
        text: "Dominium BnB acts as a booking and marketing intermediary.",
      },
      { type: "p", text: "When a guest books a property:" },
      {
        type: "ul",
        items: [
          "Payment is collected by Dominium BnB.",
          {
            text: "Dominium BnB deducts:",
            sub: [
              "Agreed commission;",
              "Marketing fees (where applicable);",
              "Payment processing costs.",
            ],
          },
          "The remaining balance is remitted to the Host according to agreed payment timelines.",
        ],
      },
      {
        type: "p",
        text: "By listing on the platform, Hosts acknowledge and agree to this payment structure.",
      },
    ],
  },
  {
    title: "Property Advertising",
    blocks: [
      { type: "p", text: "Hosts authorize Dominium BnB to:" },
      {
        type: "ul",
        items: [
          "Display property photographs.",
          "Publish pricing information.",
          "Promote listings on the website.",
          "Advertise listings on social media platforms.",
          "Use listing information for marketing campaigns.",
        ],
      },
      {
        type: "p",
        text: "Ownership of the property remains with the Host.",
      },
    ],
  },
  {
    title: "Information Sharing",
    blocks: [
      { type: "p", text: "We may share Host information with:" },
      { type: "h", text: "Guests" },
      { type: "p", text: "Where necessary, guests may receive:" },
      {
        type: "ul",
        items: [
          "Property information",
          "Contact details after booking confirmation",
          "Check-in instructions",
        ],
      },
      { type: "h", text: "Service Providers" },
      {
        type: "ul",
        items: [
          "Payment processors",
          "IT hosting providers",
          "Customer support partners",
          "Marketing service providers",
          "Professional advisers",
        ],
      },
      { type: "h", text: "Regulatory Authorities" },
      {
        type: "p",
        text: "When disclosure is required by Kenyan law or lawful government requests.",
      },
    ],
  },
  {
    title: "Data Security",
    blocks: [
      {
        type: "p",
        text: "Dominium BnB maintains reasonable safeguards to protect Host information, including:",
      },
      {
        type: "ul",
        items: [
          "Secure servers",
          "Restricted access controls",
          "Encrypted payment systems",
          "Monitoring and security procedures",
        ],
      },
    ],
  },
  {
    title: "Host Rights",
    blocks: [
      { type: "p", text: "Hosts may request:" },
      {
        type: "ul",
        items: [
          "Access to their personal data.",
          "Correction of inaccurate records.",
          "Deletion of data where legally permissible.",
          "Restriction of specific processing activities.",
          "Withdrawal from marketing communications.",
        ],
      },
    ],
  },
  {
    title: "Retention of Information",
    blocks: [
      { type: "p", text: "Host information may be retained to:" },
      {
        type: "ul",
        items: [
          "Manage ongoing bookings.",
          "Meet tax and accounting obligations.",
          "Resolve disputes.",
          "Comply with legal requirements.",
        ],
      },
    ],
  },
  {
    title: "Changes to this Policy",
    blocks: [
      {
        type: "p",
        text: "We may update this Privacy Policy from time to time. Updated versions will be posted on the Dominium BnB website and become effective immediately upon publication.",
      },
    ],
  },
  {
    title: "Contact Details",
    blocks: [
      {
        type: "contact",
        email: "hosts@dominiumbnb.co.ke",
        phone: "[Insert Number]",
        address: "[Insert Address], Nairobi, Kenya",
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

export default function HostPrivacyPolicy() {
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
            Host Privacy Policy
          </h1>
          <p className="mt-3 text-gray-600">
            Dominium BnB &middot; For property owners, managers and
            accommodation providers
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Effective Date: {effectiveDate}
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
            By listing a property with Dominium BnB, you acknowledge that you
            have read, understood, and accepted this Host Privacy Policy.
          </p>
        </article>
      </div>
    </main>
  );
}