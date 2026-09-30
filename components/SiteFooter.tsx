"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/footer";

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <Footer />;
}
