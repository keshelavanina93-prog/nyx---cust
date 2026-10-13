/**
 * Off-hours detection for fee doubling [VERIFIED, Government Decree №96]:
 * Mon–Fri 18:00–10:00, Saturday 18:00 → Monday 10:00, public holidays; Poti from 21:00 (office override).
 * Data comes from `working_hours` + `holidays` tables (seeded), timezone Asia/Tbilisi.
 */
import { TZDate } from "@date-fns/tz";

export type WorkingHoursRow = { officeCode: string | null; weekday: number; opensAt: string | null; closesAt: string | null };
export type HolidayRow = { date: string };

export const DEFAULT_TZ = "Asia/Tbilisi";

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function isOffHours(
  at: Date,
  officeCode: string | null | undefined,
  rows: WorkingHoursRow[],
  holidays: HolidayRow[],
  tz: string = DEFAULT_TZ,
): { offHours: boolean; reason: string } {
  const local = new TZDate(at, tz);
  const weekday = local.getDay();
  const isoDate = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
  if (holidays.some((h) => h.date === isoDate)) return { offHours: true, reason: "holiday" };

  const office = officeCode ? rows.find((r) => r.officeCode === officeCode && r.weekday === weekday) : undefined;
  const row = office ?? rows.find((r) => r.officeCode === null && r.weekday === weekday);
  if (!row) return { offHours: true, reason: "no_working_hours_row" };
  if (!row.opensAt || !row.closesAt) return { offHours: true, reason: "closed_day" };

  const now = local.getHours() * 60 + local.getMinutes();
  if (now < minutes(row.opensAt)) return { offHours: true, reason: "before_opening" };
  if (now >= minutes(row.closesAt)) return { offHours: true, reason: "after_closing" };
  return { offHours: false, reason: "working_hours" };
}
