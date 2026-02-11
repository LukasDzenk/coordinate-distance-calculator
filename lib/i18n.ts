import { defaultLocale, Locale } from "@/lib/locales";
import { dictionaries, DictionaryShape } from "@/messages/dictionaries";

export type Dictionary = DictionaryShape;

export function getDictionary(locale: Locale): Dictionary {
  const base = dictionaries[defaultLocale] ?? dictionaries.en;
  return { ...base, ...dictionaries[locale] } as Dictionary;
}

export function t(dict: Dictionary, key: string): string {
  const typedKey = key as keyof Dictionary;
  return dict[typedKey] ?? dictionaries.en[typedKey] ?? key;
}
