import { describe, it, expect } from "vitest";
import type Decimal from "decimal.js";
import { computeCustomsValue } from "@/lib/customs/value";
import { INCOTERMS } from "@/lib/customs/incoterms";
import { makeFxConverter } from "@/lib/customs/fx";

const fx = makeFxConverter([{ currency: "USD", date: "2026-10-13", rateGel: "2.700000", quantity: 1, source: "nbg" }, { currency: "EUR", date: "2026-10-13", rateGel: "3.000000", quantity: 1, source: "nbg" }]);
const conv = (a: Decimal.Value, c: string) => fx.convert(a, c);

const lines = [
  { id: "a", lineNo: 1, lineTotal: "1000.00", currency: "USD", netWeightKg: "100", quantity: "10" },
  { id: "b", lineNo: 2, lineTotal: "3000.00", currency: "USD", netWeightKg: "300", quantity: "30" },
];

describe("customs value — incoterms", () => {
  const base = { lines, freightAmount: "200.00", freightCurrency: "USD", insuranceAmount: "50.00", insuranceCurrency: "EUR" };
  const expected: Record<string, string> = {
    EXW: "11490.00", FCA: "11490.00", FAS: "11490.00", FOB: "11490.00", // 10800 + 540 + 150
    CFR: "10950.00", CPT: "10950.00", // 10800 + 150
    CIF: "10800.00", CIP: "10800.00", DAP: "10800.00", DPU: "10800.00", DDP: "10800.00",
  };
  for (const inc of INCOTERMS) {
    it(`${inc}`, () => {
      const r = computeCustomsValue({ ...base, incoterm: inc }, conv);
      expect(r.customsValueGel.toFixed(2)).toBe(expected[inc]);
      expect(r.incotermApplied).toBe(inc);
    });
  }
  it("unknown incoterm treated as EXW and flagged", () => {
    const r = computeCustomsValue({ ...base, incoterm: "XYZ" }, conv);
    expect(r.customsValueGel.toFixed(2)).toBe("11490.00");
    expect(r.assumptions).toContain("incoterm:EXW:unverified");
  });
});

describe("customs value — allocation", () => {
  it("allocates freight by value with exact remainder", () => {
    const r = computeCustomsValue({ incoterm: "FOB", lines, freightAmount: "100.01", freightCurrency: "GEL" }, conv);
    const sum = r.lines.reduce((a, l) => a.plus(l.freightAllocGel), r.lines[0]!.freightAllocGel.minus(r.lines[0]!.freightAllocGel));
    expect(sum.toFixed(2)).toBe("100.01");
    expect(r.lines[0]!.freightAllocGel.toFixed(2)).toBe("25.00");
    expect(r.lines[1]!.freightAllocGel.toFixed(2)).toBe("75.01");
  });
  it("allocates by weight when requested", () => {
    const r = computeCustomsValue({ incoterm: "FOB", lines, freightAmount: "400.00", freightCurrency: "GEL", allocationBasis: "weight" }, conv);
    expect(r.lines[0]!.freightAllocGel.toFixed(2)).toBe("100.00");
    expect(r.lines[1]!.freightAllocGel.toFixed(2)).toBe("300.00");
  });
  it("DAP post-border deduction reduces value and is flagged", () => {
    const r = computeCustomsValue({ incoterm: "DAP", lines, postBorderDeduction: "100.00", postBorderDeductionCurrency: "GEL" }, conv);
    expect(r.customsValueGel.toFixed(2)).toBe("10700.00");
    expect(r.assumptions).toContain("post_border_deduction:unverified");
  });
  it("throws when fx rate missing", () => {
    expect(() => computeCustomsValue({ incoterm: "CIF", lines: [{ ...lines[0]!, currency: "TRY" }] }, conv)).toThrow(/FX rate missing/);
  });
});
