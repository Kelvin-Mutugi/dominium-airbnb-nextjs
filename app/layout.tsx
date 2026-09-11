import type { Metadata } from "next";
import { anton, poppins } from "./fonts";
import "./globals.css";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Dominium Airbnb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${anton.variable} ${poppins.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}