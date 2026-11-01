import { notFound } from "next/navigation";
import { SalePropertyForm } from "@/components/sales/SalePropertyForm";
import { getSaleLocationOptions } from "@/app/lib/sale-properties";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import type { SalePropertyImage } from "@/app/lib/sale-properties";

export default async function EditSalePropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { data, error } = await getSupabaseAdmin()
    .from("sale_properties")
    .select(
      `id, title, description, property_type, asking_price, county, town,
       neighborhood, location_id, lat, lng, show_exact_location,
       bedrooms, bathrooms, size_sqm, parking_spaces, amenities, title_type,
       title_deed_status, service_charge, service_charge_period, land_rates, land_rates_period, furnished_status, occupancy,
       completion_status, year_built, floor_level, plot_size_acres, zoning,
       road_access, price_negotiable, reason_for_selling, mandate_type,
       mandate_expiry, commission_terms, open_to_short_stay_management,
       sold_price, owner_id_seen, title_copy_seen, site_visit_done, is_verified,
       owner_name, owner_email, owner_phone, status,
       sale_property_images ( id, storage_path, position, sort_order, room_tag, is_cover, alt_text, width, height )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Unable to load the property listing.");
  if (!data) notFound();

  const locations = await getSaleLocationOptions();
  const storage = getSupabaseAdmin().storage.from("sale-property-images");
  const images = [...(data.sale_property_images ?? [])]
    .sort((first, second) => first.sort_order - second.sort_order)
    .map((image) => ({
      ...image,
      url: storage.getPublicUrl(image.storage_path).data.publicUrl,
    })) as SalePropertyImage[];

  return (
    <SalePropertyForm
      propertyId={data.id}
      initialValues={{
        title: data.title,
        description: data.description,
        property_type: data.property_type,
        asking_price: Number(data.asking_price),
        county: data.county,
        town: data.town,
        neighborhood: data.neighborhood ?? "",
        location_id: data.location_id,
        lat: data.lat == null ? null : Number(data.lat),
        lng: data.lng == null ? null : Number(data.lng),
        show_exact_location: data.show_exact_location,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        size_sqm: data.size_sqm == null ? null : Number(data.size_sqm),
        parking_spaces: data.parking_spaces,
        amenities: data.amenities ?? [],
        title_type: data.title_type,
        title_deed_status: data.title_deed_status,
        service_charge: data.service_charge == null ? null : Number(data.service_charge),
        service_charge_period: data.service_charge_period,
        land_rates: data.land_rates == null ? null : Number(data.land_rates),
        land_rates_period: data.land_rates_period,
        furnished_status: data.furnished_status,
        occupancy: data.occupancy,
        completion_status: data.completion_status,
        year_built: data.year_built,
        floor_level: data.floor_level,
        plot_size_acres: data.plot_size_acres == null ? null : Number(data.plot_size_acres),
        zoning: data.zoning,
        road_access: data.road_access,
        price_negotiable: data.price_negotiable,
        reason_for_selling: data.reason_for_selling,
        mandate_type: data.mandate_type,
        mandate_expiry: data.mandate_expiry,
        commission_terms: data.commission_terms,
        open_to_short_stay_management: data.open_to_short_stay_management,
        sold_price: data.sold_price == null ? null : Number(data.sold_price),
        owner_id_seen: data.owner_id_seen,
        title_copy_seen: data.title_copy_seen,
        site_visit_done: data.site_visit_done,
        is_verified: data.is_verified,
        owner_name: data.owner_name,
        owner_email: data.owner_email ?? "",
        owner_phone: data.owner_phone ?? "",
        status: data.status,
      }}
      images={images}
      locations={locations}
    />
  );
}
