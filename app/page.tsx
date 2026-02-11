import { redirect } from "next/navigation";
import { defaultLocale } from "@/lib/locales";

export default function HomeRedirect() {
  redirect(`/${defaultLocale}`);
}
