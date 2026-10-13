import { describe, it, expect } from "vitest";
import { isOffHours, type WorkingHoursRow } from "@/lib/customs/working-hours";

const rows: WorkingHoursRow[] = [];
for (let d = 0; d <= 6; d++) {
  const closed = d === 0;
  rows.push({ officeCode: null, weekday: d, opensAt: closed ? null : "10:00", closesAt: closed ? null : "18:00" });
  rows.push({ officeCode: "11113", weekday: d, opensAt: closed ? null : "10:00", closesAt: closed ? null : "21:00" });
}
const holidays = [{ date: "2026-05-26" }];
// Tbilisi is UTC+4 all year.
const tbilisi = (iso: string) => new Date(iso.replace("Z", "+04:00"));

describe("off-hours (Decree №96)", () => {
  it("Friday 17:59 working, 18:00/18:01 off", () => {
    expect(isOffHours(tbilisi("2026-10-16T17:59:00Z"), null, rows, holidays).offHours).toBe(false);
    expect(isOffHours(tbilisi("2026-10-16T18:00:00Z"), null, rows, holidays).offHours).toBe(true);
    expect(isOffHours(tbilisi("2026-10-16T18:01:00Z"), null, rows, holidays).offHours).toBe(true);
  });
  it("Monday 09:59 off, 10:00 working", () => {
    expect(isOffHours(tbilisi("2026-10-19T09:59:00Z"), null, rows, holidays).offHours).toBe(true);
    expect(isOffHours(tbilisi("2026-10-19T10:00:00Z"), null, rows, holidays).offHours).toBe(false);
  });
  it("Saturday daytime working, Saturday 18:00+ off, Sunday off", () => {
    expect(isOffHours(tbilisi("2026-10-17T12:00:00Z"), null, rows, holidays).offHours).toBe(false);
    expect(isOffHours(tbilisi("2026-10-17T18:30:00Z"), null, rows, holidays).offHours).toBe(true);
    expect(isOffHours(tbilisi("2026-10-18T12:00:00Z"), null, rows, holidays)).toMatchObject({ offHours: true, reason: "closed_day" });
  });
  it("holiday off", () => {
    expect(isOffHours(tbilisi("2026-05-26T12:00:00Z"), null, rows, holidays)).toMatchObject({ offHours: true, reason: "holiday" });
  });
  it("Poti 20:59 working, 21:01 off", () => {
    expect(isOffHours(tbilisi("2026-10-14T20:59:00Z"), "11113", rows, holidays).offHours).toBe(false);
    expect(isOffHours(tbilisi("2026-10-14T21:01:00Z"), "11113", rows, holidays).offHours).toBe(true);
    expect(isOffHours(tbilisi("2026-10-14T20:59:00Z"), "11111", rows, holidays).offHours).toBe(true);
  });
  it("uses Tbilisi timezone, not UTC", () => {
    // 07:00 UTC = 11:00 Tbilisi → working
    expect(isOffHours(new Date("2026-10-14T07:00:00Z"), null, rows, holidays).offHours).toBe(false);
    // 15:00 UTC = 19:00 Tbilisi → off
    expect(isOffHours(new Date("2026-10-14T15:00:00Z"), null, rows, holidays).offHours).toBe(true);
  });
});
