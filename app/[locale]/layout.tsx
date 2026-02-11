import { Locale, isLocale, locales } from "@/lib/locales";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return <div dir={(locale as Locale) === "ar" ? "rtl" : "ltr"}>{children}</div>;
}
