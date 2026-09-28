import { AdminNewListingForm } from "@/components/admin/listings/admin-new-listing-form";

export default async function AdminNewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ hostId?: string | string[] }>;
}) {
  const { hostId } = await searchParams;
  const initialHostId = typeof hostId === "string" ? hostId : "";

  return (
    <AdminNewListingForm initialHostId={initialHostId} />
  );
}
