// app/host/listings/new/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewListingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/host/listings");
  }, [router]);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
      Listing creation is currently managed by the admin team. Hosts can only view their listings during this verification phase.
    </div>
  );
}
