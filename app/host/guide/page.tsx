import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

const SECTIONS = [
  { id: "getting-started", label: "Getting started" },
  { id: "listings", label: "Listings" },
  { id: "bookings", label: "Bookings" },
  { id: "calendar", label: "Calendar sync" },
  { id: "payouts", label: "Payouts" },
  { id: "reviews-support", label: "Reviews and support" },
];

function GuideLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#b30f4b] underline decoration-[#b30f4b]/30 underline-offset-4 hover:decoration-[#b30f4b]">
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

export default function HostGuidePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="border-b border-[#d8d5ce] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b30f4b]">Host resources</p>
        <h1 className="mt-2 text-3xl font-bold text-[#12231d]">Host guide</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          Practical steps for setting up a listing, managing stays, keeping calendars aligned, and tracking payouts.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">
        <article className="min-w-0 divide-y divide-[#d8d5ce]">
          <section id="getting-started" className="scroll-mt-8 py-7 first:pt-0">
            <h2 className="text-xl font-semibold text-[#12231d]">Getting started</h2>
            <ol className="mt-4 space-y-4">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#12231d] text-xs font-semibold text-white">1</span>
                <div>
                  <h3 className="font-medium text-[#12231d]">Complete host verification</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">Submit your identity and payout details. If the review team requests changes, update the application and resubmit it.</p>
                  <GuideLink href="/host/onboarding">Host verification</GuideLink>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#12231d] text-xs font-semibold text-white">2</span>
                <div>
                  <h3 className="font-medium text-[#12231d]">Create a draft listing</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">Add the property details and nightly price. You can save first, then return to add photos and finish the listing.</p>
                  <GuideLink href="/host/listings/new">Create a listing</GuideLink>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#12231d] text-xs font-semibold text-white">3</span>
                <div>
                  <h3 className="font-medium text-[#12231d]">Publish when it is ready</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">Publishing requires a nightly price and a description of at least 40 characters. Check availability before accepting bookings.</p>
                  <GuideLink href="/host/listings">Manage listings</GuideLink>
                </div>
              </li>
            </ol>
          </section>

          <section id="listings" className="scroll-mt-8 py-7">
            <h2 className="text-xl font-semibold text-[#12231d]">Listings</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-gray-600">
              <p>Use the listings page to filter drafts and published properties, edit details, and change publication status. A draft is not bookable until published.</p>
              <p>Keep the nightly price, guest capacity, house rules, and availability accurate. Update a listing whenever those details change.</p>
            </div>
            <div className="mt-4"><GuideLink href="/host/listings">Open listings</GuideLink></div>
          </section>

          <section id="bookings" className="scroll-mt-8 py-7">
            <h2 className="text-xl font-semibold text-[#12231d]">Bookings</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-gray-600">
              <p>Review the dates, guest count, contact details, and any special requests before responding to a pending request. Confirm or decline it from the booking record.</p>
              <p>After a confirmed stay has ended, mark it completed from the bookings page. This records the completed stay and makes its payout appear in your payout history.</p>
              <p>Use <span className="font-medium text-[#12231d]">Report a stay issue</span> on the booking when you need support about a specific reservation.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <GuideLink href="/host/bookings">Manage bookings</GuideLink>
              <GuideLink href="/account/support?category=host_guest_concern">Report a guest or stay issue</GuideLink>
            </div>
          </section>

          <section id="calendar" className="scroll-mt-8 py-7">
            <h2 className="text-xl font-semibold text-[#12231d]">Calendar sync</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-gray-600">
              <p>Connect an iCal feed for each listing to import outside reservations, or generate a private Dominium calendar link to share with another booking platform. Imported busy dates are shown separately from Dominium bookings.</p>
              <p>Connected feeds sync when added, when you request a manual sync, and on a scheduled cycle about every 30 minutes. Other platforms also control how often they refresh a subscribed Dominium link, so updates are not instant.</p>
              <p>Check all calendars before confirming an outside reservation. If a sync reveals an overlap with a Dominium booking, the calendar flags it for review. You can block dates manually when a platform has no compatible calendar feed.</p>
              <p className="font-medium text-[#12231d]">Treat a private calendar link like a password. Regenerating it immediately disables the previous link.</p>
            </div>
            <div className="mt-4"><GuideLink href="/host/calendar">Open host calendar</GuideLink></div>
          </section>

          <section id="payouts" className="scroll-mt-8 py-7">
            <h2 className="text-xl font-semibold text-[#12231d]">Payouts</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-gray-600">
              <p>Completed stays appear in payout history. Each record shows the host amount and its current status: owed, processing, or paid.</p>
              <p>Open a payout record to view its linked booking and listing details. If a payout looks incorrect or remains unresolved, contact support with the related booking.</p>
            </div>
            <div className="mt-4"><GuideLink href="/host/payouts">View payouts</GuideLink></div>
          </section>

          <section id="reviews-support" className="scroll-mt-8 py-7">
            <h2 className="text-xl font-semibold text-[#12231d]">Reviews and support</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-gray-600">
              <p>Host reviews are tied to completed stays and checked before they are published. The reviews page shows their moderation status and your published average.</p>
              <p>For help, open a support request and choose the closest category. Include the related booking when your question concerns a stay, payment, or guest issue.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <GuideLink href="/host/reviews">Read host reviews</GuideLink>
              <GuideLink href="/account/support">Contact support</GuideLink>
              <GuideLink href="/host-listing-agreement-and-terms-of-service">Host agreement and terms</GuideLink>
            </div>
          </section>
        </article>

        <aside className="hidden lg:block">
          <nav aria-label="Host guide sections" className="sticky top-8 border-l border-[#d8d5ce] pl-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">On this page</h2>
            <ul className="space-y-2.5">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-sm text-gray-600 hover:text-[#b30f4b]">{section.label}</a>
                </li>
              ))}
            </ul>
            <Link href="/host" className="mt-6 inline-flex items-center gap-2 border-t border-[#d8d5ce] pt-4 text-sm font-semibold text-[#12231d] hover:text-[#b30f4b]">
              Back to dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        </aside>
      </div>
    </div>
  );
}