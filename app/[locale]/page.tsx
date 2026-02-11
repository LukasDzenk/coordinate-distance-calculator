import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CoordinateTool } from "@/components/CoordinateTool";
import { getDictionary } from "@/lib/i18n";
import { Locale, isLocale, locales } from "@/lib/locales";
import { faqItems, seoKeywords, siteUrl } from "@/lib/seo";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareBar } from "@/components/ShareBar";

function getLocaleData(rawLocale: string): { locale: Locale; dict: ReturnType<typeof getDictionary> } {
  if (!isLocale(rawLocale)) {
    notFound();
  }
  return { locale: rawLocale, dict: getDictionary(rawLocale) };
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const localeData = getLocaleData(locale);
  const { locale: resolvedLocale, dict } = localeData;

  const canonicalUrl = `${siteUrl}/${resolvedLocale}`;
  const languages = Object.fromEntries(
    locales.map((item) => [item, `${siteUrl}/${item}`])
  );

  return {
    title: `Coordinate Distance Calculator Online | Map, Globe, GPS & XY`,
    description:
      "Free coordinate distance calculator online with map and globe. Calculate distance between two coordinates on earth (Haversine/Vincenty), midpoint formula, Excel support, Minecraft blocks. GPS & XY.",
    keywords: seoKeywords,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      title: "Coordinate Distance Calculator Online — Map, Globe, GPS & XY",
      description:
        "Calculate distance between two coordinates on earth or flat systems. Compare algorithms, midpoint formula, units. Paste from Google Maps.",
      url: canonicalUrl,
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Coordinate Distance Calculator" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Coordinate Distance Calculator Online",
      description:
        "Calculate distance between two coordinates on earth. Map & globe, Haversine/Vincenty, midpoint, Excel, Minecraft.",
    },
  };
}

export default async function LocalePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const localeData = getLocaleData(locale);
  const { locale: resolvedLocale, dict } = localeData;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a
      }
    }))
  };

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: dict.appName,
    applicationCategory: "UtilityApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Coordinate distance calculator map",
      "Coordinate distance calculator globe",
      "GPS coordinate parser",
      "Midpoint formula calculator",
      "Bearing calculator",
      "Coordinate distance calculator excel support",
    ],
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to calculate distance between two coordinates on earth",
    description:
      "Use this free coordinate distance calculator online: enter two latitude/longitude points, choose Haversine or Vincenty, and get distance, midpoint, and bearing with map or globe visualization.",
    step: [
      { "@type": "HowToStep", name: "Enter Point A", text: "Paste or type the first coordinate (e.g. from Google Maps or decimal lat,lon)." },
      { "@type": "HowToStep", name: "Enter Point B", text: "Enter the second coordinate in the same format." },
      { "@type": "HowToStep", name: "Get results", text: "View distance, midpoint formula result, bearing, and route on the map or globe." },
    ],
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: dict.appName, item: `${siteUrl}/${resolvedLocale}` },
    ],
  };

  return (
    <main className="min-h-screen bg-background">
      <Script
        id="faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Script
        id="app-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <Script
        id="howto-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <Script
        id="breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
        <Suspense
          fallback={
            <header className="flex flex-col gap-4 border-b border-border/60 pb-8 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {dict.appName}
              </h1>
              <div className="h-10 w-[140px] animate-pulse rounded-lg bg-muted" />
            </header>
          }
        >
          <header className="flex flex-col gap-5 border-b border-border/60 pb-8 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {dict.appName}
            </h1>
            <LanguageSwitcher locale={resolvedLocale} label={dict.langLabel} />
          </header>
        </Suspense>

        <nav
          aria-label="On this page"
          className="mb-10 flex flex-wrap gap-1 text-sm text-muted-foreground sm:mb-12"
        >
          <a
            href="#faq"
            className="rounded-full px-3 py-1.5 transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            FAQ
          </a>
          <a
            href="#use-cases"
            className="rounded-full px-3 py-1.5 transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            Use cases
          </a>
          <a
            href="#excel"
            className="rounded-full px-3 py-1.5 transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            Distance in Excel
          </a>
        </nav>

        <div className="space-y-10 sm:space-y-14">
          <Suspense
            fallback={
              <div className="min-h-[420px] animate-pulse rounded-2xl bg-muted/60" />
            }
          >
            <CoordinateTool dict={dict} />
          </Suspense>

          <ShareBar
            shareUrl={`${siteUrl}/${resolvedLocale}`}
            copyLabel={dict.copyLink ?? "Copy link"}
            copiedLabel={dict.copied ?? "Copied"}
          />

          <section id="faq" className="scroll-mt-8">
            <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground mb-5 sm:text-2xl">
              {dict.faqTitle}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {faqItems.map((item) => (
                <Card key={item.q}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">{item.q}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section id="use-cases" className="space-y-4 scroll-mt-8">
            <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Use Cases
            </h2>
            <Card>
              <CardContent className="pt-6 sm:pt-8">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This coordinate distance calculator online helps with GIS workflows, travel planning, drone range checks,
                  logistics routing, and coordinate geometry assignments. In flat mode, it also works as a coordinate
                  distance calculator minecraft users can apply for block path planning.
                </p>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  You can paste GPS coordinate text from Google Maps, compare midpoint formula outputs, and switch units for
                  reporting in meters, feet, miles, or nautical miles. The share link stores your scenario for teams and LLM
                  agents to reproduce calculations.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="excel" className="space-y-4 scroll-mt-8">
            <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              How to calculate distance between two latitude and longitude in Excel
            </h2>
            <Card>
              <CardContent className="pt-6 sm:pt-8">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You can compute distance between two coordinates in Excel using the Haversine formula with{" "}
                  <code className="rounded-md bg-muted/80 px-1.5 py-0.5 text-xs font-medium">
                    RADIANS
                  </code>
                  ,{" "}
                  <code className="rounded-md bg-muted/80 px-1.5 py-0.5 text-xs font-medium">
                    SIN
                  </code>
                  ,{" "}
                  <code className="rounded-md bg-muted/80 px-1.5 py-0.5 text-xs font-medium">
                    COS
                  </code>
                  , and{" "}
                  <code className="rounded-md bg-muted/80 px-1.5 py-0.5 text-xs font-medium">
                    SQRT
                  </code>
                  . For a quick result without formulas, use this{" "}
                  <strong className="font-medium text-foreground">gps coordinate distance calculator</strong>: enter your
                  two lat/lon pairs above, get the distance and midpoint formula result, then copy the values into your
                  spreadsheet. The tool supports meters, feet, miles, and nautical miles for reporting.
                </p>
              </CardContent>
            </Card>
          </section>

          <footer className="border-t border-border/60 pt-8 pb-16">
            <nav aria-label="Other projects" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <a
                href="https://travelovin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                Travelovin
              </a>
              <a
                href="https://sefasdalius.lt"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                Sefasdalius
              </a>
              <a
                href="https://vacayos.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                Vacayos
              </a>
              <a
                href="https://directstayz.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                Directstayz
              </a>
              <a
                href="https://vintage-phone-call.lukasdzenk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                Vintage Phone Call
              </a>
              <a
                href="https://youtube-member-video-transcript.lukasdzenk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                YouTube Member Video Transcript
              </a>
              <a
                href="https://lukasdzenk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                lukasdzenk.com
              </a>
            </nav>
          </footer>
        </div>
      </div>
    </main>
  );
}
