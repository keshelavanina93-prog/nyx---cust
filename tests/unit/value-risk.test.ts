import { describe, it, expect } from "vitest";
import { assessValueRisk, maxRiskLevel, type PriceReferenceRow } from "@/lib/customs/value-risk";

const today = new Date("2026-10-13T00:00:00Z");
const ref = (price: string, daysAgo: number, origin = "TR"): PriceReferenceRow => ({
  hsCode: "6302510000",
  originCountry: origin,
  unitBasis: "per_kg",
  unitPriceGel: price,
  observedAt: new Date(today.getTime() - daysAgo * 86_400_000).toISOString().slice(0, 10),
});

describe("value risk (90-day own history)", () => {
  const history = [ref("13.00", 10), ref("12.50", 30), ref("13.50", 60), ref("12.80", 80)];
  it("40% below median → high", () => {
    // median ≈ 12.90 ₾/kg; declared 866 kg at 6988 ₾ ≈ 8.07 ₾/kg (−37%) → medium; make it −45%
    const r = assessValueRisk({ hsCode: "6302510000", originCountry: "TR", customsValueGel: "6144.00", quantity: "500", netWeightKg: "866" }, history, today);
    expect(r.level).toBe("high");
    expect(r.n).toBe(4);
    expect(r.basis).toBe("per_kg");
  });
  it("20–40% below → medium", () => {
    const r = assessValueRisk({ hsCode: "6302510000", originCountry: "TR", customsValueGel: "8500.00", quantity: "500", netWeightKg: "866" }, history, today);
    expect(r.level).toBe("medium");
  });
  it("in range → none", () => {
    const r = assessValueRisk({ hsCode: "6302510000", originCountry: "TR", customsValueGel: "11348.00", quantity: "500", netWeightKg: "866" }, history, today);
    expect(r.level).toBe("none");
  });
  it("n < 3 → insufficient_data", () => {
    const r = assessValueRisk({ hsCode: "6302510000", originCountry: "TR", customsValueGel: "100", quantity: "1", netWeightKg: "10" }, history.slice(0, 2), today);
    expect(r.level).toBe("insufficient_data");
    expect(r.n).toBe(2);
  });
  it("ignores references older than 90 days", () => {
    const old = [ref("13.00", 91), ref("13.00", 120), ref("13.00", 200), ref("13.00", 10)];
    const r = assessValueRisk({ hsCode: "6302510000", originCountry: "TR", customsValueGel: "100", quantity: "1", netWeightKg: "10" }, old, today);
    expect(r.n).toBe(1);
    expect(r.level).toBe("insufficient_data");
  });
  it("ignores other HS codes", () => {
    const other = history.map((h) => ({ ...h, hsCode: "9999999999" }));
    expect(assessValueRisk({ hsCode: "6302510000", originCountry: "TR", customsValueGel: "100", quantity: "1", netWeightKg: "10" }, other, today).n).toBe(0);
  });
  it("maxRiskLevel", () => {
    expect(maxRiskLevel(["none", "insufficient_data", "medium", "low"])).toBe("medium");
    expect(maxRiskLevel([])).toBe("none");
  });
});
