"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/footer";

export default function SiteFooter() {
  const pathname = usePathname();
  const hideOnStandaloneScreens = [
    "/signin",
    "/signup",
    "/complete-profile",
    "/check-email",
    "/forgot-password",
    "/reset-password",
  ].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (pathname === "/admin" || pathname.startsWith("/admin/") || hideOnStandaloneScreens) return null;
  return <Footer />;
}
