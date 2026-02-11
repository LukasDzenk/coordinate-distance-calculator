export const locales = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "nl",
  "pl",
  "tr",
  "ru",
  "ar",
  "hi",
  "zh",
  "ja",
  "ko",
  "id",
  "vi",
  "th",
  "uk",
  "cs"
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const languageNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  pl: "Polski",
  tr: "Türkçe",
  ru: "Русский",
  ar: "العربية",
  hi: "हिन्दी",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  id: "Bahasa Indonesia",
  vi: "Tiếng Việt",
  th: "ไทย",
  uk: "Українська",
  cs: "Čeština"
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
