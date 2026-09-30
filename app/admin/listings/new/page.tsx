import { AdminNewListingForm } from "@/components/admin/listings/admin-new-listing-form";

export default async function AdminNewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ hostId?: string | string[]; requestId?: string | string[] }>;
}) {
  const { hostId, requestId } = await searchParams;
  const initialHostId = typeof hostId === "string" ? hostId : "";
  const intakeRequestId = typeof requestId === "string" ? requestId : null;

  return (
    <AdminNewListingForm initialHostId={initialHostId} intakeRequestId={intakeRequestId} />
  );
}
