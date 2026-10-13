import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

export const APP_TZ = "Asia/Tbilisi";

/** DD.MM.YYYY [ASSUMPTION format] in Asia/Tbilisi */
export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? (d.length === 10 ? new Date(d + "T00:00:00Z") : new Date(d)) : d;
  if (typeof d === "string" && d.length === 10) return format(date, "dd.MM.yyyy");
  return format(new TZDate(date, APP_TZ), "dd.MM.yyyy");
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return format(new TZDate(typeof d === "string" ? new Date(d) : d, APP_TZ), "dd.MM.yyyy HH:mm");
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86_400_000);
}
