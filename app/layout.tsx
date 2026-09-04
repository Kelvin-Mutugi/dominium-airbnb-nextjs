import type { Metadata } from "next";
import { anton, poppins } from "./fonts";
import "./globals.css";

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
      <body className="font-sans">{children}</body>
    </html>
  );
}