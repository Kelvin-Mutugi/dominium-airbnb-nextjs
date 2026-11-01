import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/navigationBar";
import { SalePropertyCard } from "@/components/sales/SalePropertyCard";
import { SaleComparison } from "@/components/sales/SaleComparison";
import { getSharedSaleShortlist } from "@/app/lib/sale-properties";

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

type Props = { params: Promise<{ token: string }> };

async function loadShortlist(params: Props["params"]) {
  const { token } = await params;
  if (!TOKEN.test(token)) return null;
  return getSharedSaleShortlist(token);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shortlist = await loadShortlist(params);
  if (!shortlist) {
    return {
      title: "Shared property shortlist | Dominium",
      robots: { index: false, follow: false },
    };
  }
  const count = shortlist.properties.length;
  const firstProperty = shortlist.properties[0];
  const image = firstProperty?.sale_property_images.find((item) => item.is_cover)
    ?? firstProperty?.sale_property_images[0];
  const title = `Shared shortlist: ${count} ${count === 1 ? "property" : "properties"} | Dominium`;
  const description = "Compare a family shortlist of properties for sale on Dominium.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image.url, alt: image.alt_text || firstProperty?.title || title }] : [],
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image.url] : [],
    },
  };
}

export default async function SharedShortlistPage({ params }: Props) {
  const shortlist = await loadShortlist(params);
  if (!shortlist) notFound();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#FAF9F7] px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9C2454]">Shared with you</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1B1A2E] sm:text-3xl">A family property shortlist</h1>
              <p className="mt-2 text-sm leading-6 text-[#5F5D69]">
                {shortlist.properties.length
                  ? `${shortlist.properties.length} ${shortlist.properties.length === 1 ? "property" : "properties"} to review together.`
                  : "The properties in this shortlist are no longer available."}
                {" "}You can view and compare these properties, but you can&apos;t change the original shortlist. Seller contact details aren&apos;t shared here.
              </p>
            </div>
            <Link href="/for-sale" className="min-h-10 rounded-lg bg-[#9C2454] px-4 py-2.5 text-sm font-semibold text-white">
              Browse properties
            </Link>
          </header>

          {shortlist.properties.length ? (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shortlist.properties.map((property) => (
                  <SalePropertyCard key={property.id} property={property} />
                ))}
              </div>
              <SaleComparison properties={shortlist.properties} />
            </>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-[#D9D5CF] bg-white px-5 py-12 text-center">
              <h2 className="text-lg font-semibold text-[#1B1A2E]">No available properties in this shortlist</h2>
              <p className="mt-2 text-sm text-[#6B6A78]">You can browse the latest listings on Dominium.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
