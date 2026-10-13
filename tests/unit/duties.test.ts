import { describe, it, expect } from "vitest";
import { computeLineDuties } from "@/lib/customs/duties";
import { D } from "@/lib/money";

const cfg = { vatRate: "18", vatIncludesExcise: true };

describe("duties", () => {
  it("ad valorem 12% + VAT 18% on CV+duty", () => {
    const r = computeLineDuties({ id: "x", customsValueGel: D("1000.00"), quantity: "10", tariff: { hsCode: "6302510000", dutyRate: "12", vatExempt: false } }, cfg);
    expect(r.dutyGel.toFixed(2)).toBe("120.00");
    expect(r.vatBaseGel.toFixed(2)).toBe("1120.00");
    expect(r.vatGel.toFixed(2)).toBe("201.60");
    expect(r.totalGel.toFixed(2)).toBe("321.60");
  });
  it("0% duty", () => {
    const r = computeLineDuties({ id: "x", customsValueGel: D("1000.00"), quantity: "1", tariff: { hsCode: "8471300000", dutyRate: "0", vatExempt: false } }, cfg);
    expect(r.dutyGel.toFixed(2)).toBe("0.00");
    expect(r.vatGel.toFixed(2)).toBe("180.00");
  });
  it("5% duty", () => {
    const r = computeLineDuties({ id: "x", customsValueGel: D("200.00"), quantity: "1", tariff: { hsCode: "x", dutyRate: "5", vatExempt: false } }, cfg);
    expect(r.dutyGel.toFixed(2)).toBe("10.00");
    expect(r.vatGel.toFixed(2)).toBe("37.80");
  });
  it("VAT exempt", () => {
    const r = computeLineDuties({ id: "x", customsValueGel: D("1000.00"), quantity: "1", tariff: { hsCode: "3004900000", dutyRate: "0", vatExempt: true } }, cfg);
    expect(r.vatGel.toFixed(2)).toBe("0.00");
  });
  it("specific excise per litre, included in VAT base when flag true", () => {
    const r = computeLineDuties({ id: "x", customsValueGel: D("1000.00"), quantity: "100", tariff: { hsCode: "2204210000", dutyRate: "12", exciseSpecific: { amount_gel: "2.00", per: "litre" }, vatExempt: false } }, cfg);
    expect(r.exciseGel.toFixed(2)).toBe("200.00");
    expect(r.vatBaseGel.toFixed(2)).toBe("1320.00");
    const r2 = computeLineDuties({ id: "x", customsValueGel: D("1000.00"), quantity: "100", tariff: { hsCode: "2204210000", dutyRate: "12", exciseSpecific: { amount_gel: "2.00", per: "litre" }, vatExempt: false } }, { ...cfg, vatIncludesExcise: false });
    expect(r2.vatBaseGel.toFixed(2)).toBe("1120.00");
  });
  it("specific duty per kg vs ad valorem → max", () => {
    const r = computeLineDuties({ id: "x", customsValueGel: D("100.00"), quantity: "1", netWeightKg: "50", tariff: { hsCode: "x", dutyRate: "5", dutySpecific: { amount_gel: "1.00", per: "kg" }, vatExempt: false } }, cfg);
    expect(r.dutyGel.toFixed(2)).toBe("50.00");
  });
  it("rounding half_up vs half_even", () => {
    const line = { id: "x", customsValueGel: D("1.25"), quantity: "1", tariff: { hsCode: "x", dutyRate: "10", vatExempt: true } };
    expect(computeLineDuties(line, { ...cfg, rounding: "half_up" }).dutyGel.toFixed(2)).toBe("0.13");
    expect(computeLineDuties(line, { ...cfg, rounding: "half_even" }).dutyGel.toFixed(2)).toBe("0.12");
  });
});
