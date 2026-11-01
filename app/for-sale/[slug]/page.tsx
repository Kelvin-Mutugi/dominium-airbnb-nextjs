import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpDown,
  BatteryCharging,
  BellRing,
  Camera,
  CarFront,
  CircleCheck,
  Droplets,
  Dumbbell,
  PanelsTopLeft,
  ShieldCheck,
  Sofa,
  Wifi,
  Waves,
  type LucideIcon,
} from "lucide-react";
import Navbar from "@/components/navigationBar";
import { SaleInquiryForm } from "@/components/sales/SaleInquiryForm";
import { SalePropertyGallery } from "@/components/sales/SalePropertyGallery";
import { SalePropertyCard } from "@/components/sales/SalePropertyCard";
import { SaleShareButton } from "@/components/sales/SaleShareButton";
import { SaleShortlistButton } from "@/components/sales/SaleShortlistButton";
import { PropertyEventTracker } from "@/components/sales/PropertyEventTracker";
import {
  getCachedPublicSaleProperty,
  getSaleRecommendationAffinityIds,
  getSimilarSaleProperties,
} from "@/app/lib/sale-properties";
import { normalizeSaleAmountToMonthly } from "@/app/lib/sale-marketplace";
import { createClient } from "@/app/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const amountPeriodLabel = (period: "monthly" | "annual") => period === "annual" ? "year" : "month";

const featureIcons: Record<string, LucideIcon> = {
  Borehole: Droplets,
  "Backup power": BatteryCharging,
  Balcony: PanelsTopLeft,
  "Swimming pool": Waves,
  Gym: Dumbbell,
  Lift: ArrowUpDown,
  CCTV: Camera,
  "Gated community": ShieldCheck,
  "Fibre internet": Wifi,
  Serviced: BellRing,
  Furnished: Sofa,
  Parking: CarFront,
};

