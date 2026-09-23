// app/host/payouts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getHostPayoutsData } from "@/app/lib/host/actions";
import type { Payout } from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";

export default function HostPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setPayouts(await getHostPayoutsData());
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-gray-500">Loading payouts…</p>;

  const owed = payouts.filter((p) => p.status === "owed").reduce((sum, p) => sum + Number(p.amount), 0);
  const paid = payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#12231d]">Payouts</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Owed to you</p>
          <p className="mt-1 text-2xl font-bold text-[#ec1561]">KES {owed.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Paid out so far</p>
          <p className="mt-1 text-2xl font-bold text-[#12231d]">KES {paid.toLocaleString()}</p>
        </div>
      </div>

      {payouts.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">
          Payouts will appear here after your first completed booking.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Stay dates</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Paid on</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    {p.booking?.check_in} → {p.booking?.check_out}
                  </td>
                  <td className="px-4 py-3 font-medium">KES {Number(p.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
