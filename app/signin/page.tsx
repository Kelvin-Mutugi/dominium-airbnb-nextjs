import React, { Suspense } from "react";
import SigninClient from "@/components/SigninClient";

export default function SigninPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <SigninClient />
    </Suspense>
  );
}