function price(value: number | string) {
  return `KES ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export default async function SalePropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getCachedPublicSaleProperty(slug);
  if (!property) notFound();

  const cookieStore = await cookies();
  const consented = cookieStore.get("dominium_cookie_consent")?.value === "v1.accepted";
  const storedSessionId = consented ? cookieStore.get("dominium_sale_session")?.value : undefined;
  const sessionId = storedSessionId && UUID.test(storedSessionId) ? storedSessionId : null;
  let userId: string | null = null;
  try {
    const session = await createClient();
    const { data, error } = await session.auth.getUser();
    if (error) console.warn("Unable to load signed-in recommendation context:", error.message);
    userId = data.user?.id ?? null;
  } catch (error) {
    console.warn("Unable to read optional recommendation user context:", error);
  }
  const affinityIds = await getSaleRecommendationAffinityIds(property.id, sessionId, userId);
  const similarProperties = await getSimilarSaleProperties(property, affinityIds);
  const serviceChargeMonthly = property.service_charge === null
    ? null
    : normalizeSaleAmountToMonthly(property.service_charge, property.service_charge_period);
  const landRatesMonthly = property.land_rates === null
    ? null
    : normalizeSaleAmountToMonthly(property.land_rates, property.land_rates_period);

  const orderedImages = [
    ...property.sale_property_images.filter((image) => image.is_cover),
    ...property.sale_property_images.filter((image) => !image.is_cover),
  ];

  return (
    <>
      <Navbar />
      <PropertyEventTracker propertyId={property.id} />
      <main className="min-h-screen bg-[#FAF9F7] px-4 py-6 pb-28 sm:px-8 sm:py-10 lg:pb-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/for-sale" className="text-sm font-medium text-[#9C2454] hover:underline">← Back to properties for sale</Link>
            <Link href="/shortlist" className="text-sm font-semibold text-[#9C2454] hover:underline">My shortlist</Link>
          </div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <article className="min-w-0">
              <div className="mb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {/* <p className="text-sm font-semibold capitalize text-[#9C2454]">{property.property_type} for sale</p> */}
                    <h1 className="mt-1 text-2xl font-semibold text-[#1B1A2E] sm:text-3xl">{property.title}</h1>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <SaleShortlistButton propertyId={property.id} iconOnly />
                    <SaleShareButton
                      title={property.title}
                      url={`/for-sale/${property.slug}`}
                      iconOnly
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm text-[#6B6A78]">
                  {[property.neighborhood, property.town, property.county].filter(Boolean).join(", ")}
                </p>
                <p className="mt-3 text-2xl font-semibold text-[#9C2454]">{price(property.asking_price)}</p>
                {property.is_verified && (
                  <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Verified listing</span>
                )}
              </div>

              <SalePropertyGallery images={orderedImages} propertyTitle={property.title} />

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {property.property_type !== "land" && property.property_type !== "commercial" && (
                  <>
                    <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Bedrooms</p><p className="mt-1 font-semibold text-[#1B1A2E]">{property.bedrooms}</p></div>
                    <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Bathrooms</p><p className="mt-1 font-semibold text-[#1B1A2E]">{property.bathrooms}</p></div>
                  </>
                )}
                {property.size_sqm && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Floor area</p><p className="mt-1 font-semibold text-[#1B1A2E]">{Number(property.size_sqm).toLocaleString()} m²</p></div>}
                {property.property_type !== "land" && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Parking</p><p className="mt-1 font-semibold text-[#1B1A2E]">{property.parking_spaces}</p></div>}
                {property.plot_size_acres && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Plot size</p><p className="mt-1 font-semibold text-[#1B1A2E]">{Number(property.plot_size_acres).toLocaleString()} acres</p></div>}
                {property.title_type && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Title type</p><p className="mt-1 font-semibold capitalize text-[#1B1A2E]">{property.title_type}</p></div>}
                {property.title_deed_status && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Title deed</p><p className="mt-1 font-semibold text-[#1B1A2E]">{property.title_deed_status}</p></div>}
                {property.furnished_status && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Furnishing</p><p className="mt-1 font-semibold capitalize text-[#1B1A2E]">{property.furnished_status}</p></div>}
                {property.occupancy && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Occupancy</p><p className="mt-1 font-semibold capitalize text-[#1B1A2E]">{property.occupancy.replaceAll("_", " ")}</p></div>}
                {property.completion_status && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Completion</p><p className="mt-1 font-semibold capitalize text-[#1B1A2E]">{property.completion_status.replaceAll("_", " ")}</p></div>}
                {property.year_built && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Year built</p><p className="mt-1 font-semibold text-[#1B1A2E]">{property.year_built}</p></div>}
                {property.floor_level != null && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Floor level</p><p className="mt-1 font-semibold text-[#1B1A2E]">{property.floor_level}</p></div>}
                {property.service_charge != null && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Service charge</p><p className="mt-1 font-semibold text-[#1B1A2E]">{price(property.service_charge)} / {amountPeriodLabel(property.service_charge_period)}</p>{property.service_charge_period === "annual" && serviceChargeMonthly !== null && <p className="mt-1 text-xs text-[#777582]">{price(serviceChargeMonthly)} monthly equivalent</p>}</div>}
                {property.land_rates != null && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Land rates</p><p className="mt-1 font-semibold text-[#1B1A2E]">{price(property.land_rates)} / {amountPeriodLabel(property.land_rates_period)}</p>{property.land_rates_period === "annual" && landRatesMonthly !== null && <p className="mt-1 text-xs text-[#777582]">{price(landRatesMonthly)} monthly equivalent</p>}</div>}
                {property.zoning && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Zoning</p><p className="mt-1 font-semibold text-[#1B1A2E]">{property.zoning}</p></div>}
                {property.road_access && <div className="rounded-lg border border-[#E6E2DC] bg-white p-3"><p className="text-xs text-[#777582]">Road access</p><p className="mt-1 font-semibold text-[#1B1A2E]">{property.road_access}</p></div>}
              </div>
              <a
                href={property.show_exact_location && property.lat !== null && property.lng !== null
                  ? `https://www.openstreetmap.org/?mlat=${property.lat}&mlon=${property.lng}#map=16/${property.lat}/${property.lng}`
                  : `https://www.openstreetmap.org/search?query=${encodeURIComponent([property.neighborhood, property.town, property.county].filter(Boolean).join(", "))}`}
                target="_blank"
                rel="noreferrer"
                data-property-event="map_click"
                className="mt-4 inline-flex text-sm font-semibold text-[#9C2454] underline"
              >
                View area on map
              </a>

              <section className="mt-7 rounded-xl border border-[#E6E2DC] bg-white p-5">
                <h2 className="text-lg font-semibold text-[#1B1A2E]">About this property</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#4B4A5A]">{property.description}</p>
                {property.amenities.length > 0 && (
                  <>
                    <h3 className="mt-6 font-semibold text-[#1B1A2E]">Features</h3>
                    <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
                      {property.amenities.map((amenity) => {
                        const Icon = featureIcons[amenity] ?? CircleCheck;
                        return (
                          <li key={amenity} className="flex items-center gap-3 border-b border-[#EEEAE5] py-3 text-sm font-medium text-[#383746]">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F6EAF0] text-[#9C2454]">
                              <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                            </span>
                            {amenity}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </section>
            </article>
            <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
              <SaleInquiryForm propertyId={property.id} propertyTitle={property.title} />
            </aside>
          </div>
          {similarProperties.length > 0 && (
            <section className="mt-12">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold text-[#1B1A2E]">Similar properties</h2>
                  <p className="mt-1 text-sm text-[#6B6A78]">Explore more homes and land you may like.</p>
                </div>
                <Link href="/for-sale" className="text-sm font-semibold text-[#9C2454] hover:underline">
                  Browse all properties
                </Link>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {similarProperties.map((similar) => (
                  <SalePropertyCard key={similar.id} property={similar} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <SaleInquiryForm
        variant="mobile-sheet"
        propertyId={property.id}
        propertyTitle={property.title}
        askingPrice={price(property.asking_price)}
      />
    </>
  );
}
