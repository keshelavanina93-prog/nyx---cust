import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const LOCALES = ["ka", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ka";

export default getRequestConfig(async () => {
  let locale: Locale = DEFAULT_LOCALE;
  try {
    const c = (await cookies()).get("locale")?.value;
    if (c && (LOCALES as readonly string[]).includes(c)) locale = c as Locale;
  } catch {
    /* no request scope */
  }
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages, timeZone: "Asia/Tbilisi" };
});
