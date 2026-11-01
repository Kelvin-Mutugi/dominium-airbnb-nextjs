import { SalePropertyForm } from "@/components/sales/SalePropertyForm";
import { getSaleLocationOptions } from "@/app/lib/sale-properties";

export default async function NewSalePropertyPage() {
  const locations = await getSaleLocationOptions();
  return <SalePropertyForm locations={locations} />;
}
