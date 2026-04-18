import type { Metadata } from "next";
import { DM_Serif_Display, DM_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/LayoutShell";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "Cogsly — Manajemen F&B",
  description: "Point of Sale & Manajemen Inventori Cerdas untuk Bisnis F&B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full">
      <body className={`${instrumentSans.variable} ${dmSerif.variable} ${dmMono.variable} min-h-full flex flex-col font-sans`}>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}