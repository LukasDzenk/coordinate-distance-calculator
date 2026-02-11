"use client";

import { languageNames, Locale, locales } from "@/lib/locales";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface LanguageSwitcherProps {
  locale: Locale;
  label: string;
}

export function LanguageSwitcher({ locale, label }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onLocaleChange = (nextLocale: Locale) => {
    const parts = pathname.split("/");
    if (parts.length > 1) {
      parts[1] = nextLocale;
    }
    const query = searchParams.toString();
    const target = `${parts.join("/")}${query ? `?${query}` : ""}` as Route;
    router.push(target);
  };

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">{label}</Label>
      <Select value={locale} onValueChange={(v) => onLocaleChange(v as Locale)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {locales.map((code) => (
            <SelectItem key={code} value={code}>
              {languageNames[code]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
