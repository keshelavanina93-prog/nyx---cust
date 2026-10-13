import { describe, it, expect } from "vitest";
import { runCalculation, type CalcInput } from "@/lib/customs/calculate";
import { rows as feeRows } from "./fees.test";
import { rules as penaltyRules } from "./penalty.test";
import type { WorkingHoursRow } from "@/lib/customs/working-hours";

const wh: WorkingHoursRow[] = [];
for (let d = 0; d <= 6; d++) wh.push({ officeCode: null, weekday: d, opensAt: d === 0 ? null : "10:00", closesAt: d === 0 ? null : "18:00" });

function input(over: Partial<CalcInput> = {}): CalcInput {
  return {
    incoterm: "FOB",
    mode: "pre_arrival_self",
    lines: [
      {
        id: "l1", lineNo: 1, lineTotal: "2600.00", currency: "USD", netWeightKg: "320", quantity: "400", description: "table linen", originCountry: "TR", hsCode: "6302510000",
        tariff: { hsCode: "6302510000", dutyRate: "12", vatExempt: false },
        candidateTariffs: [{ hsCode: "6302510000", dutyRate: "12", vatExempt: false }, { hsCode: "6302600000", dutyRate: "12", vatExempt: false }, { hsCode: "5208520000", dutyRate: "0", vatExempt: false }],
      },
      {
        id: "l2", lineNo: 2, lineTotal: "1920.00", currency: "USD", netWeightKg: "900", quantity: "600", description: "PVC floor", originCountry: "TR", hsCode: "3918100000",
        tariff: { hsCode: "3918100000", dutyRate: "0", vatExempt: false },
        candidateTariffs: [{ hsCode: "3918100000", dutyRate: "0", vatExempt: false }, { hsCode: "3926909000", dutyRate: "0", vatExempt: false }, { hsCode: "4418100000", dutyRate: "12", vatExempt: false }],
      },
    ],
    freightAmount: "500.00", freightCurrency: "USD", insuranceAmount: null, insuranceCurrency: null, otherCosts: [], allocationBasis: "value",
    fxRates: [{ currency: "USD", date: "2026-10-13", rateGel: "2.700000", quantity: 1, source: "nbg" }],
    fxDate: "2026-10-13",
    feeRows, workingHours: wh, holidays: [], officeCode: "11111",
    lodgedAt: new Date("2026-10-14T08:00:00Z"), // 12:00 Tbilisi (Wed)
    penaltyRules, isNaturalPerson: false, isRepeatOffence: false,
    priceReferences: [], today: new Date("2026-10-13T00:00:00Z"),
    vatRate: "18", vatIncludesExcise: true, rounding: "half_up", brokerCostPerHsGel: "100.00",
    ...over,
  };
}

describe("runCalculation", () => {
  it("end-to-end totals", () => {
    const r = runCalculation(input());
    // invoice 4520 USD → 12204 ₾; freight 500 USD → 1350 ₾; CV = 13554
    expect(r.customsValueGel).toBe("13554.00");
    const l1 = r.lines[0]!;
    // l1: 7020 + 1350×(7020/12204)=776.55 → CV 7796.55; duty 12% = 935.59; VAT 18% × 8732.15 = 1571.79
    expect(l1.customs_value_gel).toBe("7796.55");
    expect(l1.duty_gel).toBe("935.59");
    expect(l1.vat_gel).toBe("1571.79");
    const l2 = r.lines[1]!;
    expect(l2.customs_value_gel).toBe("5757.45");
    expect(l2.duty_gel).toBe("0.00");
    expect(l2.vat_gel).toBe("1036.34");
    expect(r.dutyTotal).toBe("935.59");
    expect(r.vatTotal).toBe("2608.13");
    expect(r.feeGel).toBe("150.00"); // 3000–15000 tier, pre_arrival_self
    expect(r.feeOffHours).toBe(false);
    expect(r.totalPayableGel).toBe("3693.72");
    expect(r.brokerCostComparisonGel).toBe("200.00"); // 2 unique HS × 100
    expect(r.fxRate).toBe("2.700000");
    expect(r.fxCurrency).toBe("USD");
  });
  it("penalty exposure uses highest-burden alternative", () => {
    const r = runCalculation(input());
    // l1 alternatives have same or lower burden → 0; l2 alternative 4418 at 12% → shortfall = duty 690.89 + extra VAT 124.36 = 815.25
    expect(r.lines[0]!.penalty_exposure_gel).toBe("0.00");
    expect(r.lines[1]!.penalty_exposure_gel).toBe("815.25");
    expect(r.penaltyExposureTotalGel).toBe("815.25");
  });
  it("fee doubles for RS post-arrival off-hours but not for self pre-arrival", () => {
    const r = runCalculation(input({ lodgedAt: new Date("2026-10-14T16:00:00Z") })); // 20:00 Tbilisi
    expect(r.feeGel).toBe("150.00");
    const rs = r.feeAlternatives.find((a) => a.mode === "post_arrival_rs_staff")!;
    expect(rs.fee_gel).toBe("800.00");
    expect(rs.off_hours_applied).toBe(true);
  });
  it("FX date change changes the result (rate of registration day)", () => {
    const a = runCalculation(input());
    const b = runCalculation(input({ fxDate: "2026-10-20", fxRates: [{ currency: "USD", date: "2026-10-20", rateGel: "2.800000", quantity: 1, source: "nbg" }] }));
    expect(a.customsValueGel).not.toBe(b.customsValueGel);
    expect(b.fxDate).toBe("2026-10-20");
  });
  it("value risk high triggers level", () => {
    const refs = [10, 30, 60].map((d) => ({ hsCode: "6302510000", originCountry: "TR", unitBasis: "per_kg" as const, unitPriceGel: "45.0000", observedAt: new Date(Date.UTC(2026, 9, 13 - d)).toISOString().slice(0, 10) }));
    const r = runCalculation(input({ priceReferences: refs }));
    expect(r.lines[0]!.value_risk.level).toBe("high"); // 7796.56/320 = 24.4 vs 45 → −46%
    expect(r.valueRiskLevel).toBe("high");
  });
});
