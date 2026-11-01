import type { Metadata } from "next";
import Navbar from "@/components/navigationBar";
import { SaleShortlistWorkspace } from "@/components/sales/SaleShortlistWorkspace";

export const metadata: Metadata = {
  title: "My property shortlist | Dominium",
  description: "Save properties without signing up, compare the details that differ, and share your shortlist with family.",
  robots: { index: false, follow: false },
};

export default function ShortlistPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#FAF9F7]">
        <SaleShortlistWorkspace />
      </main>
    </>
  );
}
