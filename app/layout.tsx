import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import PlausibleProvider from "next-plausible";
import "./globals.css";
import { seoKeywords, siteUrl } from "@/lib/seo";

const fontSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const fontSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Coordinate Distance Calculator",
    template: "%s | Coordinate Distance Calculator"
  },
  description:
    "Calculate distance between two coordinates with map and globe visualization, multiple algorithms, units, midpoint, and bearing.",
  keywords: seoKeywords,
  icons: {
    icon: "/icon.svg"
  },
  manifest: "/manifest.webmanifest"
};

export const viewport = {
  themeColor: "#2c3e50",
};

const plausibleDomain =
  process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "coordinatedistance.lukasdzenk.com";
const plausibleScriptUrl =
  process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL ?? "https://plausible-1.matcha-squad.xyz";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === "production";

  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontSerif.variable}`}>
        {isProduction && (
          <PlausibleProvider
            domain={plausibleDomain}
            selfHosted
            customDomain={plausibleScriptUrl}
            trackOutboundLinks
            trackLocalhost={false}
          />
        )}
        {children}
      </body>
    </html>
  );
}
