import Link from "next/link";

export default function CollectionFeeReconciliationPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-[#E23E85]">
        Collection fees are recorded during payout processing
      </h1>
      <p className="max-w-3xl text-sm leading-6 text-gray-600">
        Per-payment collection-fee reconciliation has been retired. Open a host
        payout request and enter the aggregate STK collection fee for that
        request before sending its B2C transfer.
      </p>
      <Link
        href="/admin/payouts/requests"
        className="inline-flex rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white"
      >
        Open host payout requests
      </Link>
    </div>
  );
}