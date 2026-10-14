import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// One family for the whole site: its width axis gives the condensed station and trip names (font-stretch).
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Tripboard",
  description: "Plan a whole trip in one place: a day-by-day itinerary with a map.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
