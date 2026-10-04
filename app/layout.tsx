import type { Metadata } from "next";
import { anton, fraunces, plex } from "./fonts";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Dominium Airbnb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${fraunces.variable} ${plex.variable}`}
    >
      <body className="flex min-h-screen flex-col font-sans">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}