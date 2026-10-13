import { describe, it, expect } from "vitest";
import { computeFee, computeAllFees, defaultMode, preArrivalWindowCheck, FEE_MODES, type FeeScheduleRow, type FeeMode } from "@/lib/customs/fees";

const TIERS: [string, string | null][] = [
  ["0.00", "3000.00"],
  ["3000.01", "15000.00"],
  ["15000.01", null],
];
const TABLE: Record<FeeMode, { fees: [string, string, string]; doubles: boolean }> = {
  pre_arrival_self: { fees: ["50.00", "150.00", "200.00"], doubles: false },
  pre_arrival_rs_staff_electronic: { fees: ["100.00", "300.00", "400.00"], doubles: false },
  pre_arrival_rs_staff_paper: { fees: ["100.00", "300.00", "400.00"], doubles: true },
  post_arrival_self: { fees: ["100.00", "300.00", "400.00"], doubles: false },
  post_arrival_rs_staff: { fees: ["100.00", "400.00", "500.00"], doubles: true },
};
export const rows: FeeScheduleRow[] = FEE_MODES.flatMap((mode) =>
  TIERS.map(([min, max], i) => ({ mode, valueMin: min, valueMax: max, feeGel: TABLE[mode].fees[i]!, doublesOffHours: TABLE[mode].doubles, legalRef: "test", needsReverification: true, effectiveFrom: "2022-05-14" })),
);

describe("fees — tiers (№96)", () => {
  const cases: [string, number][] = [
    ["2999.99", 0],
    ["3000.00", 0],
    ["3000.01", 1],
    ["15000.00", 1],
    ["15000.01", 2],
    ["0.00", 0],
    ["250000.00", 2],
  ];
  for (const mode of FEE_MODES) {
    for (const [value, tier] of cases) {
      it(`${mode} @ ${value} → tier ${tier}`, () => {
        const f = computeFee(rows, mode, value, false);
        expect(f.fee_gel).toBe(TABLE[mode].fees[tier]);
        expect(f.off_hours_applied).toBe(false);
      });
    }
  }
});

describe("fees — off-hours doubling", () => {
  it("doubles only doubles_off_hours modes", () => {
    const all = computeAllFees(rows, "5000.00", true);
    const byMode = Object.fromEntries(all.map((a) => [a.mode, a]));
    expect(byMode.pre_arrival_self!.fee_gel).toBe("150.00");
    expect(byMode.pre_arrival_self!.off_hours_applied).toBe(false);
    expect(byMode.pre_arrival_rs_staff_electronic!.fee_gel).toBe("300.00");
    expect(byMode.pre_arrival_rs_staff_paper!.fee_gel).toBe("600.00");
    expect(byMode.post_arrival_self!.fee_gel).toBe("300.00");
    expect(byMode.post_arrival_rs_staff!.fee_gel).toBe("800.00");
    expect(byMode.post_arrival_rs_staff!.off_hours_applied).toBe(true);
  });
  it("pre_arrival_self never doubles", () => {
    for (const v of ["100", "3000", "20000"]) expect(computeFee(rows, "pre_arrival_self", v, true).off_hours_applied).toBe(false);
  });
});

describe("fees — defaults & 45-day window", () => {
  it("default mode", () => {
    expect(defaultMode(false)).toBe("pre_arrival_self");
    expect(defaultMode(true)).toBe("post_arrival_self");
  });
  it("pre-arrival window ≤45 days", () => {
    const today = new Date("2026-10-13T12:00:00Z");
    expect(preArrivalWindowCheck("2026-11-27", today).ok).toBe(true); // 45 days
    expect(preArrivalWindowCheck("2026-11-28", today)).toMatchObject({ ok: false, reason: "too_early" });
    expect(preArrivalWindowCheck("2026-10-01", today)).toMatchObject({ ok: false, reason: "already_arrived" });
    expect(preArrivalWindowCheck(null, today).ok).toBe(true);
  });
});
