import { describe, it, expect } from "vitest";
import { penaltyExposure, selectPenaltyRule, type PenaltyRuleRow } from "@/lib/customs/penalty";

export const rules: PenaltyRuleRow[] = [
  { rule: "underpaid_first", percent: "100.00", thresholdGel: null },
  { rule: "underpaid_repeat", percent: "200.00", thresholdGel: null },
  { rule: "natural_person_small_first", percent: "40.00", thresholdGel: "3000.00" },
  { rule: "natural_person_small_repeat", percent: "100.00", thresholdGel: "3000.00" },
];

describe("penalty (art.167)", () => {
  it("selects rule", () => {
    expect(selectPenaltyRule(rules, { isNaturalPerson: false, isRepeat: false, customsValueGel: "100" }).percent).toBe("100.00");
    expect(selectPenaltyRule(rules, { isNaturalPerson: false, isRepeat: true, customsValueGel: "100" }).percent).toBe("200.00");
    expect(selectPenaltyRule(rules, { isNaturalPerson: true, isRepeat: false, customsValueGel: "2999" }).percent).toBe("40.00");
    expect(selectPenaltyRule(rules, { isNaturalPerson: true, isRepeat: true, customsValueGel: "2999" }).percent).toBe("100.00");
    expect(selectPenaltyRule(rules, { isNaturalPerson: true, isRepeat: false, customsValueGel: "3001" }).percent).toBe("100.00");
  });
  it("exposure = shortfall × percent", () => {
    const r = penaltyExposure("100.00", ["150.00", "90.00"], rules[0]!);
    expect(r.shortfallGel.toFixed(2)).toBe("50.00");
    expect(r.exposureGel.toFixed(2)).toBe("50.00");
    expect(penaltyExposure("100.00", ["150.00"], rules[1]!).exposureGel.toFixed(2)).toBe("100.00");
    expect(penaltyExposure("100.00", ["150.00"], rules[2]!).exposureGel.toFixed(2)).toBe("20.00");
  });
  it("zero when selected is the highest burden", () => {
    expect(penaltyExposure("200.00", ["150.00", "90.00"], rules[0]!).exposureGel.toFixed(2)).toBe("0.00");
    expect(penaltyExposure("200.00", [], rules[0]!).exposureGel.toFixed(2)).toBe("0.00");
  });
});
